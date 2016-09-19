import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

class LoopTrack {
  constructor() {
    const gain = audioContext.createGain();
    gain.gain.value = 0;

    // effect 1
    const cutoff = audioContext.createBiquadFilter();
    cutoff.connect(gain);
    cutoff.type = 'lowpass';
    this.minCutoffFreq = 5;
    this.maxCutoffFreq = audioContext.sampleRate / 2;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);
    cutoff.frequency.value = this.minCutoffFreq;

    const src = audioContext.createBufferSource();
    src.connect(cutoff);

    this.src = src;
    this.gain = gain;
    this.cutoff = cutoff;
    this.lastUpdated = 0;
  }

  connect(node) {
    this.gain.connect(node);
  }

  disconnect(node) {
    this.gain.disconnect(node);
  }

  start(audioTime, syncTime, buffer) {
    const duration = buffer.duration;
    const offset = syncTime % duration;

    this.src.buffer = buffer;
    this.src.start(audioTime, offset);
    this.src.loop = true;

    this.lastUpdated = syncTime;
  }

  setEffect1Value(val) {
    const cutoffFreq = this.minCutoffFreq * Math.exp(this.logCutoffRatio * val);
    this.cutoff.frequency.value = cutoffFreq;
  }

  setGain(val, fadeTime = 0) {
    if(fadeTime > 0) {
      const param = this.gain.gain;
      const audioTime = audioContext.currentTime;
      const currentValue = param.value;
      param.cancelScheduledValues(audioTime);
      param.linearRampToValueAtTime(currentValue, audioTime);
      param.linearRampToValueAtTime(val, audioTime + fadeTime);
    } else {
      this.gain.gain.value = val;
    }
  }

  updateDistance(audioTime, syncTime, dist) {
    const spread = 1; // -3dB at spread meters away
    let gain = 0;

    if (dist !== 0) {
      gain = Math.exp(-Math.pow(dist, 2) / (Math.pow(spread, 2) / 0.7));
      gain = Math.min(1, gain);
    }

    this.setGain(gain, 0.5);
    this.lastUpdated = syncTime;
  }
}

export default class AudioPlayer {
  constructor(sync, scheduler, buffers) {
    this.sync = sync;
    this.scheduler = scheduler;
    this.buffers = buffers;

    this.localTrack = new LoopTrack();
    this.localTrack.connect(audioContext.destination);
    this.remoteTracks = new Map();

    this.removeUnusedTracks = this.removeUnusedTracks.bind(this);

    window.setInterval(() => {
      this.removeUnusedTracks();
    }, 3000);
  }

  getTrack(id) {
    let track = this.remoteTracks.get(id);

    // create track if needed
    if (!track) {
      track = new LoopTrack();
      track.connect(audioContext.destination);

      const audioTime = audioContext.currentTime;
      const syncTime = this.sync.getSyncTime(audioTime);
      const buffer = this.buffers[id];
      track.start(audioTime, syncTime, buffer);

      this.remoteTracks.set(id, track);
    }

    return track;
  }

  updateTrack(id, dist) {
    const audioTime = audioContext.currentTime;
    const syncTime = this.sync.getSyncTime(audioTime);
    const track = this.getTrack(id);

    if(track)
      track.updateDistance(audioTime, syncTime, dist);
  }

  removeUnusedTracks() {
    const audioTime = audioContext.currentTime;
    const syncTime = this.sync.getSyncTime(audioTime);

    this.remoteTracks.forEach((track, id) => {
      if ((syncTime - track.lastUpdated) > 6) {
        track.setGain(0, 1); // fade out in 1 sec
        this.remoteTracks.delete(id);
      }
    });
  }

  start(id) {
    const buffer = this.buffers[id];
    const audioTime = audioContext.currentTime;
    const syncTime = this.sync.getSyncTime(audioTime);
    this.localTrack.start(audioTime, syncTime, buffer);
    this.localTrack.setGain(1);

  }

  setEffect1Value(id, val) {
    let track;

    if (id === 'local')
      track = this.localTrack;
    else
      track = this.remoteTracks.get(id);

    if(track)
      track.setEffect1Value(val);
  }

  connect(node) {
    this.localTrack.connect(node);
  }

  disconnect(node) {
    this.localTrack.disconnect(node);
  }
}
