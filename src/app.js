const io = require('socket.io-client');
const CanvasImage = require('./image');
const { getMousePos } = require('./utils');

function App() {
  this.images = [];
  this.keysDown = [];
  this.initialize = (element) => {
    this.socket = io();
    this.addSocketListeners();
    this.createCanvas(element);
    this.chatSetup();
    this.connections = document.querySelector('#connections');
    window.addEventListener('resize', this.onResize);
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
  this.createCanvas = (element) => {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight * 0.7;

    element.insertBefore(this.canvas, document.querySelector('.chat'));

    this.isDrawing = false;
    this.isRemoteDrawing = false;
    this.lastX = 0;
    this.lastY = 0;

    this.isResizing = false;
    this.isMoving = false;
    this.resizeStart = { x: 0, y: 0 };
    this.moveStart = { x: 0, y: 0 };
    this.canvasOffset = this.getCanvasOffset();
    this.setStyles();
    this.setCanvasListeners();
    this.initElementLifecycle();
  }
  this.getCanvasOffset = () => {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: rect.left,
      y: rect.top
    }
  }
  this.redrawImages = () => {
    this.images.forEach(img => this.displayImage(img.image, img.coords.x, img.coords.y));
  }
  this.displayImage = () => {
    this.socket.emit('image:display', ({ image: this.image }));
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
  this.setCanvasListeners = () => {
    ['mousedown', 'mousemove', 'mouseup', 'mouseout'].forEach(ev => this.canvas.addEventListener(ev, this.handleLocalEvents));
    ['keydown', 'keyup'].forEach(ev => window.addEventListener(ev, this.handleKeyEvents));
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
  this.initColorPalette = () => {
    this.colors = document.querySelectorAll('.color');
    this.colors.forEach(color => {
      if (color.classList.contains('selected')) {
        this.ctx.strokeStyle = color.dataset.color;
      }
      color.style.backgroundColor = color.dataset.color;
      color.addEventListener('click', this.handleColorChange)
    });
  }
  this.initElementLifecycle = () => {
    // set up color palette
    this.initColorPalette();
    // clear canvas setup
    this.clearButton = document.querySelector('button#clear');
    this.clearButton.addEventListener('click', this.clearCanvas);

    this.uploadButton = document.querySelector('button#upload');
    this.uploadButton.addEventListener('click', this.displayUploadForm);

    // linewidth setup
    this.initStrokeProps();
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
  this.initStrokeProps = () => {
    this.strokePropsContainer = document.querySelector('.strokeProps');
    this.lineWidthSpans = this.strokePropsContainer.childNodes;
    this.lineWidthSpans.forEach(span => span.addEventListener('click', this.handleLineWidthChange));
  }
  this.handleLineWidthChange = (e) => {
    this.strokePropsContainer.querySelector('.selected').classList.remove('selected');
    e.target.classList.add('selected');
    this.ctx.lineWidth = e.target.dataset.linewidth;
  }
  this.handleColorChange = (e) => {
    this.colors.forEach(color => {
      if (color.classList.contains('selected')) {
        color.classList.remove('selected');
      }
    });
    e.target.classList.add('selected');
    this.ctx.strokeStyle = e.target.dataset.color;
  }
  this.chatSetup = () => {
    this.chatMessages = document.querySelector('#messages');
    this.chatForm = document.querySelector('#msgForm');
    this.chatInput = document.querySelector('#msgInput');
    this.chatForm.addEventListener('submit', this.handleMessageSend);
  }
  this.handleMessageSend = (e) => {
    e.preventDefault();
    if (this.chatInput.value !== '') {
      this.socket.emit('chat message', this.chatInput.value);
      this.chatInput.value = '';
    }
  }
  this.createChatMessageElement = (msg) => {
    const el = document.createElement('li');
    el.textContent = msg;
    this.chatMessages.appendChild(el);
    // autoscroll to bottom
    console.log(this.chatForm.offsetHeight);
    this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
  }
  this.addSocketListeners = () => {
    this.socket.on('draw', (data) => this.handleDrawEvent(data.x, data.y, data.color, data.size, data.type, true));
    this.socket.on('chat message', (msg) => this.createChatMessageElement(msg));
    this.socket.on('clearCanvas', () => this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height));
    this.socket.on('newConnection', (n) => this.handleNewSocketConn(n));
    this.socket.on('image:fetch', ({ id }) => this.fetchImage(id));
    this.socket.on('image:display', ({ image }) => this.image.display());
    this.socket.on('image:update', ({ image }) => this.handleImageUpdate(image));
  }
  this.handleNewSocketConn = (connections) => {
    this.connections.textContent = `${connections} `;
  }
  this.handleLocalEvents = (e) => {
    if (this.keysDown.length) {
      this.handleKeysDownMouseEvent(e);
    } else {
      this.handleDrawEvent(e.offsetX, e.offsetY, this.ctx.strokeStyle, this.ctx.lineWidth, e.type, false);
    }
  }
  this.handleImageUpdate = ({ x, y, newWidth, newHeight }) => {
    this.image.x = x;
    this.image.y = y;
    this.image.newWidth = newWidth;
    this.image.newHeight = newHeight;
    console.log(newWidth);
    this.image.display();
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
  this.saveLocalAttrs = () => {
    this.localAttrs = {
      color: this.ctx.strokeStyle,
      lineWidth: this.ctx.lineWidth
    }
  }
  this.handleImageResize = (x, y) => {
    const dWidth = x - this.resizeStart.x;
    const dHeight = y - this.resizeStart.y;
    this.image.updateImageSize(dWidth, dHeight);
    this.resizeStart = { x, y };
    // this.localClearCanvas();
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
    // this.localClearCanvas();
    this.clearCanvas();
    const updated = {
      x: this.image.x,
      y: this.image.y,
      newWidth: this.image.newWidth,
      newHeight: this.image.newHeight
    };
    this.socket.emit('image:update', { image: updated });
  }
  this.resetLocalAttrs = () => {
    this.ctx.strokeStyle = this.localAttrs.color;
    this.ctx.lineWidth = this.localAttrs.lineWidth;
  }
  this.handleDrawEvent = (x, y, color, size, type, remote) => {
    this.saveLocalAttrs();
    if (!remote) {
      this.socket.emit('drawEvent', { x, y, color, size, type, });
    }
    const source = remote ? 'isRemoteDrawing' : 'isDrawing';
    switch (type) {
      case 'mousedown':
        this[source] = true;
        [this.lastX, this.lastY] = [x, y];
        break;
      case 'mousemove':
        if (!this[source]) return;
        this.draw(x, y, color, size);
        break;
      default:
        this[source] = false;
        break;
    }
    this.resetLocalAttrs();
  }
  this.draw = (x, y, color, size) => {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = size;
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    [this.lastX, this.lastY] = [x, y];
  }
  this.onResize = () => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight * 0.7;
    this.setStyles();
  }
  this.clearCanvas = () => {
    this.socket.emit('clearCanvas');
  }
  this.localClearCanvas = () => {
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

function Player() {
  this.score = 0;
  this.getWord = () => {
    fetch('/api').then(res => res.json()).then(res => alert(res));
  }
}

module.exports = App;
