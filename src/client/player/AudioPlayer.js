import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;
const audio = soundworks.audio;

const maxIdleTime = 6;

class LoopTrack extends audio.TimeEngine {
  constructor(sync, scheduler, local) {
    super();

    this.sync = sync;
    this.scheduler = scheduler;
    this.local = local;

    this.buffer = null;
    this.duration = 0;

    this.minCutoffFreq = 5;
    this.maxCutoffFreq = audioContext.sampleRate / 2;
    this.logCutoffRatio = Math.log(this.maxCutoffFreq / this.minCutoffFreq);

    const gain = audioContext.createGain();
    gain.gain.value = 0;

    // effect 1
    const cutoff = audioContext.createBiquadFilter();
    cutoff.connect(gain);
    cutoff.type = 'lowpass';
    cutoff.frequency.value = this.minCutoffFreq;

    this.src = null;
    this.cutoff = cutoff;
    this.gain = gain;
    this.lastUpdated = 0;
  }

  connect(node) {
    this.gain.connect(node);
  }

  disconnect(node) {
    this.gain.disconnect(node);
  }

  setBuffer(buffer, quantization = 0) {
    this.buffer = buffer;

    if(quantization > 0)
      this.duration = Math.floor(buffer.duration / quantization + 0.5) * quantization;
    else
      this.duration = buffer.duration;
  }

  start(audioTime, offset = 0) {
    const buffer = this.buffer;

    if(buffer && offset < buffer.duration) {
      const src = audioContext.createBufferSource();
      src.connect(this.cutoff);
      src.buffer = buffer;
      src.start(audioTime, offset);

      this.src = src;
   }
  }

  stop(audioTime) {
    if(this.src) {
      this.src.stop(audioTime); // ... and stop
      this.src = null;
    }
  }

  advanceTime(syncTime) {
    const audioTime = this.sync.getAudioTime(syncTime);

    if(!this.local && syncTime > this.lastUpdated + maxIdleTime) {
      this.stop(audioTime);
      return; // stop scheduling
    }

    this.start(audioTime);

    return syncTime + this.duration;
  }

  launch() {
    if(!this.src) {
      const audioTime = this.scheduler.audioTime;
      const syncTime = this.sync.getSyncTime(audioTime);
      const offset = syncTime % this.duration;
      const delay = this.duration - offset;

      this.start(audioTime, offset);

      this.scheduler.add(this, syncTime + delay, true); // schedule syncronized
      this.lastUpdated = syncTime;
    }
  }

  setEffect1Value(val) {
    const cutoffFreq = this.minCutoffFreq * Math.exp(this.logCutoffRatio * val);
    this.cutoff.frequency.value = cutoffFreq;
  }

  setGain(val, fadeTime = 0) {
    if(fadeTime > 0) {
      const param = this.gain.gain;
      const audioTime = this.scheduler.audioTime;
      const currentValue = param.value;
      param.cancelScheduledValues(audioTime);
      param.setValueAtTime(currentValue, audioTime);
      param.linearRampToValueAtTime(val, audioTime + fadeTime);
    } else {
      this.gain.gain.value = val;
    }
  }

  updateDistance(audioTime, syncTime, dist) {
    if (dist < 3.0) {
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
}

export default class AudioPlayer {
  constructor(sync, scheduler, buffers, options = {}) {
    this.sync = sync;
    this.scheduler = scheduler;
    this.buffers = buffers;
    this.tracks = {};

    this.quantization = options.quantization;

    const localTrack = new LoopTrack(sync, scheduler, true);
    localTrack.connect(audioContext.destination);
    this.tracks.local = localTrack;
  }

  getRunningTrack(id) {
    let track = this.tracks[id];

    // create track if needed
    if (!track) {
      track = new LoopTrack(this.sync, this.scheduler, false);
      track.connect(audioContext.destination);
      track.setBuffer(this.buffers[id], this.quantization);

      this.tracks[id] = track;
    }

    track.launch();

    return track;
  }

  updateTrack(id, dist) {
    const audioTime = this.scheduler.audioTime;
    const syncTime = this.sync.getSyncTime(audioTime);
    const track = this.getRunningTrack(id);

    if(track)
      track.updateDistance(audioTime, syncTime, dist);
  }

  startLocalTrack(id) {
    const localTrack = this.tracks.local;
    localTrack.setBuffer(this.buffers[id], this.quantization);
    localTrack.launch();
    localTrack.setGain(1);
  }

  setEffect1Value(id, val) {
    const track = this.tracks[id];

    if(track)
      track.setEffect1Value(val);
  }

  connect(node) {
    const localTrack = this.tracks.local;
    localTrack.connect(node);
  }

  disconnect(node) {
    const localTrack = this.tracks.local;
    localTrack.disconnect(node);
  }
}
