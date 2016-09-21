// Import Soundworks library (client side)
import * as soundworks from 'soundworks/client';

// Import beacon service
import Beacon from '../../shared/client/services/Beacon';

// Import local classes
import AudioPlayer from './AudioPlayer';
import AudioAnalyser from './AudioAnalyser';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

// Define DOM elements
const viewTemplate = `
  <canvas class="background"></canvas>
  <div class="foreground <%= classname %>">
    <div class="section-top flex-middle">
      <p class="medium">ProXoMix</p>
    </div>

    <div class="section-center flex-middle">
      <p class="huge" id="logValues">
        <%= major %>.<%= minor %>
      </p>
    </div>

    <div class="section-bottom flex-middle">
      <p class="small soft-blink"><%= instructions %></p>
    </div>
  </div>
`;

/**
 * `player` experience.
 * This experience plays a sound, different for each user. One can also hear the
 * sounds corresponding to nearby players, getting louder as they come closer
 */
export default class PlayerExperience extends soundworks.Experience {
  /**
   * Constructor
   */
  constructor(standalone, assetsDomain, beaconUUID, audioFiles) {
    super(!standalone);

    // local attributes
    this.audioFiles = audioFiles;

    // configure required services
    this.loader = this.require('loader', { files: audioFiles });
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.checkin = this.require('checkin');
    this.sync = this.require('sync');
    this.scheduler = this.require('scheduler');
    this.motionInput = this.require('motion-input', { descriptors: ['accelerationIncludingGravity']});

    if (window.cordova) {
      // beacon only work in cordova mode since it needs access right to BLE
      this.beacon = this.require('beacon', { uuid: beaconUUID });
    }

    // bind local functions
    this.beaconCallback = this.beaconCallback.bind(this);
    this.onSoundEffect1Bundle = this.onSoundEffect1Bundle.bind(this);
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { 
      classname: `minor-${(client.index % 4)}`,
      instructions: `ON THE AIR`,
      major: Math.floor(client.index / 4) + 1,
      minor: (client.index % 4) + 1, 
    };

    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { 
      preservePixelRatio: true, 
      ratios: {
        '.section-top': 0.2,
        '.section-center': 0.6,
        '.section-bottom': 0.2,
      }
    };
    this.view = this.createView();

    // local attributes
    this.audioAnalyser = new AudioAnalyser();
    this.audioPlayer = new AudioPlayer(this.sync, this.scheduler, this.loader.buffers, {
      quantization: 2.4,
    });

    this.audioPlayer.connect(this.audioAnalyser.input);

    this.lastEffect1Value = -Infinity;

    // init beacon callback
    if (this.beacon) {
      // add callback, invoked whenever beacon scan is executed
      this.beacon.addListener(this.beaconCallback);
      // in dB (see beacon service for detail)
      this.beacon.txPower = -55;
    }
  }

  /**
   * Runs when experience starts (after clicking on welcome screen once connected)
   */
  start() {
    // soundworks specific calls
    super.start();
    if (!this.hasStarted) { this.init(); }
    this.show();

    // Setup listeners for player connections / disconnections
    this.receive('soundEffect1Bundle', this.onSoundEffect1Bundle);

    // // DEBUG
    // this.beacon = {major:0, minor: 0};
    // this.beacon.restartAdvertising = function(){};
    // this.beacon.rssiToDist = function(){return 3 + 1*Math.random()};    
    // window.setInterval(() => {
    //   var pluginResult = { beacons : [] };
    //   for (let i = 0; i < 4; i++) {
    //     var beacon = {
    //       major: 0,
    //       minor: i,
    //       rssi: -45 - i * 5,
    //       proximity : 'hi',
    //     };
    //     pluginResult.beacons.push(beacon);
    //   }
    //   this.beaconCallback(pluginResult);
    // }, 1000);

    if (this.beacon) {
      const major = 0;
      const minor = client.index;

      // change local beacon info
      this.beacon.major = major;
      this.beacon.minor = minor;
      this.beacon.restartAdvertising();

      // start local sound
      this.audioPlayer.startLocalTrack(client.index);
    }

    // setup motion input listeners
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {
        // get acceleration data
        const accX = data[0];
        const accY = data[1];
        const accZ = data[2];

        // calculate pitch and roll
        const pitch = 2 * Math.atan2(accY, Math.sqrt(accZ * accZ + accX * accX)) / Math.PI;
        const roll = -2 * Math.atan2(accX, Math.sqrt(accY * accY + accZ * accZ)) / Math.PI;

        //const effect1Val = 1 - Math.min(0.8, Math.max(0, pitch)) / 0.8;
        const effect1Val = 0.5 + Math.max(-0.8, Math.min(0.8, (accZ / 9.81))) / 1.6;

        if(Math.abs(effect1Val - this.lastEffect1Value) > 0.1) {
          this.lastEffect1Value = effect1Val;

          // update local audio
          this.audioPlayer.setEffect1Value('local', effect1Val);

          // update server (hence neighbors)
          this.send('soundEffect1Value', effect1Val);
        }
      });
    }
  }

  onSoundEffect1Bundle(deviceId, value) {
    this.audioPlayer.setEffect1Value(deviceId, msg.value);
  }

  beaconCallback(pluginResult) {
    pluginResult.beacons.forEach((beacon) => {
      if (beacon.minor < this.loader.buffers.length)
        this.audioPlayer.updateTrack(beacon.minor, this.beacon.rssiToDist(beacon.rssi));
    });
  }
}
