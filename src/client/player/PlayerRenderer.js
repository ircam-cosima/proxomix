import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer, used e.g. to change screen's background color.
 */
export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.bkgChangeColor = false;

    // get list of background colors, based on color-scheme lib,
    // see http://c0bra.github.io/color-scheme-js/
    var ColorScheme = require('color-scheme');
    var scheme = new ColorScheme;
    scheme.from_hue(0.08 * 360)
      .scheme('tetrade')
      .variation('pastel')
      .web_safe(true);
    this.bkgColorList = scheme.colors();
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
    if (this.bkgChangeColor) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#' + this.bkgColor;
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fill();
      ctx.restore();
      this.bkgChangeColor = false
    }
  }

  /**
   * Tell render to change background color at next update.
   * @param {Number} colorId - color index in this.bkgColorList
   */
  setBkgColor(colorId) {
    this.bkgColor = this.bkgColorList[colorId % this.bkgColorList.length];
    this.bkgChangeColor = true;
  }
}
