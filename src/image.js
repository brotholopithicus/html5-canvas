class CanvasImage {
  constructor(source, ctx) {
    this.source = source;
    this.ctx = ctx;
    this.initialize();
  }
  initialize() {
    this.image = new Image();
    this.image.onload = (e) => this.setProps(e.target);
    this.image.src = URL.createObjectURL(this.source);
  }
  display() {
    this.ctx.drawImage(this.image, 0, 0, this.width, this.height, this.x, this.y, this.newWidth, this.newHeight);
  }
  drawAnchors(r = 6) {
    const [x1, y1, x2, y2] = [this.x, this.y, this.x + this.width, this.y + this.height];
    const anchors = [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y2 },
      { x: x2, y: y2 }
    ];
    anchors.forEach(({ x, y }) => {
      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, 2 * Math.PI, false);
      this.ctx.fillStyle = 'green';
      this.ctx.fill();
    });
  }
  updateImageSize(dWidth, dHeight) {
    this.updateProps({ newWidth: this.newWidth + dWidth, newHeight: this.newHeight + dHeight });
  }
  updateImagePosition(dx, dy) {
    this.updateProps({ x: this.x + dx, y: this.y + dy });
  }
  updateProps(props) {
    for (let key in props) {
      this[key] = props[key];
    }
  }
  setProps(target) {
    const { width, height, x, y } = target;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.newWidth = width;
    this.newHeight = height;
  }
  getTopLeftOffset(mouseX, mouseY) {
    const { x, y } = this;
    return {
      x: mouseX - x,
      y: mouseY - y
    }
  }
}

module.exports = CanvasImage;
