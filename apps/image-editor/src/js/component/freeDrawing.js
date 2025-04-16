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
    this.pencilBrush = null;
    this.patternBrush = null;

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
    console.log('drawingsetting',setting);
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
    const canvas =  this.getCanvas()
    if(!this.pencilBrush){
      this.pencilBrush = new fabric.PencilBrush(canvas)
    }

    canvas.freeDrawingBrush = this.pencilBrush;
   
    const brush = canvas.freeDrawingBrush;

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
    
    const canvas = this.getCanvas();
    canvas.selection = false;
    canvas.isDrawingMode = true;

    if(!this.patternBrush){
      this.setPatternBrush()
    }
   
    canvas.freeDrawingBrush = this.patternBrush;
    canvas.freeDrawingBrush.width=setting.width
  }

  setPatternBrush() {

    const canvas = this.getCanvas();
    
    const ctx = canvas.contextContainer;
    const originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    console.log(originalImageData)

    let mosaicImageData = this.toMosaicImageData(originalImageData);


    const patternCanvas = fabric.document.createElement('canvas'); 
    const patternCtx  = patternCanvas.getContext('2d');
    patternCanvas.width = canvas.width
    patternCanvas.height = canvas.height
    patternCtx.putImageData(mosaicImageData,0,0)

    var patternBrush = new fabric.PatternBrush(canvas);
    patternBrush.source = patternCanvas;

    this.patternBrush  = patternBrush
   
  }

  toMosaicImageData(imageData) {
		// 定义马赛克方格大小（越大越模糊）
		const suquareSize = 50;
		let data = imageData.data;
    const canvas ={ width:imageData.width,height:imageData.height}
		//首先根据宽高遍历整个图片获取到对应的方格
		for (let i = 0; i < canvas.height; i += suquareSize) {
			for (let j = 0; j < canvas.width; j += suquareSize) {
				let totalR = 0;
				let totalG = 0;
				let totalB = 0;
				let totalA = 0;
				let count = 0;
				//遍历当前方格的每个像素将其RGBA值累加起来
				for (let y = i; y < i + suquareSize && y < canvas.height; y++) {
					for (let x = j; x < j + suquareSize && x < canvas.width; x++) {
						//y * canvas.width + x就能计算出当前像素在整个图片中的索引
						//再乘以4是因为imageData.data每个像素用4个值表示
						//pixelIndex就是当前像素在imageData.data的起始索引也就是它的R值
						let pixelIndex = (y * canvas.width + x) * 4;
						totalR += data[pixelIndex];
						totalG += data[pixelIndex + 1];
						totalB += data[pixelIndex + 2];
						totalA += data[pixelIndex + 3];
						count++;
					}
				}
				let avgR = totalR / count;
				let avgG = totalG / count;
				let avgB = totalB / count;
				let avgA = totalA / count;
				// 遍历的逻辑与上面一模一样，这一步是将方格内的每个像素的RGBA值替换为平均值
				for (let y = i; y < i + suquareSize && y < canvas.height; y++) {
					for (let x = j; x < j + suquareSize && x < canvas.width; x++) {
						let pixelIndex = (y * canvas.width + x) * 4;
						data[pixelIndex] = avgR;
						data[pixelIndex + 1] = avgG;
						data[pixelIndex + 2] = avgB;
						data[pixelIndex + 3] = avgA;
					}
				}
			}
		}
		return imageData;
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
    //this.imageEditor.invoke('addImageObject', imgUrl);
   this.imageEditor.addImageObject(imgUrl)
    console.log(this.imageEditor)
    const canvas = this.getCanvas();
    canvas.off({
      'mouse:move': this._handlers.mousemove,
      'mouse:up': this._handlers.mouseup,
    });
  }
}

export default FreeDrawing;
