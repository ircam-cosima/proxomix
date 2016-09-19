import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;

const itur468Coeffs = [
  {freq: 31.5, gain: -29.9},
  {freq: 63.0, gain: -23.9},
  {freq: 100.0, gain: -19.8},
  {freq: 200.0, gain: -13.8},
  {freq: 400.0, gain: -7.8},
  {freq: 800.0, gain: -1.9},
  {freq: 1000.0, gain: 0.0},
  {freq: 2000.0, gain: 5.6},
  {freq: 3150.0, gain: 9.0},
  {freq: 4000.0, gain: 10.5},
  {freq: 5000.0, gain: 11.7},
  {freq: 6300.0, gain: 12.2},
  {freq: 7100.0, gain: 12.0},
  {freq: 8000.0, gain: 11.4},
  {freq: 9000.0, gain: 10.1},
  {freq: 10000.0, gain: 8.1},
  {freq: 12500.0, gain: 0.0},
  {freq: 14000.0, gain: -5.3},
  {freq: 16000.0, gain: -11.7},
  {freq: 20000.0, gain: -22.2},
  {freq: 31500.0, gain: -42.7}
];

function decibelToLinear(val) {
  return Math.exp(0.11512925464970229 * val); // pow(10, val / 20)
}

function getIndex(array, freq) {
  const length = array.length;
  const maxFreq = array[length - 1].freq;
  const maxIndex = length - 2;

  if(freq >= maxFreq)
    return maxIndex;

  for(let i = 0; i < length - 1; i++) {
    if(itur468Coeffs[i].freq > freq)
      return i - 1;
  }

  return maxIndex;
}

function getItur468Factor(freq) {
  const index = getIndex(itur468Coeffs, freq);
  let gain;

  if(index < 0) {
    const freq0 = itur468Coeffs[0].freq;
    const gain0 = itur468Coeffs[0].gain;

    gain = gain0 + Math.log(freq / freq0) * 6.0 / Math.LN2;
  } else {
    const freq0 = itur468Coeffs[index].freq;
    const gain0 = itur468Coeffs[index].gain;
    const freq1 = itur468Coeffs[index + 1].freq;
    const gain1 = itur468Coeffs[index + 1].gain;

    gain = gain0 + (freq - freq0) * (gain1 - gain0) / (freq1 - freq0);
  }

  return decibelToLinear(gain);
}

export default class AudioAnalyser {
  constructor() {
    this.input = audioContext.createGain();

    this.analyser = audioContext.createAnalyser();
    this.analyser.smoothingTimeConstant = 0.02;
    this.analyser.fftSize = 256;

    const binCount = this.analyser.frequencyBinCount;
    const binFreqStep = audioContext.sampleRate;
    this.specAmps = new Uint8Array(binCount);

    this.specWeights = [];

    for(let i = 0; i < binCount; i++) {
      const freq = i * binFreqStep;
      this.specWeights[i] = getItur468Factor(freq);
    }

    this.maxPower = 0;
    this.input.connect(this.analyser);
  }

  getPower() {
    this.analyser.getByteFrequencyData(this.specAmps);

    const binCount = this.analyser.frequencyBinCount;
    let power = 0.0;

    for (let i = 1; i < binCount; i++) {
      const amp = this.specAmps[i] * this.specWeights[i] / binCount;
      power += (amp * amp);
    }

    // update local normalization mecanism to always send back value in [0 1]
    if(power > this.maxPower)
      this.maxPower = power;

    // let norm = this.analyser.frequencyBinCount * 32; // arbitrary value, to be cleaned
    return power / this.maxPower;
  }
}
