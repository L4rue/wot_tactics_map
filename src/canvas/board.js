export default class BoardCanvas {
  /**
   * Constructs a BoardCanvas instance with the provided container element.
   * The BoardCanvas manages a canvas element for drawing, including handling
   * mouse and keyboard events, setting the canvas size and styles, and
   * maintaining a history of drawing path segments.
   *
   * @param {HTMLElement} container - The container element to append the canvas to.
   */
  constructor(container) {
    // 采样倍率
    this.magnification = 2
    /**  @type {HTMLElement} The container element to append the canvas to */
    this.container = container
    /** @type {HTMLCanvasElement} The canvas element */
    this.canvas = this.createCanvas(container)
    // 绘制工具
    this.ctx = this.canvas.getContext('2d')
    // 起始点位置
    this.startX = 0
    this.stateY = 0
    // 画布历史栈
    this.pathSegmentHistory = []
    this.index = 0
    // 存储鼠标位置
    this.points = []
    // 存储当前路径
    this.linePath
    // 存储所有路径
    this.paths = []
    // 模式  pen => 绘图   eraser => 橡皮擦   choose => 选择
    this.mode = 'pen'
    // 二次贝塞尔曲线起点
    this.beginPoint
    // 初始化
    this.init()
  }

  // 创建画布
  createCanvas(container) {
    const canvas = document.createElement('canvas')
    // 超采样（以两倍的尺寸绘制，提高绘制精度，降低锯齿）
    canvas.width = container.clientWidth * this.magnification
    canvas.height = container.clientHeight * this.magnification
    canvas.style.display = 'block'
    canvas.style.backgroundColor = 'antiquewhite'
    container.appendChild(canvas)
    return canvas
  }

  // 初始化
  init() {
    this.addPathSegment()
    this.setContext2DStyle()
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    this.canvas.addEventListener('mousedown', this.mousedownEvent.bind(this))
    this.canvas.addEventListener('mousemove', this.mousemoveEvent.bind(this))
    this.canvas.addEventListener('mouseup', this.mouseupEvent.bind(this))
    this.canvas.addEventListener('mouseout', this.mouseupEvent.bind(this))
    this.canvas.addEventListener('click', this.clickEvent.bind(this)) // 添加点击事件监听器
    window.document.addEventListener('keydown', this.keydownEvent.bind(this))
  }

  // 设置画笔样式
  setContext2DStyle() {
    this.ctx.strokeStyle = '#EB7347'
    this.ctx.lineWidth = 2
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
  }

  /**
   * 获取坐标
   * @param {MouseEvent} evt
   * @returns
   */
  getPos(evt) {
    return {
      // 两倍尺寸绘制，所以偏移也是两倍
      x: evt.offsetX * this.magnification,
      y: evt.offsetY * this.magnification
    }
  }

  // // 闭包写法，扩展起来过于复杂，重写！
  // // 鼠标事件
  // mousedownEvent(e) {
  //   const that = this
  //   const { x, y } = this.getPos(e)
  //   this.points.push(x, y)
  //   // 二次贝塞尔曲线起点
  //   that.beginPoint = { x, y }

  //   this.canvas.onmousemove = function (e) {
  //     that.points.push(that.getPos(e))
  //     if (that.points.length >= 3) {
  //       const lastTwoPoints = that.points.slice(-2)
  //       // 二次贝塞尔曲线控制点
  //       const controlPoint = lastTwoPoints[0]
  //       // 二次贝塞尔曲线终点
  //       const endPoint = {
  //         x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
  //         y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2
  //       }

  //       let path = that.drawLine(that.beginPoint, controlPoint, endPoint, null, '#ff0000')
  //       that.paths.push(path)
  //       // 更新起点
  //       that.beginPoint = endPoint
  //     }
  //   }
  //   this.canvas.onmouseup = this.canvas.onmouseout = function () {
  //     // 保存历史
  //     that.addPathSegment()
  //     this.onmousemove = null
  //     this.onmouseup = null
  //     this.onmouseout = null
  //   }
  // }

  mousedownEvent(e) {
    // 绘图模式下
    if (this.mode === 'pen') {
      const { x, y } = this.getPos(e)
      this.points.push(x, y)
      // 二次贝塞尔曲线起点
      this.beginPoint = { x, y }
      this.mode = 'penStart'
      this.linePath = new Path2D()
    }
  }

  mousemoveEvent(e) {
    // 绘图模式下
    if (this.mode == 'penStart') {
      this.points.push(this.getPos(e))
      if (this.points.length >= 3) {
        const lastTwoPoints = this.points.slice(-2)
        // 二次贝塞尔曲线控制点
        const controlPoint = lastTwoPoints[0]
        // 二次贝塞尔曲线终点
        const endPoint = {
          x: (lastTwoPoints[0].x + lastTwoPoints[1].x) / 2,
          y: (lastTwoPoints[0].y + lastTwoPoints[1].y) / 2
        }
        this.ctx.beginPath()
        this.drawLine(this.beginPoint, controlPoint, endPoint, null, '#ff0000')
        // 更新起点
        this.beginPoint = endPoint
      }
    }
  }

  mouseupEvent() {
    this.paths.push(this.linePath)
    if (this.mode == 'penStart') {
      this.ctx.closePath()
      this.mode = 'pen'
    }
    // 保存历史
    this.addPathSegment()
    this.onmousemove = null
    this.onmouseup = null
    this.onmouseout = null
  }

  /**
   * 点击事件
   *
   * @returns
   */
  clickEvent() {
    // if (this.mode === 'pen') {
    // for (let i = this.paths.length - 1; i >= 0; i--) {
    //   this.drawLine(null, null, null, this.paths[i], 'green')
    // }
    // }
  }

  /**
   * 绘制路径
   * @param {{x,y}} beginPoint
   * @param {{x,y}} controlPoint
   * @param {{x,y}} endPoint
   * @param {Path2D} path
   * @param {String} color
   * @returns {Path2D}
   */
  drawLine(beginPoint, controlPoint, endPoint, path, color) {
    const ctx = this.ctx
    ctx.strokeStyle = color
    if (!path) {
      this.linePath.moveTo(beginPoint.x, beginPoint.y)
      this.linePath.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)
    }
    // ctx.fill(this.linePath)
    ctx.stroke(this.linePath)
    return path
  }

  // 键盘事件
  keydownEvent(e) {
    if (!e.ctrlKey) return
    switch (e.keyCode) {
      case 90:
        this.undo()
        break
      case 89:
        this.redo()
        break
    }
  }

  // 添加路径片段
  addPathSegment() {
    const data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height)
    // 删除当前索引后的路径片段，然后追加一个新的路径片段，更新索引
    this.pathSegmentHistory.splice(this.index + 1)
    this.pathSegmentHistory.push(data)
    this.index = this.pathSegmentHistory.length - 1
  }

  // 撤销
  undo() {
    if (this.index <= 0) return
    this.index--
    this.ctx.putImageData(this.pathSegmentHistory[this.index], 0, 0)
  }
  // 恢复
  redo() {
    if (this.index >= this.pathSegmentHistory.length - 1) return
    this.index++
    this.ctx.putImageData(this.pathSegmentHistory[this.index], 0, 0)
  }
}
