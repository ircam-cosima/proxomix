import * as soundworks from 'soundworks/client';

import Beacon from '../../shared/client/services/Beacon';

import SpatSourcesHandler from './SpatSourcesHandler';
import AudioPlayer from './AudioPlayer';
import PlayerRenderer from './PlayerRenderer';

const audioContext = soundworks.audioContext;

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

// this experience display neighboring iBeacons and setup the device itself as an iBeacon,
// illustrating basic use of the soundworks beacon service
export default class PlayerExperience extends soundworks.Experience {

  constructor(standalone, assetsDomain, beaconUUID, audioFiles) {
    // disable socket connection - use for standalone application
    super(!standalone);

    // local attributes
    this.frameRate = 100; // main loop repeated every ... ms
    this.limitShakeInputCounter = 0;
    this.audioFiles = audioFiles;
    this.socialStatus = -1;
    this.beaconList = new Map();

    // temporary attributes
    let audioFilesName = [];
    this.audioFiles.forEach((elmt) => { audioFilesName.push(elmt['fileName']) });

    // services
    this.loader = this.require('loader', { files: audioFilesName });
    this.platform = this.require('platform', { features: ['web-audio', 'wake-lock'] });
    this.checkin = this.require('checkin', { showDialog: false });
    this.sync = this.require('sync');
    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity', 'deviceorientation']
    });
    // beacon only work in cordova mode since it needs access right to BLE
    if (window.cordova) { this.beacon = this.require('beacon', { uuid: beaconUUID }); }

    // bindings
    this.run = this.run.bind(this);
    this.onAccelerationIncludingGravity = this.onAccelerationIncludingGravity.bind(this);
    this.beaconCallback = this.beaconCallback.bind(this);
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { title: `Scanning iBeacons...` };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();

    if (this.beacon) { this.beacon.addListener(this.beaconCallback); }

    // this.spatSourcesHandler = new SpatSourcesHandler(this);
    this.localAudioPlayer = new AudioPlayer(this.sync);
  }


  start() {
    super.start();
    if (!this.hasStarted) { this.init(); }
    this.show();

    // if (this.motionInput.isAvailable('deviceorientation')) {
    //   this.motionInput.addListener('deviceorientation', (data) => {
    //     this.spatSourcesHandler.setListenerPos(data);
    //   });
    // }

    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', this.onAccelerationIncludingGravity);
    }

    // add local beacon info on screen
    if (this.beacon) {
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
    }

    // Setup listeners for player connections / disconnections
    this.receive('shaked', (beaconInfos, time) =>{
      console.log(beaconInfos, this.beaconList);
      this.beaconList.forEach((value, key, map) => {
        console.log(beaconInfos, key);
        console.log(beaconInfos.charCodeAt(0), key.charCodeAt(0));
      });
      const beacon = this.beaconList.get(beaconInfos);
      if (beacon){ var rssi = beacon.rssi; }
      else {
        var rssi = -55;
        console.warn('BEACON NOT IN LOCAL MAP!!!', beaconInfos, this.beaconList);
      }

      var delayDist = -( rssi + 40)/16;
      var delayTime = (time-this.sync.getSyncTime()) + delayDist;
      console.log(rssi, time, this.sync.getSyncTime(), delayTime, audioContext.currentTime);
      this.localAudioPlayer.playSound(this.loader.buffers[0], this.audioFiles[0].gain, delayTime);
    });

    this.receive('status', (socialStatus) =>{
      this.socialStatus = socialStatus;
      this.renderer.setBkgColor(this.socialStatus);
    });

    // create game loop timer
    window.setInterval(this.run, this.frameRate);

    window.addEventListener('orientationchange', () => {
      this.renderer.setBkgColor(this.socialStatus);
    });

    // initialize rendering
    this.renderer = new PlayerRenderer();
    this.view.addRenderer(this.renderer);
  }

  beaconCallback(pluginResult) {
    // get beacon list
    var log = '';
    pluginResult.beacons.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
             console.log(beacon.major + '.' + beacon.minor, beacon);
      this.beaconList.set(beacon.major + '.' + beacon.minor, beacon);
    });
    // diplay beacon list on screen
    document.getElementById('logValues').innerHTML = log;
    console.log(this.beaconList);

  }

  run() {
    this.limitShakeInputCounter += 1;
  }

  onAccelerationIncludingGravity(data) {
    const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);

    // clear screen on shaking
    if (mag > 20 && this.limitShakeInputCounter > 3 && this.socialStatus == 0) {
      // play sound
      this.localAudioPlayer.playSound(this.loader.buffers[0], this.audioFiles[0].gain);
      this.limitShakeInputCounter = 0;
      // send msg
      if (this.beacon){ var minMaj = this.beacon.major + '.' + this.beacon.minor; }
      else{ var minMaj = 'Maj.Min'; }
      this.send('shake', minMaj, this.sync.getSyncTime());
    }
  }

}
