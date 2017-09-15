class CanvasImage {
  constructor(source, ctx, id) {
    this.source = source;
    this.ctx = ctx;
    this.id = id;
    this.anchorRadius = 8;
    this.selected = false;
    this.initialize();
  }
  initialize() {
    this.image = new Image();
    this.image.addEventListener('load', this.imageLoadEvtListener.bind(this))
    this.image.src = URL.createObjectURL(this.source);
  }
  display() {
    this.ctx.drawImage(this.image, 0, 0, this.image.width, this.image.height, this.x, this.y, this.width, this.height);
    if (this.selected) {
      this.ctx.strokeStyle = '#ff7300';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(this.x, this.y, this.width, this.height);
      this.drawAnchors();
    }
  }
  imageLoadEvtListener(e) {
    this.setProps(e.target);
    this.image.removeEventListener('load', this.imageLoadEvtListener);
  }
  get anchors() {
    const [x1, y1, x2, y2] = [this.x, this.y, this.x + this.width, this.y + this.height];
    return [
      { x: x1, y: y1 },
      { x: x1, y: y2 },
      { x: x2, y: y1 },
      { x: x2, y: y2 }
    ]
  }
  drawAnchors() {
    this.anchors.forEach(({ x, y }) => {
      this.ctx.save();
      this.ctx.fillStyle = '#ff7300';
      this.ctx.beginPath();
      this.ctx.arc(x, y, this.anchorRadius, 0, 2 * Math.PI, false);
      this.ctx.fill();
      this.ctx.restore();
    });
  }
  setProps(target) {
    const { width, height, x, y } = target;
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }
}

module.exports = CanvasImage;
