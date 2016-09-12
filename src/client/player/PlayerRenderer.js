import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer, used e.g. to change screen's background color.
 */
export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.bkgChangeColor = false;
    this.handleToAudioAnalyser = null;

    // // get list of background colors, based on color-scheme lib,
    // // see http://c0bra.github.io/color-scheme-js/
    // var ColorScheme = require('color-scheme');
    // var scheme = new ColorScheme;
    // scheme.from_hue(0.08 * 360)
    //   .scheme('tetrade')
    //   .variation('pastel')
    //   .web_safe(true);
    // this.bkgColorList = scheme.colors();

    this.bkgColorList = [ [11, 83, 36],
                          [30, 100, 42] ,   
                          [51, 11, 25],
                          [199, 16, 34],
                          [210, 17, 21],
                          [0, 0, 93] ]
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
    if( this.handleToAudioAnalyser )
      this.setBkgLightness( this.handleToAudioAnalyser.getAmplitude() )
    if (this.bkgChangeColor) {
      ctx.save();
      ctx.globalAlpha = 1;
      // ctx.fillStyle = '#' + this.bkgColor;
      ctx.fillStyle = "hsl(" + this.bkgColor[0] + ", " + this.bkgColor[1] + "%, " + this.bkgColor[2] + "%)";
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fill();
      ctx.restore();
      this.bkgChangeColor = false
    }
  }

  /**
   * Tell render to change background color at next update.
   * @param {Number} colorId - color index in this.bkgColorList
   * or @param {Array}  colorId - HSL color array
   */
  setBkgColor(colorId) {
    // direct color HSL
    if (colorId.length === 3) this.bkgColor = colorId;
    // or give color ID to checkout in local color list
    else this.bkgColor = this.bkgColorList[colorId % this.bkgColorList.length];
    this.bkgChangeColor = true;
  }

  /**
   * Tell render to change background color lightness at next update.
   * @param {Number} lightness - color lightness (HSL - L value)
   */
  setBkgLightness(lightness) {
    // added mecanism to sharpen visual feedback 
    let filteredLightness = (lightness > 0.1) ? 70*lightness : (Math.max(this.bkgColor[2]-5, 0));
    this.bkgColor[2] = filteredLightness;
    this.bkgChangeColor = true;
  }  
}
