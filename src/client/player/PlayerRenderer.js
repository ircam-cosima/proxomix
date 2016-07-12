import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer.
 * The class renders a dot moving over the screen and rebouncing on the edges.
 */
export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    this.bkgChangeColor = false;
    this.bkgColorList = ['rgba(200,160,0,1.0)', 'rgba(100,60,0, 1.0)'];
  }

  /**
   * Initialize rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  init() {
  }

  /**
   * Update rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  update(dt) {
  }

  /**
   * Draw into canvas.
   * Method is called by animation frame loop in current frame rate.
   * @param {CanvasRenderingContext2D} ctx - canvas 2D rendering context
   */
  render(ctx) {
    if (this.bkgChangeColor){
        ctx.save();
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.bkgColor;
        ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.fill();
        ctx.restore();
        this.bkgChangeColor = false
      }
    }

  setBkgColor(colorId) {
    this.bkgChangeColor = true;
    this.bkgColor = this.bkgColorList[colorId];
  }
}
