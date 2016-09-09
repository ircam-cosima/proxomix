import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;

export default class AudioAnalyser {
  constructor() {

    this.in = audioContext.createGain();

    let filter = audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 50;
    this.filter = filter;

    this.analyser = audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.7;
    this.analyser.fftSize = 32;
    this.freqs = new Uint8Array(this.analyser.frequencyBinCount);

    this.maxPeakValue = 0.0;

    this.in.connect(this.filter);
    this.filter.connect(this.analyser);
  }


  getAmplitude() {

    this.analyser.getByteFrequencyData(this.freqs);

    let amplitude = 0.0;

    for (let i = 0; i < this.analyser.frequencyBinCount; i++) {
      amplitude += this.freqs[i];
    }

    // update local normalization mecanism to always send back value in [0 1]
    if( amplitude > this.maxPeakValue ) this.maxPeakValue = amplitude;
    // let norm = this.analyser.frequencyBinCount * 32; // arbitrary value, to be cleaned
    return amplitude / this.maxPeakValue;
  }

}
