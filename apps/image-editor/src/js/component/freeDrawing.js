import { fabric } from 'fabric';
import Component from '@/interface/component';
import { componentNames } from '@/consts';

/**
 * FreeDrawing
 * @class FreeDrawing
 * @param {Graphics} graphics - Graphics instance
 * @extends {Component}
 * @ignore
 */
class FreeDrawing extends Component {
  constructor(graphics) {
    super(componentNames.FREE_DRAWING, graphics);

    /**
     * Brush width
     * @type {number}
     */
    this.width = 12;

    /**
     * fabric.Color instance for brush color
     * @type {fabric.Color}
     */
    this.oColor = new fabric.Color('rgba(0, 0, 0, 0.5)');
    this._handlers = {
      mousedown: this._onFabricMouseDown.bind(this),
      mousemove: this._onFabricMouseMove.bind(this),
      mouseup: this._onMasikMouseUp.bind(this),
    };

    /**
     * imageEditor instance
     */
    this.imageEditor = null;
  }

  /**
   * Start free drawing mode
   * @param {{width: ?number, color: ?string}} [setting] - Brush width & color
   */
  start(setting) {
    console.log(setting);
    if (setting?.mosaic) {
      this.setMosaic(setting);
    } else {
      const canvas = this.getCanvas();
      console.log(canvas);
      canvas.isDrawingMode = true;
      this.setBrush(setting);
    }
  }

  /**
   * Set brush
   * @param {{width: ?number, color: ?string}} [setting] - Brush width & color
   */
  setBrush(setting) {
    const brush = this.getCanvas().freeDrawingBrush;

    setting = setting || {};
    this.width = setting.width || this.width;
    if (setting.color) {
      this.oColor = new fabric.Color(setting.color);
    }
    brush.width = this.width;
    brush.color = this.oColor.toRgba();
  }

  /**
   * End free drawing mode
   */
  end() {
    const canvas = this.getCanvas();
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.off('mouse:down', this._handlers.mousedown);
  }

  /**
   * Set mosaic
   */
  setMosaic(setting) {
    this.imageEditor = setting.imageEditor;
    this.width = setting.width;
    const canvas = this.getCanvas();
    canvas.selection = false;
    canvas.on('mouse:down', this._handlers.mousedown);
  }

  /**
   * MouseDown event handler on canvas
   * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event object
   * @private
   */
  _onFabricMouseDown() {
    const canvas = this.getCanvas();
    canvas.on({
      'mouse:move': this._handlers.mousemove,
      'mouse:up': this._handlers.mouseup,
    });
  }

  /**
   * MouseDown event handler on canvas
   * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event object
   * @private
   */
  _onFabricMouseMove(fEvent) {
    const canvas = this.getCanvas();
    const blockSize = this.width;
    const halfSize = this.width / 2;
    // 直接获取e中的x，y有问题
    const startPoints = canvas.getPointer(fEvent.e);
    console.log(startPoints);
    const startX = startPoints.x - halfSize;
    console.log(startX);
    const startY = startPoints.y - halfSize;
    const ctx = canvas.contextContainer;
    const imageData = ctx.getImageData(startX, startY, blockSize, blockSize);
    const { data } = imageData;
    let r = 0;
    let g = 0;
    let b = 0;
    for (let i = 0; i < data.length; i += 4) {
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
    }
    r = Math.floor(r / (blockSize * blockSize));
    g = Math.floor(g / (blockSize * blockSize));
    b = Math.floor(b / (blockSize * blockSize));
    for (let i = 0; i < data.length; i += 4) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255; // Alpha值
    }
    ctx.putImageData(imageData, startX, startY);
  }

  /**
   * MouseUp event handler on canvas
   * @private
   */
  async _onMasikMouseUp() {
    const doms = document.getElementsByClassName('lower-canvas');
    const [domCanvas] = doms;
    const dataURL = domCanvas.toDataURL();
    const response = await fetch(dataURL);
    const blob = await response.blob();
    const imgUrl = URL.createObjectURL(blob);
    this.imageEditor.invoke('addImageObject', imgUrl);
    const canvas = this.getCanvas();
    canvas.off({
      'mouse:move': this._handlers.mousemove,
      'mouse:up': this._handlers.mouseup,
    });
  }
}

export default FreeDrawing;
