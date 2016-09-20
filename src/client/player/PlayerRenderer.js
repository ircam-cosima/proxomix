import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer, used e.g. to change screen's background color.
 */
export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.bkgChangeColor = false;
    this.audioAnalyser = null;

    // define background color list
    this.bkgColorList = [
       [224, 16, 107],
       [90, 34, 220],
       [134, 200, 43],
       [255, 111, 0]
    ];

    // define visual feedback color list
    this.analyserColorList = [
       [130, 120, 200],
       [150, 140, 220],
       [80, 80, 80],
       [80, 80, 80]
    ];    
  }

  /**
   * Initialize rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  init() {}

  /**
   * Update rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  update(dt) {}

  /**
   * Draw into canvas.
   * Method is called by animation frame loop in current frame rate.
   * @param {CanvasRenderingContext2D} ctx - canvas 2D rendering context
   */
  render(ctx) {

    // set background color
    if (this.bkgChangeColor) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "rgb(" + this.bkgColor[0] + ", " + this.bkgColor[1] + ", " + this.bkgColor[2] + ")";
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fill();
      ctx.restore();
      this.bkgChangeColor = false;
    }

    // // use screen brightness for visual feedback on sound level
    // if( this.audioAnalyser ) {
    //   const power = this.audioAnalyser.getPower();
    //   this.setBkgLightness(power);
    // }

    // add visual feedback on sound level (freq analyser)
    if( this.audioAnalyser && this.analyserColor !== undefined ) {

      let specAmps = this.audioAnalyser.getFreqAmplArray();
      let binCount = this.audioAnalyser.analyser.frequencyBinCount;

      // Draw frequency spectrum
      for (let i = 0; i < binCount; i++) {
        let percent = specAmps[i] / 256;
        let height = this.canvasHeight * percent;
        let offset = this.canvasHeight - height - 1;
        let barWidth = this.canvasWidth / binCount;
        ctx.fillStyle = "rgb(" + this.analyserColor[0] + ", " + this.analyserColor[1] + ", " + this.analyserColor[2] + ")";
        ctx.fillRect(i * barWidth, offset, barWidth, height);
      }      

      this.bkgChangeColor = true;
    }
  }

  /**
   * Tell render to change background color at next update.
   * @param {Number} colorId - color index in this.bkgColorList
   * or @param {Array}  colorId - HSL color array
   */
  setBkgColor(colorId) {
    if (colorId.length === 3) {
      this.bkgColor = colorId; // direct color HSL
      this.analyserColor = this.analyserColorList[0];
    }
    else {
      this.bkgColor = this.bkgColorList[colorId % this.bkgColorList.length]; // or give color ID to checkout in local color list
      this.analyserColor = this.analyserColorList[colorId % this.analyserColorList.length];
    }

    this.bkgChangeColor = true;
  }

  /**
   * Tell render to change background color lightness at next update.
   * @param {Number} lightness - color lightness (HSL - L value)
   */
  setBkgLightness(lightness) {
    // added mecanism to sharpen visual feedback
    let filteredLightness = (lightness > 0.1) ? 75 * lightness : (Math.max(this.bkgColor[2] - 5, 0));
    this.bkgColor[2] = filteredLightness;
    this.bkgChangeColor = true;
  }
}
