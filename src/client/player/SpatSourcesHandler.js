import * as ambisonics from 'web-audio-ambisonic'
import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;

export default class SpatSourcesHandler {
  constructor(handleToPlayerExperience) {

    // local attributes
    this.handleToPlayerExperience = handleToPlayerExperience;
    this.sourceList = [];

    // create graph (generic)
    let ambisonicOrder = 3;
    this.decoder = new ambisonics.binDecoder(audioContext, ambisonicOrder);
    var loader_filters = new ambisonics.HOAloader(audioContext, ambisonicOrder, 'filters/IRC_1008_R_HRIR_virtual.wav', (buffer) => {
      this.decoder.updateFilters(buffer);
      this.decoder.out.connect(audioContext.destination);
    }); loader_filters.load();

    // create graph (sources)
    this.handleToPlayerExperience.audioFiles.forEach((elmt, index) => {

      let src = audioContext.createBufferSource(); src.loop = true;
      src.buffer = this.handleToPlayerExperience.loader.buffers[index];

      let gainStatic = audioContext.createGain();  gainStatic.gain.value = elmt.gain;
      let gainDynamic = audioContext.createGain(); gainDynamic.gain.value = 1.0;

      let encoder = new ambisonics.monoEncoder(audioContext, ambisonicOrder); // order
      encoder.azi = elmt.position[0]; encoder.elev = elmt.position[1];
      encoder.updateGains();

      src.connect(gainStatic);
      gainStatic.connect(gainDynamic);
      gainDynamic.connect(encoder.in);
      encoder.out.connect(this.decoder.in);
      src.start(0);

      this.sourceList.push({
        'sourceNode' : src,
        'gainStatic' : gainStatic,
        'gainDynamic' : gainDynamic,
        'encoder' : encoder,
        'position' : elmt.position,
      })

    });

  }


  setListenerPos(pos){
    // // modulo
    // if (pos[0] > 180){
    //   pos[0] = -360 + pos[0];
    // }

    // console.log('listener pos:', pos);

    this.sourceList.forEach((elmt, index) => {
      elmt.encoder.azi = Math.round( (pos[0] - elmt.position[0]) * 10) / 10;
      if (index == 0) console.log(pos[0], elmt.encoder.azi)
      // elmt.encoder.elev = elmt.position[1] - pos[2];
      elmt.encoder.updateGains();
    });

    // if (this.sourceList[0]!=0){
    //   var srcPos = this.getSourcePos(0);
    //   srcPos[0] = this.sourceList[0].initPos[0] - pos[0];
    //   console.log(srcPos);
    //   this.setPos(0,srcPos);
    //   this._updateBinauralPanner();
    // }
  }






  addSource(buffer, initPos, sourceSpeed, gain = 1.0){

    var srcIsAdded = false;

    // get new source ID
    var srcID = 0;
    for (let i = 0; i < this.sourceList.length; i++) {
        if (this.sourceList[srcID] === 0){

            // create output gain node
            var gainNode = audioContext.createGain();
            gainNode.gain.value = gain;

            // create source
            var source = {
              src: this._getNewSourceNode(buffer, true),
              speed: sourceSpeed,
              initPos: initPos,
              gain: gainNode
            };

            source.src.connect(source.gain);

            this.sourceList[srcID] = source; // mark source as active
            console.log('new source created - ID:', srcID, '- pos:', initPos);
            srcIsAdded = true;
            break;
        }
        srcID += 1;
    }

    // connect graph
    if (srcIsAdded){
      this.setSourcePos(srcID, initPos);
      this.binauralPanner.connectInputByIndex(srcID, this.sourceList[srcID].gain);
    }

    // return source added status
    return srcIsAdded;
  }

  advanceSources(){
    this.sourceList.forEach((elmt, index, array) => {
      if (elmt){
        // it's not the source itself that remembers its position but the binaural panner
        var srcID = index;
        var srcSpeed = elmt.speed;
        var pos = this.getSourcePos(srcID);
        pos[2] -= srcSpeed;

        // if source touched user
        if (pos[2] <= 0.1){
          // send word to the main module
          this.handleToPlayerExperience.playerHit();

          // stop source and rm from local list
          this.rmSource(srcID);
        }
        else{
          this.setSourcePos(srcID, pos);
          var tmp = this.getSourcePos(srcID);
          console.log('source', srcID, 'pos:', tmp);
        }

        this._updateBinauralPanner();

      }


    });
  }

  rmSource(srcID){
    this.sourceList[srcID].src.stop();
    this.binauralPanner.disconnectInputByIndex(srcID, this.sourceList[srcID].gain);
    this.sourceList[srcID] = 0;
  }

  getNearesFacingSourceID(){
    var final_srcID = -1;
    var final_azimOffset = 361;

    this.sourceList.forEach((elmt, index, array) => {
      var srcPos = this.getSourcePos(index);
      var azimOffset = Math.abs(this.binauralPanner.listenerView[0] - srcPos[0]);

      // modulo
      if (azimOffset > 180){
        azimOffset = 360 - azimOffset;
      }

      if (azimOffset < final_azimOffset){
        final_azimOffset = azimOffset;
        final_srcID = index;
      }

    });

    // somehow, the source pos needs a 180 shit to be compared to listener's...
    final_azimOffset += 180
    // modulo
    if (final_azimOffset > 180){
      final_azimOffset = 360 - final_azimOffset;
    }

    return[final_srcID, Math.abs(final_azimOffset-180)]; // WARNINNG: LAZY LISTENER POSITION BUG FIX, [final_srcID, final_azimOffset]
  }



  getNumberOfActiveSources(){
    var numSrc = 0;
    this.sourceList.forEach((elmt, index, array) => {
      if (elmt !== 0){
        numSrc += 1;
      }
    });

    return numSrc;
  }

  getSourcePos(srcID){
    var pos = this.binauralPanner.getSourcePositionByIndex(srcID);
    return pos
  }

  setSourcePos(srcID, pos){
    var position = this.binauralPanner.getSourcePositionByIndex(srcID);
    position = pos;
    this.binauralPanner.setSourcePositionByIndex(srcID, position);
  }

  _updateBinauralPanner(){
    // update filters
    window.requestAnimationFrame(() => {
        this.binauralPanner.update();
        // console.log('update', this.binauralPanner.getSourcePositionByIndex(0));
    });
  }
}



// BinauralPlayerNode.prototype.setPosition = function(type, value) {

//     // get current position
//     var position = this.binauralPanner.getSourcePositionByIndex(0);

//     // update position
//     if (type == 'azim') {
//         position[0] = value;
//     }
//     if (type == 'elev') {
//         position[1] = value;
//     }
//     if (type == 'dist') {
//         position[2] = value;
//         document.getElementById("slider_distance_value").innerHTML = "Distance: " + value;
//     }

//     this.binauralPanner.setSourcePositionByIndex(0, position);

//     // update filters
//     window.requestAnimationFrame(() => {
//         this.binauralPanner.update();
//         // console.log('update', this.binauralPanner.getSourcePositionByIndex(0));
//     });
// };
