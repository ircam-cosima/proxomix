import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class AudioPlayer {

    constructor(sync, buffers, gains) {
        this.masterGain = audioContext.createGain();
        this.masterGain.connect(audioContext.destination);

        this.filter = audioContext.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 0; // 22050;
        this.filter.connect(this.masterGain);

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
            filter: audioContext.createBiquadFilter(),
            lastUpdated: 0
        };

        // setup track
        console.log(trackID, this.buffers[trackID]);
        track.src.buffer = this.buffers[trackID];
        track.src.loop = true;
        track.gMain.gain.value = Math.min(Math.abs(this.gains[trackID]), 3.0);
        track.gDist.gain.value = 0.0;
        track.lastUpdated = this.sync.getSyncTime();

        // setup effect 1 
        track.filter.type = 'lowpass';
        track.filter.frequency.value = 22050;

        // connect graph
        track.src.connect(track.filter);
        track.filter.connect(track.gMain);
        track.gMain.connect(track.gDist);
        track.gDist.connect(this.masterGain);

        // sync start
        var startTime = track.src.buffer.duration - (this.sync.getSyncTime() % track.src.buffer.duration);
        track.src.start(audioContext.currentTime + startTime);

        return track
    }

    removeUnusedTracks() {
        this.tracks.forEach((track, trackID) => {
            // console.log('track:', trackID, 'last update:', track.lastUpdated, '(current:',this.sync.getSyncTime(), ')');
            if ((this.sync.getSyncTime() - track.lastUpdated) > 6.0) {
                // fade out
                track.gDist.gain.cancelScheduledValues();
                track.gDist.gain.linearRampToValueAtTime(track.gDist.gain.value, audioContext.currentTime);
                track.gDist.gain.linearRampToValueAtTime(0.0, audioContext.currentTime + 1.0);
                // remove from local
                this.tracks.splice(trackID, 1);
            }
        });
    }

    setLocalTrack(trackID) {
        // setup source
        var src = audioContext.createBufferSource();
        src.buffer = this.buffers[trackID];
        src.loop = true;

        // setup gain
        var gain = audioContext.createGain();
        gain.gain.value = this.gains[trackID];
        gain.gain.linearRampToValueAtTime(0.0, audioContext.currentTime);
        gain.gain.linearRampToValueAtTime(1.0, audioContext.currentTime + 1.0);

        // connect graph
        src.connect(gain);
        gain.connect(this.filter);

        // sync start
        var startTime = src.buffer.duration - (this.sync.getSyncTime() % src.buffer.duration);
        src.start(audioContext.currentTime + startTime);

        return this.filter;
    }

    setEffect1Value(id, val) {
        // check if relevant audio source (either me or present neighbor)
        if( (typeof this.tracks[id] !== 'undefined') || (id === -1) ) {
            // convert val to frequency value (exp scale to match perception)
            let valEffective = Math.max( 20, 22050*(Math.exp(5*val)-1)/(Math.exp(5)-1) );
            // myself
            if ( id == -1 ) this.filter.frequency.value = valEffective;
            // others
            else {
                // console.log(id, val, valEffective);
                this.tracks[id].filter.frequency.value = valEffective;
            }
        }
    }
}
