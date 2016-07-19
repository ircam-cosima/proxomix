import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class AudioPlayer {

    constructor(sync, buffers, gains) {
        this.masterGain = audioContext.createGain();
        this.masterGain.connect(audioContext.destination);
        this.sync = sync;
        this.buffers = buffers;
        this.gains = gains;
        this.tracks = [];

        // bind local functions
        this.updateTrack = this.updateTrack.bind(this);
        this.distToGain = this.distToGain.bind(this);
        this.getNewTrack = this.getNewTrack.bind(this);
        this.removeUnusedTracks = this.removeUnusedTracks.bind(this);

        window.setInterval(() => {
            this.removeUnusedTracks();
        }, 3000);

    }

    updateTrack(trackID, dist) {
        // create track if need be
        if (typeof this.tracks[trackID] === 'undefined') {
            this.tracks[trackID] = this.getNewTrack(trackID);
        }
        // distance-based update of track gain
        var gainValue = this.distToGain(dist);
        this.tracks[trackID].gDist.gain.linearRampToValueAtTime(this.tracks[trackID].gDist.gain.value, audioContext.currentTime);
        this.tracks[trackID].gDist.gain.linearRampToValueAtTime(Math.min(gainValue, 1.0), audioContext.currentTime + 0.5);
        this.tracks[trackID].lastUpdated = this.sync.getSyncTime();
    }

    distToGain(dist) {
        var spread = 1; // -3dB at `spread`meters away
        var gain = 0.0;
        if (dist != 0.0) {
            gain = Math.exp(-Math.pow(dist, 2) / (Math.pow(spread, 2) / 0.7));
        }
        return gain
    }

    getNewTrack(trackID) {
        // create track
        var track = {
            src: audioContext.createBufferSource(),
            gMain: audioContext.createGain(),
            gDist: audioContext.createGain(),
            lastUpdated: 0
        };

        // setup track
        console.log(trackID, this.buffers[trackID]);
        track.src.buffer = this.buffers[trackID];
        track.src.loop = true;
        track.gMain.gain.value = Math.min(Math.abs(this.gains[trackID]), 3.0);
        track.gDist.gain.value = 0.0;
        track.lastUpdated = this.sync.getSyncTime();

        // connect graph
        track.src.connect(track.gMain);
        track.gMain.connect(track.gDist);
        track.gDist.connect(this.masterGain);

        // sync source
        var startTime = this.sync.getSyncTime() % track.src.buffer.duration;
        track.src.start(0, startTime, 30); // dirty fix for flawed mp3, to be removed
        // track.src.start(audioContext.currentTime, 0, 30);

        return track
    }

    removeUnusedTracks() {
        this.tracks.forEach((track, trackID) => {
            // console.log('track:', trackID, 'last update:', track.lastUpdated, '(current:',this.sync.getSyncTime(), ')');
            if ((this.sync.getSyncTime() - track.lastUpdated) > 6.0) {
                // fade out
                track.gDist.gain.linearRampToValueAtTime(track.gDist.gain.value, audioContext.currentTime);
                track.gDist.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 1.0);
                // remove from local
                this.tracks.splice(trackID, 1);
            }
        });
    }

    setLocalTrack(trackID) {
        var src = audioContext.createBufferSource();
        src.buffer = this.buffers[trackID];
        src.loop = true;

        var gain = audioContext.createGain();
        gain.gain.value = this.gains[trackID];

        console.log(gain.gain.value, src.buffer);

        src.connect(gain);
        gain.connect(audioContext.destination);
        var startTime = this.sync.getSyncTime() % src.buffer.duration;
        src.start(0, startTime, 30); // dirty fix for flawed mp3, to be removed
    }
}
