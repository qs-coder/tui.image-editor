import { fabric } from 'fabric';
import extend from 'tui-code-snippet/object/extend';
import Component from '@/interface/component';
import Cropzone from '@/extension/cropzone';
import { keyCodes, componentNames, CROPZONE_DEFAULT_OPTIONS } from '@/consts';
import { clamp, fixFloatingPoint } from '@/util';

const MOUSE_MOVE_THRESHOLD = 10;
const DEFAULT_OPTION = {
  presetRatio: null,
  top: -10,
  left: -10,
  height: 1,
  width: 1,
};

/**
 * Cropper components
 * @param {Graphics} graphics - Graphics instance
 * @extends {Component}
 * @class Cropper
 * @ignore
 */
class Cropper extends Component {
  constructor(graphics) {
    super(componentNames.CROPPER, graphics);

    /**
     * Cropzone
     * @type {Cropzone}
     * @private
     */
    this._cropzone = null;

    /**
     * StartX of Cropzone
     * @type {number}
     * @private
     */
    this._startX = null;

    /**
     * StartY of Cropzone
     * @type {number}
     * @private
     */
    this._startY = null;

    /**
     * State whether shortcut key is pressed or not
     * @type {boolean}
     * @private
     */
    this._withShiftKey = false;

    /**
     * Listeners
     * @type {object.<string, function>}
     * @private
     */
    this._listeners = {
      keydown: this._onKeyDown.bind(this),
      keyup: this._onKeyUp.bind(this),
      mousedown: this._onFabricMouseDown.bind(this),
      mousemove: this._onFabricMouseMove.bind(this),
      mouseup: this._onFabricMouseUp.bind(this),
    };
  }

  /**
   * Start cropping
   */
  start() {
    if (this._cropzone) {
      return;
    }
    const canvas = this.getCanvas();

    canvas.forEachObject((obj) => {
      // {@link http://fabricjs.com/docs/fabric.Object.html#evented}
      obj.evented = false;
    });

    this._cropzone = new Cropzone(
      canvas,
      extend(
        {
          left: 0,
          top: 0,
          width: 0.5,
          height: 0.5,
          strokeWidth: 0, // {@link https://github.com/kangax/fabric.js/issues/2860}
          cornerSize: 10,
          cornerColor: 'black',
          fill: 'transparent',
        },
        CROPZONE_DEFAULT_OPTIONS,
        this.graphics.cropSelectionStyle
      )
    );

    canvas.discardActiveObject();
    canvas.add(this._cropzone);
    canvas.on('mouse:down', this._listeners.mousedown);
    canvas.selection = false;
    
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>
      <svg width="22px" height="22px" viewBox="0 0 22 22" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
          <title>ddd</title>
          <g id="1130" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
              <g id="dd" transform="translate(-775, -430)" fill="#2F2F46" fill-rule="nonzero" stroke="#FFFFFF" stroke-width="0.5">
                  <path d="M786.750006,430.75 L786.749908,434.79455 C788.176052,434.965136 789.454697,435.615862 790.419417,436.580583 C791.384137,437.545303 792.034864,438.823948 792.20545,440.250092 L796.25,440.249994 L796.25,441.749944 L792.205337,441.750853 C792.034555,443.1768 791.383757,444.45524 790.419045,445.41979 C789.454368,446.384305 788.175868,447.034886 786.749908,447.20545 L786.750006,451.25 L785.250056,451.25 L785.249147,447.205337 C783.823384,447.034577 782.54509,446.383924 781.580583,445.419417 C780.616076,444.45491 779.965423,443.176616 779.794663,441.750853 L775.75,441.749944 L775.75,440.249994 L779.79455,440.250092 C779.965114,438.824132 780.615695,437.545632 781.58021,436.580955 C782.54476,435.616243 783.8232,434.965445 785.249147,434.794663 L785.250056,430.75 L786.750006,430.75 Z M785.249017,441.750039 L781.308947,441.750657 C781.469428,442.761766 781.949058,443.666572 782.641243,444.358757 C783.333413,445.050927 784.238196,445.530552 785.249279,445.691043 L785.249017,441.750039 Z M790.691053,441.750657 L786.749039,441.750039 L786.749655,445.691212 C787.761002,445.530915 788.666047,445.051328 789.358416,444.359098 C790.050784,443.66687 790.530546,442.761932 790.691053,441.750657 Z M785.249279,436.308957 C784.23803,436.469474 783.333116,436.94923 782.640902,437.641584 C781.948686,438.333939 781.469105,439.23896 781.308798,440.250281 L785.249017,440.250017 Z M786.749655,436.308788 L786.749039,440.250017 L790.691202,440.250281 C790.530869,439.238794 790.051156,438.333642 789.358757,437.641243 C788.666344,436.948829 787.761168,436.469111 786.749655,436.308788 Z" id="ss"></path>
              </g>
          </g>
      </svg>
    `
    // 将 SVG 源码转换为 Base64 格式
    const base64 = btoa(svgString);
    canvas.defaultCursor = `url("data:image/svg+xml;base64,${base64}"),auto`;
    fabric.util.addListener(document, 'keydown', this._listeners.keydown);
    fabric.util.addListener(document, 'keyup', this._listeners.keyup);
  }

  /**
   * End cropping
   */
  end() {
    const canvas = this.getCanvas();
    const cropzone = this._cropzone;

    if (!cropzone) {
      return;
    }
    canvas.remove(cropzone);
    canvas.selection = true;
    canvas.defaultCursor = 'default';
    canvas.off('mouse:down', this._listeners.mousedown);
    canvas.forEachObject((obj) => {
      obj.evented = true;
    });

    this._cropzone = null;

    fabric.util.removeListener(document, 'keydown', this._listeners.keydown);
    fabric.util.removeListener(document, 'keyup', this._listeners.keyup);
  }

  /**
   * Change cropzone visible
   * @param {boolean} visible - cropzone visible state
   */
  changeVisibility(visible) {
    if (this._cropzone) {
      this._cropzone.set({ visible });
    }
  }

  /**
   * onMousedown handler in fabric canvas
   * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event
   * @private
   */
  _onFabricMouseDown(fEvent) {
    const canvas = this.getCanvas();

    if (fEvent.target) {
      return;
    }

    canvas.selection = false;
    const coord = canvas.getPointer(fEvent.e);

    this._startX = coord.x;
    this._startY = coord.y;

    canvas.on({
      'mouse:move': this._listeners.mousemove,
      'mouse:up': this._listeners.mouseup,
    });
  }

  /**
   * onMousemove handler in fabric canvas
   * @param {{target: fabric.Object, e: MouseEvent}} fEvent - Fabric event
   * @private
   */
  _onFabricMouseMove(fEvent) {
    const canvas = this.getCanvas();
    const pointer = canvas.getPointer(fEvent.e);
    const { x, y } = pointer;
    const cropzone = this._cropzone;

    if (Math.abs(x - this._startX) + Math.abs(y - this._startY) > MOUSE_MOVE_THRESHOLD) {
      canvas.remove(cropzone);
      cropzone.set(this._calcRectDimensionFromPoint(x, y, cropzone.presetRatio));

      canvas.add(cropzone);
      canvas.setActiveObject(cropzone);
    }
  }

  /**
   * Get rect dimension setting from Canvas-Mouse-Position(x, y)
   * @param {number} x - Canvas-Mouse-Position x
   * @param {number} y - Canvas-Mouse-Position Y
   * @param {number|null} presetRatio - fixed aspect ratio (width/height) of the cropzone (null if not set)
   * @returns {{left: number, top: number, width: number, height: number}}
   * @private
   */
  _calcRectDimensionFromPoint(x, y, presetRatio = null) {
    const canvas = this.getCanvas();
    const canvasWidth = canvas.getWidth();
    const canvasHeight = canvas.getHeight();
    const startX = this._startX;
    const startY = this._startY;
    let left = clamp(x, 0, startX);
    let top = clamp(y, 0, startY);
    let width = clamp(x, startX, canvasWidth) - left; // (startX <= x(mouse) <= canvasWidth) - left
    let height = clamp(y, startY, canvasHeight) - top; // (startY <= y(mouse) <= canvasHeight) - top

    if (this._withShiftKey && !presetRatio) {
      // make fixed ratio cropzone
      if (width > height) {
        height = width;
      } else if (height > width) {
        width = height;
      }

      if (startX >= x) {
        left = startX - width;
      }

      if (startY >= y) {
        top = startY - height;
      }
    } else if (presetRatio) {
      // Restrict cropzone to given presetRatio
      height = width / presetRatio;

      // If moving in a direction where the top left corner moves (ie. top-left, bottom-left, top-right)
      // the left and/or top values has to be changed based on the new height/width
      if (startX >= x) {
        left = clamp(startX - width, 0, canvasWidth);
      }

      if (startY >= y) {
        top = clamp(startY - height, 0, canvasHeight);
      }

      // Check if the new height is too large
      if (top + height > canvasHeight) {
        height = canvasHeight - top; // Set height to max available height
        width = height * presetRatio; // Restrict cropzone to given presetRatio based on the new height

        // If moving in a direction where the top left corner moves (ie. top-left, bottom-left, top-right)
        // the left and/or top values has to be changed based on the new height/width
        if (startX >= x) {
          left = clamp(startX - width, 0, canvasWidth);
        }

        if (startY >= y) {
          top = clamp(startY - height, 0, canvasHeight);
        }
      }
    }

    return {
      left,
      top,
      width,
      height,
    };
  }

  /**
   * onMouseup handler in fabric canvas
   * @private
   */
  _onFabricMouseUp() {
    const cropzone = this._cropzone;
    const listeners = this._listeners;
    const canvas = this.getCanvas();

    canvas.setActiveObject(cropzone);
    canvas.off({
      'mouse:move': listeners.mousemove,
      'mouse:up': listeners.mouseup,
    });
  }

  /**
   * Get cropped image data
   * @param {Object} cropRect cropzone rect
   *  @param {Number} cropRect.left left position
   *  @param {Number} cropRect.top top position
   *  @param {Number} cropRect.width width
   *  @param {Number} cropRect.height height
   * @returns {?{imageName: string, url: string}} cropped Image data
   */
  getCroppedImageData(cropRect) {
    const canvas = this.getCanvas();
    const containsCropzone = canvas.contains(this._cropzone);
    if (!cropRect) {
      return null;
    }

    if (containsCropzone) {
      canvas.remove(this._cropzone);
    }

    const imageData = {
      imageName: this.getImageName(),
      url: canvas.toDataURL(cropRect),
    };

    if (containsCropzone) {
      canvas.add(this._cropzone);
    }

    return imageData;
  }

  /**
   * Get cropped rect
   * @returns {Object} rect
   */
  getCropzoneRect() {
    const cropzone = this._cropzone;

    if (!cropzone.isValid()) {
      return null;
    }

    return {
      left: cropzone.left,
      top: cropzone.top,
      width: cropzone.width,
      height: cropzone.height,
    };
  }

  /**
   * Set a cropzone square
   * @param {number} [presetRatio] - preset ratio
   */
  setCropzoneRect(presetRatio) {
    const canvas = this.getCanvas();
    const cropzone = this._cropzone;

    canvas.discardActiveObject();
    canvas.selection = false;
    canvas.remove(cropzone);

    cropzone.set(presetRatio ? this._getPresetPropertiesForCropSize(presetRatio) : DEFAULT_OPTION);

    canvas.add(cropzone);
    canvas.selection = true;

    if (presetRatio) {
      canvas.setActiveObject(cropzone);
    }
  }

  /**
   * get a cropzone square info
   * @param {number} presetRatio - preset ratio
   * @returns {{presetRatio: number, left: number, top: number, width: number, height: number}}
   * @private
   */
  _getPresetPropertiesForCropSize(presetRatio) {
    const canvas = this.getCanvas();
    const originalWidth = canvas.getWidth();
    const originalHeight = canvas.getHeight();

    const standardSize = originalWidth >= originalHeight ? originalWidth : originalHeight;
    const getScale = (value, orignalValue) => (value > orignalValue ? orignalValue / value : 1);

    let width = standardSize * presetRatio;
    let height = standardSize;

    const scaleWidth = getScale(width, originalWidth);
    [width, height] = [width, height].map((sizeValue) => sizeValue * scaleWidth);

    const scaleHeight = getScale(height, originalHeight);
    [width, height] = [width, height].map((sizeValue) => fixFloatingPoint(sizeValue * scaleHeight));

    return {
      presetRatio,
      top: (originalHeight - height) / 2,
      left: (originalWidth - width) / 2,
      width,
      height,
    };
  }

  /**
   * Keydown event handler
   * @param {KeyboardEvent} e - Event object
   * @private
   */
  _onKeyDown(e) {
    if (e.keyCode === keyCodes.SHIFT) {
      this._withShiftKey = true;
    }
  }

  /**
   * Keyup event handler
   * @param {KeyboardEvent} e - Event object
   * @private
   */
  _onKeyUp(e) {
    if (e.keyCode === keyCodes.SHIFT) {
      this._withShiftKey = false;
    }
  }
}

export default Cropper;
