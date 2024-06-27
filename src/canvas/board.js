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
    /**  @type {HTMLElement} The container element to append the canvas to */
    this.container = container

    /** @type {number} 采样倍率*/
    this.magnification = 2

    // // 起始点位置
    // this.startX = 0
    // this.stateY = 0

    /** @type {image[]} 画布历史栈*/
    this.pathSegmentHistory = []
    this.index = 0

    /** @type {{x:number,y:number}[]} 鼠标位置*/
    this.points = []

    /** @type {PathProperty} 当前路径的所有属性*/
    this.pathProperty = new PathProperty()

    /** @type {PathProperty[]} 当前分组里的所有所有路径 */
    this.paths = []

    /** @type {number} 路径分组数量*/
    this.groupNum = 0

    /** @type {number} 当前分组序号*/
    this.groupNow = 0

    /** @type {string} 绘图模式 draw => 绘图   eraser => 橡皮擦   select => 选择*/
    this.mode = 'draw'

    /** @type {{x:number,y:number}[]} 二次贝塞尔曲线起点*/
    this.beginPoint

    // 创建画板控件
    this.createButtonList()

    /** @type {HTMLCanvasElement} The canvas element */
    this.canvas = this.createCanvas(container)

    this.createPathGroupList()

    /** @type {CanvasRenderingContext2D} 绘制工具*/
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })

    // 初始化画板
    this.init()
  }

  // 创建分组列表
  createPathGroupList() {
    const pathGroup = document.createElement('table')
    pathGroup.id = 'pathGroupList'
    pathGroup.setAttribute('style', 'display:flex;flex-direction:column;margin:0 0.625rem;table-layout:fixed;')
    const title = document.createElement('tr')
    title.textContent = '路径分组'
    title.setAttribute('style', 'width:10rem;margin-bottom: 0.625rem')
    pathGroup.appendChild(title)
    pathGroup.appendChild(this.createPathGroupButton())
    this.container.appendChild(pathGroup)
    document.getElementById('addPathGroup').click()
  }

  // 创建分组的“+”按钮
  createPathGroupButton() {
    const button = document.createElement('td')
    button.id = 'addPathGroup'
    button.textContent = '+'
    button.onclick = () => {
      this.groupNum++
      // 获取父元素
      const pathGroupList = document.getElementById('pathGroupList')
      // 添加新组
      pathGroupList.appendChild(this.createPathGroup())
      // 把按钮移动到最后
      pathGroupList.appendChild(button)
    }
    return button
  }

  // 创建新的分组
  createPathGroup() {
    let pathGroup = document.createElement('td')
    pathGroup.id = this.groupNum
    pathGroup.textContent = 'group' + pathGroup.id
    pathGroup.setAttribute(
      'style',
      'width:10rem;margin-bottom: 0.625rem;text-overflow: ellipsis;white-space: nowrap;overflow: hidden;'
    )
    this.groupNow = this.groupNum

    let isEditing = false // 标记是否正在编辑

    // 双击事件处理函数
    const handleDoubleClick = () => {
      let originalText = pathGroup.textContent // 保存原始文本
      if (isEditing) return // 如果正在编辑,则不做任何操作

      isEditing = true // 设置编辑状态为true

      // 创建一个输入框,用于输入新名称
      const input = document.createElement('input')
      input.value = originalText // 设置输入框的初始值为原始文本
      input.maxLength = 10 // 设置输入框的最大长度为20
      input.setAttribute('style', 'width:6.25rem;height:1.5rem')
      pathGroup.textContent = '' // 清空元素的文本内容
      pathGroup.appendChild(input) // 将输入框添加到元素中

      // 输入框获取焦点
      input.focus()

      // 监听输入框的blur事件(失去焦点)
      input.addEventListener('blur', () => {
        isEditing = false // 设置编辑状态为false
        pathGroup.textContent = input.value // 将输入框的值设置为元素的文本内容
        // pathGroup.removeChild(input) // 移除输入框
      })

      // 监听输入框的keydown事件(按下回车键)
      input.addEventListener('keydown', (event) => {
        if (event.key == 'Enter') {
          isEditing = false // 设置编辑状态为false
          pathGroup.textContent = input.value // 将输入框的值设置为元素的文本内容
          // pathGroup.removeChild(input) // 移除输入框
        }
      })
    }

    // 为元素添加双击事件监听器
    pathGroup.ondblclick = handleDoubleClick
    pathGroup.onclick = () => {
      // 选中当前分组
      this.groupNow = pathGroup.id
      // 选中当前分组的所有路径
      this.redrawPaths((i) => this.paths[i].groupId == pathGroup.id)
    }
    return pathGroup
  }

  // 创建画布
  createCanvas(container) {
    container.style.display = 'flex'
    // 创建画板
    const canvas = document.createElement('canvas')
    // 超采样（以两倍的尺寸绘制，提高绘制精度，降低锯齿）
    canvas.width = container.clientWidth * this.magnification
    canvas.height = container.clientHeight * this.magnification
    canvas.style.display = 'block'
    canvas.style.backgroundColor = 'antiquewhite'
    container.appendChild(canvas)
    return canvas
  }

  createButtonList() {
    // 创建画板相关控件
    const buttonList = document.createElement('div')
    buttonList.style.display = 'flex'
    buttonList.style.flexDirection = 'column'
    this.container.appendChild(buttonList)
    // 画笔
    const draw = document.createElement('button')
    draw.textContent = 'draw'
    draw.style.margin = '0.625rem 0.625rem'
    draw.onclick = () => {
      this.mode = 'draw'
      console.log(this.mode)
    }
    buttonList.appendChild(draw)
    // 选择
    const select = document.createElement('button')
    select.textContent = 'select'
    select.style.margin = '0.625rem 0.625rem'
    select.onclick = () => {
      this.mode = 'select'
      console.log(this.mode)
    }
    buttonList.appendChild(select)
    // 橡皮擦
    const eraser = document.createElement('button')
    eraser.textContent = 'eraser'
    eraser.style.margin = '0.625rem 0.625rem'
    eraser.onclick = () => {
      this.mode = 'eraser'
      console.log(this.mode)
    }
    buttonList.appendChild(eraser)

    // 撤销
    const undo = document.createElement('button')
    undo.textContent = 'undo'
    undo.style.margin = '0.625rem 0.625rem'
    undo.onclick = () => {
      this.undo()
    }
    buttonList.appendChild(undo)

    // 恢复
    const redo = document.createElement('button')
    redo.textContent = 'redo'
    redo.style.margin = '0.625rem 0.625rem'
    redo.onclick = () => {
      this.redo()
    }
    buttonList.appendChild(redo)
  }

  // 初始化
  init() {
    this.addPathSegment()
    this.setContext2DStyle()
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault())
    this.canvas.addEventListener('mousedown', this.mousedownEvent.bind(this))
    this.canvas.addEventListener('mousemove', this.mousemoveEvent.bind(this))
    this.canvas.addEventListener('mouseup', this.mouseupEvent.bind(this))
    // this.canvas.addEventListener('mouseout', this.mouseupEvent.bind(this))
    this.canvas.addEventListener('click', this.clickEvent.bind(this)) // 添加点击事件监听器
    window.document.addEventListener('keydown', this.keydownEvent.bind(this))
  }

  // 设置画笔样式
  setContext2DStyle(mode) {
    if (!mode || mode == 'draw') {
      this.ctx.strokeStyle = 'red'
      this.ctx.lineWidth = 10
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'
      this.ctx.shadowBlur = null
      this.ctx.shadowColor = null
      this.ctx.shadowOffsetX = null
      this.ctx.shadowOffsetY = null
    }
    if (mode == 'select') {
      this.ctx.strokeStyle = 'green'
      this.ctx.lineWidth = 10
      this.ctx.lineCap = 'round'
      this.ctx.lineJoin = 'round'
      this.ctx.shadowBlur = 15
      this.ctx.shadowColor = 'green'
      this.ctx.shadowOffsetX = 0
      this.ctx.shadowOffsetY = 0
    }
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

  /**
   * 鼠标按下事件
   * @param {MouseEvent} e
   */
  mousedownEvent(e) {
    // 绘图模式下
    if (this.mode == 'draw') {
      const { x, y } = this.getPos(e)
      this.points.push(x, y)
      // 二次贝塞尔曲线起点
      this.beginPoint = { x, y }
      this.mode = 'drawStart'
      this.pathProperty = new PathProperty()
    }
  }

  /**
   * 鼠标移动事件
   * @param {MouseEvent} e
   */
  mousemoveEvent(e) {
    // 绘图模式下
    if (this.mode == 'drawStart') {
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
        this.drawNewPath(this.beginPoint, controlPoint, endPoint)
        // 更新起点
        this.beginPoint = endPoint
      }
    } else if (this.mode == 'select') {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      let temp = this.getPos(e)
      this.redrawPaths((i) => this.ctx.isPointInStroke(this.paths[i].path2D, temp.x, temp.y) || this.paths[i].isTouched)
    }
  }

  /**
   * 鼠标抬起事件
   */
  mouseupEvent() {
    if (this.mode == 'drawStart') {
      this.paths.push(this.pathProperty)
      this.ctx.closePath()
      this.mode = 'draw'
      // 保存历史
      this.addPathSegment()
    }
  }

  /**
   * 点击事件
   *
   * @returns
   */
  clickEvent(e) {
    if (this.mode == 'select') {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      for (let i = this.paths.length - 1; i >= 0; i--) {
        let temp = this.getPos(e)
        if (this.ctx.isPointInStroke(this.paths[i].path2D, temp.x, temp.y)) {
          this.paths[i].isTouched = !this.paths[i].isTouched
        }
        if (this.paths[i].isTouched) {
          this.setContext2DStyle('select')
          this.ctx.stroke(this.paths[i].path2D)
        } else {
          this.setContext2DStyle()
          this.ctx.stroke(this.paths[i].path2D)
        }
      }
      // 保存历史
      this.addPathSegment()
    }
  }

  /**
   * 绘制路径
   * @param {{x,y}} beginPoint
   * @param {{x,y}} controlPoint
   * @param {{x,y}} endPoint
   */
  drawNewPath(beginPoint, controlPoint, endPoint) {
    const ctx = this.ctx
    this.setContext2DStyle()
    this.pathProperty.path2D.moveTo(beginPoint.x, beginPoint.y)
    this.pathProperty.path2D.quadraticCurveTo(controlPoint.x, controlPoint.y, endPoint.x, endPoint.y)
    this.pathProperty.groupId = this.groupNow
    // ctx.fill(this.pathProperty.path2D)
    ctx.stroke(this.pathProperty.path2D)
  }

  /**
   * 重绘满足条件的路径
   *
   * @param {function(number): boolean} fun 条件判断函数
   */
  redrawPaths(fun) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (let i = 0; i < this.paths.length; i++) {
      if (fun(i)) {
        this.paths[i].isTouched = !this.paths[i].isTouched
      }
      if (this.paths[i].isTouched) {
        this.setContext2DStyle('select')
        this.ctx.stroke(this.paths[i].path2D)
      } else {
        this.setContext2DStyle()
        this.ctx.stroke(this.paths[i].path2D)
      }
    }
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

class PathProperty {
  constructor() {
    this.path2D = new Path2D()
    this.isTouched = false
    this.groupId = null
  }
}
