// Import Soundworks library (client side)
import * as soundworks from 'soundworks/client';

// Import beacon service
import Beacon from '../../shared/client/services/Beacon';

// Import local classes
import AudioPlayer from './AudioPlayer';
import PlayerRenderer from './PlayerRenderer';

// Define audio context
const audioContext = soundworks.audioContext;

// Define DOM elements
const viewTemplate = `
  <canvas class="background"></canvas>
  <div class="foreground">
    <div class="section-center flex-middle">
    <p class="small" id="logValues"></p>
    </div>

    <div class="section-top flex-middle">
    <p class="small" id="localInfo"></p>
    </div>

    <div class="section-bottom flex-center">
      <p class="small soft-blink"><%= title %></p>
    </div>
    <hr>
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
    const audioFilesName = audioFiles.map((a) => { return a.fileName; });
    this.loader = this.require('loader', { files: audioFilesName });
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.sync = this.require('sync');
    if (window.cordova) {
      // beacon only work in cordova mode since it needs access right to BLE
      this.beacon = this.require('beacon', { uuid: beaconUUID });
    }

    // bind local functions
    this.beaconCallback = this.beaconCallback.bind(this);
    this.onPlayerBeacon = this.onPlayerBeacon.bind(this);
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { title: `- instrument detection activated -` };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();

    // local attributes
    const audioFilesGains = this.audioFiles.map((a) => { return a.gain; });
    this.localAudioPlayer = new AudioPlayer(this.sync, this.loader.buffers, audioFilesGains);

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
    this.receive('player:beacon', this.onPlayerBeacon);

    // // DEBUG
    // this.beacon = {major:0, minor: 0};
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
      // initialize rendering (change background color based on beacon id)
      this.renderer = new PlayerRenderer();
      this.view.addRenderer(this.renderer);
      this.renderer.setBkgColor(this.beacon.minor);
      window.addEventListener('orientationchange', () => {
        this.renderer.setBkgColor(this.beacon.minor);
      });
    }


  }

  /**
   * Function called when client enters experience
   * (triggered by incoming server message 'player:beacon')
   * @param {Object} beaconInfo (object holding client beacon parameters to be)
   */
  onPlayerBeacon(beaconInfo) {
    console.log(beaconInfo, this.beacon);
    if (this.beacon) {
      // change local beacon info
      this.beacon.major = beaconInfo.major;
      this.beacon.minor = beaconInfo.minor;
      this.beacon.restartAdvertising();
      // add local beacon info on screen
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
      // start local sound
      this.localAudioPlayer.setLocalTrack(this.beacon.minor);
    }
  }

  beaconCallback(pluginResult) {
    // get beacon list
    var log = '';
    pluginResult.beacons.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB ~ dist: ' +
             Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';

      if (beacon.minor < this.loader.buffers.length) {
        this.localAudioPlayer.updateTrack(beacon.minor, this.beacon.rssiToDist(beacon.rssi));
      }

    });
    // diplay beacon list on screen
    document.getElementById('logValues').innerHTML = log;
  }

}
