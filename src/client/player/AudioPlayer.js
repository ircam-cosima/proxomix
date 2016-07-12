import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class AudioPlayer {
  constructor() {

    // local attributes
    // this.srcMap = new Map();
    // this.gainMap = new Map();


    this.masterGain = audioContext.createGain();
    this.masterGain.gain.value = 1.0;


    // init
    this.masterGain.connect(audioContext.destination);
  }

  playSound(buffer, soundLvl, delay = 0, loop = false){

    // create audio source node
    var src = audioContext.createBufferSource();
    src.buffer = buffer;
    src.loop = loop;

    // create source specific gain node
    var gain = audioContext.createGain();
    gain.gain.value = Math.min(Math.abs(soundLvl),3.0);

    // connect graph
    src.connect(gain);
    gain.connect(this.masterGain);

    // start source
    // var startTime = this.sync.getSyncTime(); //  % src.buffer.duration;
    // console.log(startTime, audioContext.currentTime);
    // src.start(startTime + delay);
    src.start(audioContext.currentTime + delay);

    // // store nodes in local maps
    // this.srcMap.set(buffer,src);
    // this.gainMap.set(buffer,gain);

    // // empty local maps of disused sources and associated gains
    // src.onended = () => {
    //   // disconnect
    //   // this.gainMap.get(buffer).disconnect();
    //   //delete
    //   this.srcMap.delete(buffer);
    //   this.gainMap.delete(buffer);
    //   console.log('deleting audio source from local map');
    // }

    // this.srcMap.forEach((value, key, map) => {
    // });

  }

}
