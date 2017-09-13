const io = require('socket.io-client');
const CanvasImage = require('./image');
const { getMousePos } = require('./utils');

const colors = require('./colors');


function App() {
  this.config = {
    colors: colors[2]
  };
  this.images = [];
  this.keysDown = [];
  this.isResizing = false;
  this.isMoving = false;
  this.resizeStart = { x: 0, y: 0 };
  this.moveStart = { x: 0, y: 0 };

  this.initialize = (element) => {
    this.current = { x: 0, y: 0, color: this.config.colors[0], size: 25 };

    const { canvas, toolbar } = this.createDOM();
    this.element = element;
    this.element.appendChild(toolbar);
    this.element.appendChild(canvas);
    this.socket = io();

    this.canvas = document.querySelector('.whiteboard');
    this.colors = document.querySelectorAll('.color');
    this.lineWidthRange = document.querySelector('.line-width');
    this.lineWidthDisplay = document.querySelector('.circle');
    this.clearButton = document.querySelector('button#clear');
    this.uploadButton = document.querySelector('button#upload');
    this.downloadButton = document.querySelector('button#download');

    this.ctx = this.canvas.getContext('2d');

    this.drawing = false;

    // mouse event listeners
    ['mousedown', 'mouseup', 'mouseout', 'mousemove'].forEach(evt => this.canvas.addEventListener(evt, this.handleLocalEvents));

    // touch event listeners
    ['touchstart', 'touchmove', 'touchcancel', 'touchend', 'touchcancel'].forEach(evt => this.canvas.addEventListener(evt, this.touchEventHandler, { passive: true }));

    // key event listeners
    ['keydown', 'keyup'].forEach(ev => window.addEventListener(ev, this.handleKeyEvents));

    this.colors.forEach(color => {
      color.style.backgroundColor = color.dataset.color;
      color.addEventListener('click', this.updateColor);
    });

    this.lineWidthRange.addEventListener('input', this.updateLineWidth);
    this.uploadButton.addEventListener('click', this.displayUploadForm);
    this.clearButton.addEventListener('click', this.clearEventHandler);
    this.downloadButton.addEventListener('click', this.downloadEventHandler);


    this.socket.on('drawing', this.onDrawingEvent);
    this.socket.on('history', this.onCanvasHistory);
    this.socket.on('clear', () => this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height));
    this.socket.on('image:fetch', ({ id }) => this.fetchImage(id));
    this.socket.on('image:update', ({ image }) => this.handleImageUpdate(image));
    window.addEventListener('resize', this.onResize);
    this.onResize();

    this.setStyles();
  }
  this.setStyles = () => {
    this.ctx.fillStyle = '#222';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.fillStyle = 'solid';
    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 10;
    this.ctx.lineJoin = 'round';
    this.ctx.lineCap = 'round';
  }
  this.createDOM = () => {
    const canvas = this.createElement('canvas', { classes: ['whiteboard'] });
    const toolbar = this.createElement('div', { classes: ['toolbar'] });
    const lineWidthContainer = this.createElement('div', { classes: ['line-width-container'] });
    const lineWidthRange = this.createElement('input', { classes: ['line-width'], attribs: [{ name: 'type', value: 'range' }, { name: 'min', value: 1 }, { name: 'max', value: 50 }, { name: 'step', value: 1 }, { name: 'value', value: this.current.size }] });
    const circleContainer = this.createElement('div', { classes: ['circle-container'] });
    const circle = this.createElement('span', { classes: ['circle'] });
    circle.style.width = lineWidthRange.value + 'px';
    circle.style.height = lineWidthRange.value + 'px';
    lineWidthContainer.appendChild(lineWidthRange);
    circleContainer.appendChild(circle);
    lineWidthContainer.appendChild(circleContainer);
    const colors = this.createElement('div', { classes: ['colors'] });
    this.config.colors.forEach(color => {
      let el = this.createElement('div', { classes: ['color'], attribs: [{ name: 'data-color', value: color }] });
      colors.appendChild(el);
    });
    colors.children[0].classList.add('active');

    // const uploadButton = this.createElement('button', { id: 'upload', text: 'Upload Image' });
    const clearButton = this.createElement('button', { id: 'clear', text: 'Clear' });

    toolbar.appendChild(lineWidthContainer);
    toolbar.appendChild(colors);
    // toolbar.appendChild(uploadButton);
    toolbar.appendChild(clearButton);

    return {
      canvas,
      toolbar
    }
  }
  this.createElement = (tag, options) => {
    const el = document.createElement(tag);
    if (options.id) {
      el.id = options.id;
    }
    if (options.classes) {
      options.classes.forEach(className => el.classList.add(className));
    }
    if (options.attribs) {
      options.attribs.forEach(attrib => {
        el.setAttribute(attrib.name, attrib.value);
      });
    }
    if (options.text) {
      el.textContent = options.text;
    }
    return el;
  }
  this.downloadEventHandler = (event) => {
    const a = document.createElement('a');
    a.href = this.canvas.toDataURL();
    a.download = `awesome_sauce.png`;
    const evt = new MouseEvent('click');
    a.dispatchEvent(evt);
  }
  this.updateLineWidth = (event) => {
    let size = event.target.value;
    this.lineWidthDisplay.style.width = size + 'px';
    this.lineWidthDisplay.style.height = size + 'px';
    this.current.size = size;
  }
  this.clearCanvas = () => {
    this.socket.emit('clear');
  }
  this.clearEventHandler = (e) => {
    this.socket.emit('history:clear');
    this.clearCanvas();
  }
  this.onCanvasHistory = (history) => {
    history.forEach(item => {
      this.onDrawingEvent(item);
    });
  }
  this.updateColor = (e) => {
    document.querySelector('.color.active').classList.remove('active');
    e.target.classList.add('active');
    this.current.color = e.target.dataset.color;
    this.lineWidthDisplay.style.backgroundColor = e.target.dataset.color;
  }
  this.getMousePos = (e) => getMousePos(this.canvas, e);
  this.drawLine = (x0, y0, x1, y1, color, size, emit) => {
    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = size;
    this.ctx.strokeStyle = color;
    this.ctx.moveTo(x0, y0);
    this.ctx.lineTo(x1, y1);
    this.ctx.stroke();
    this.ctx.closePath();

    if (!emit) return;
    const { w, h } = this.getCanvasDimensions();
    this.socket.emit('drawing', {
      x0: x0 / w,
      y0: y0 / h,
      x1: x1 / w,
      y1: y1 / h,
      color,
      size
    });
  }
  this.handleLocalEvents = (e) => {
    if (this.keysDown.length) {
      this.handleKeysDownMouseEvent(e);
    } else {
      this.mouseEventHandler(e);
    }
  }
  this.mouseEventHandler = (e) => {
    const coords = this.getMousePos(e);
    switch (e.type) {
      case 'mousedown':
        this.drawing = true;
        this.current.x = coords.x;
        this.current.y = coords.y;
        this.drawLine(this.current.x, this.current.y, this.current.x, this.current.y, this.current.color, this.current.size, true);
        break;
      case 'mousemove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      default: // mouseup and mouseout
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        break;
    }
  }
  this.getTouchPos = (touch) => {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    }
  }
  this.touchEventHandler = (e) => {
    e.preventDefault();
    if (e.targetTouches.length !== 1) return;
    const coords = this.getTouchPos(e.targetTouches[0]);
    switch (e.type) {
      case 'touchstart':
        this.drawing = true;
        this.current.x = coords.x;
        this.current.y = coords.y;
        this.drawLine(this.current.x, this.current.y, this.current.x, this.current.y, this.current.color, this.current.size, true);
        break;
      case 'touchmove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      default:
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, true);
        break;
    }
  }
  this.onDrawingEvent = (data) => {
    const { w, h } = this.getCanvasDimensions();
    this.drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size);
  }
  this.onResize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.socket.emit('resize');
  }
  this.throttle = (callback, delay) => {
    let previousCall = new Date().getTime();
    return function() {
      let time = new Date().getTime();
      if ((time - previousCall) >= delay) {
        previousCall = time;
        callback.apply(null, arguments);
      }
    }
  }
  this.fetchImage = (id) => {
    const image = new Image();
    fetch(`/api/images/${id}`)
      .then(res => res.blob())
      .then(img => {
        this.image = new CanvasImage(img, this.ctx);
        this.images.push({ id, ...this.image });
        this.image.image.addEventListener('load', () => this.image.display());
      });
  }
  this.displayImage = () => {
    this.socket.emit('image:display', ({ image: this.image }));
  }
  this.handleKeyEvents = (e) => {
    if (e.target.tagName === 'INPUT') return;
    if (e.type === 'keydown') {
      if (!this.keysDown.includes(e.keyCode)) this.keysDown.push(e.keyCode);
    } else if (e.type === 'keyup') {
      this.keysDown.splice(this.keysDown.indexOf(e.keyCode), 1);
    } else {
      console.log(e);
    }
  }
  this.displayUploadForm = () => {
    this.toggleUploadContainerVisibility();

    const submitButton = document.querySelector('input#upload');

    submitButton.addEventListener('click', this.handleUpload);

    const cancelButton = document.querySelector('button#cancel-upload');
    cancelButton.addEventListener('click', (e) => this.cancelUpload());
  }
  this.handleUpload = (e) => {
    e.preventDefault();
    const formData = new FormData(document.querySelector('form#upload-form'));
    fetch('/api/image', {
        method: 'POST',
        body: formData
      })
      .then(res => res.json())
      .then(res => {
        this.toggleUploadContainerVisibility();
        this.fetchImage(res.id);
        this.socket.emit('image:fetch', { id: res.id });
      })
      .catch(err => console.log(err));
  }
  this.toggleUploadContainerVisibility = () => {
    const uploadContainer = document.querySelector('.upload-container');
    uploadContainer.classList.toggle('hidden');
  }
  this.cancelUpload = () => {
    this.toggleUploadContainerVisibility();
  }
  this.handleImageUpdate = ({ x, y, newWidth, newHeight }) => {
    this.image.x = x;
    this.image.y = y;
    this.image.newWidth = newWidth;
    this.image.newHeight = newHeight;
    this.image.display();
    this.socket.emit('history:fetch');
  }
  this.handleKeysDownMouseEvent = (e) => {
    if (this.keysDown.includes(91)) {
      if (e.type === 'mousedown') {
        this.isMoving = true;
        this.moveStart = getMousePos(this.canvas, e);
      } else if (e.type === 'mouseup' || e.type === 'mouseout') {
        this.isMoving = false;
      } else {
        if (!this.isMoving) return;
        const { x, y } = getMousePos(this.canvas, e);
        this.offset = this.image.getTopLeftOffset(x, y);
        this.handleImageMove(x, y);
      }
    } else if (this.keysDown.includes(16)) {
      if (e.type === 'mousedown') {
        this.isResizing = true;
        this.resizeStart = getMousePos(this.canvas, e);
      } else if (e.type === 'mouseup' || e.type === 'mouseout') {
        this.isResizing = false;
      } else {
        if (!this.isResizing) return;
        const { x, y } = getMousePos(this.canvas, e);
        this.handleImageResize(x, y);
      }
    } else {
      console.log(e);
    }
  }
  this.handleImageResize = (x, y) => {
    const dWidth = x - this.resizeStart.x;
    const dHeight = y - this.resizeStart.y;
    this.image.updateImageSize(dWidth, dHeight);
    this.resizeStart = { x, y };
    this.clearCanvas();
    const updated = {
      x: this.image.x,
      y: this.image.y,
      newWidth: this.image.newWidth,
      newHeight: this.image.newHeight
    };
    this.socket.emit('image:update', { image: updated })
  }
  this.handleImageMove = (x, y) => {
    const newX = x - this.moveStart.x;
    const newY = y - this.moveStart.y;
    this.image.updateImagePosition(newX, newY);
    this.moveStart = { x, y };
    this.clearCanvas();
    const updated = {
      x: this.image.x,
      y: this.image.y,
      newWidth: this.image.newWidth,
      newHeight: this.image.newHeight
    };
    this.socket.emit('image:update', { image: updated });
  }
  this.getCanvasDimensions = () => ({ w: this.canvas.width, h: this.canvas.height })
}

module.exports = App;
