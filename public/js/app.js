function getMousePos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: e.clientX - scaleX,
    y: e.clientY - scaleY
  }
}

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
  this.displayImage = (img, x = 0, y = 0, width, height) => {
    const image = new Image();
    const app = this;
    image.onload = function() {
      if (!width) width = this.width;
      if (!height) height = this.height;
      app.ctx.drawImage(image, x, y, width, height);
      app.image = {
        image: img,
        coords: { x, y },
        size: { width, height },
        originalSize: app.image.originalSize
      };
    }
    image.src = URL.createObjectURL(img);
  }
  this.fetchImage = (id) => {
    const image = new Image();
    fetch(`/api/images/${id}`)
      .then(res => res.blob())
      .then(img => {
        image.src = URL.createObjectURL(img)
        const app = this;
        image.onload = function() {
          const width = this.naturalWidth;
          const height = this.naturalHeight;
          app.image = {
            image: img,
            coords: { x: 0, y: 0 },
            size: { width: this.width, height: this.height },
            originalSize: { width, height }
          };
          app.ctx.drawImage(image, 0, 0, this.width, this.height);
        }
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

    this.setStyles();
    this.setCanvasListeners();
    this.initElementLifecycle();
  }
  this.redrawImages = () => {
    this.images.forEach(img => this.displayImage(img.image, img.coords.x, img.coords.y));
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
      // if (e.keyCode === 16) this.isResizing = false;
      // if (e.keyCode === 91) this.isMoving = false;
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
  }
  this.handleNewSocketConn = (connections) => {
    this.connections.textContent = `${connections} `;
  }
  this.handleLocalEvents = (e) => {
    if (this.keysDown.includes(91)) {
      const { x, y } = getMousePos(this.canvas, e);
      if (this.keysDown.includes(16)) {
        if (e.type === 'mousedown') {
          this.isResizing = true;
          this.lastResize = { x, y };
        } else if (e.type === 'mouseup' || e.type === 'mouseout') {
          this.isResizing = false;
          this.lastResize = { x, y };
        } else {
          this.handleImageResize(x, y);
        }
      } else {
        if (e.type === 'mousedown') {
          this.isMoving = true;
          console.log(this.image);
          this.offset = this.imageTopLeftOffset(x, y);
          this.lastMove = { x, y };
        } else if (e.type === 'mouseup' || e.type === 'mouseout') {
          this.isMoving = false;
          this.lastMove = { x, y };
        } else {
          this.handleImageMove(x, y);
        }
      }
    } else {
      [this.isResizing, this.isMoving] = [false, false];
      this.handleDrawEvent(e.offsetX, e.offsetY, this.ctx.strokeStyle, this.ctx.lineWidth, e.type, false);
    }
  }
  this.saveLocalAttrs = () => {
    this.localAttrs = {
      color: this.ctx.strokeStyle,
      lineWidth: this.ctx.lineWidth
    }
  }
  this.handleImageResize = (x, y) => {
    if (!this.isResizing) return;
    const { image, size, coords } = this.image;
    const width = size.width + (x - this.lastResize.x);
    const height = size.height + (y - this.lastResize.y);
    this.clearCanvas();
    this.displayImage(image, coords.x, coords.y, width, height);
    this.lastResize = { x, y };
  }
  this.handleImageMove = (x, y) => {
    if (!this.isMoving) return;
    const { image, coords, size } = this.image;
    const newX = (coords.x + (x - this.lastMove.x)) + this.offset.x;
    const newY = (coords.y + (y - this.lastMove.y)) + this.offset.y;
    this.clearCanvas();
    this.displayImage(image, newX, newY, size.width, size.height);
    this.lastMove = { x: newX, y: newY };
  }
  this.imageTopLeftOffset = (x, y) => {
    const { coords } = this.image;
    return {
      x: coords.x - x,
      y: coords.y - y
    }
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
}

function Player() {
  this.score = 0;
  this.getWord = () => {
    fetch('/api').then(res => res.json()).then(res => alert(res));
  }
}

let app = new App();
const container = document.querySelector('.container');
app.initialize(container);
app.fetchImage(2);
