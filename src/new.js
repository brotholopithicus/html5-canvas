const io = require('socket.io-client');
const CanvasImage = require('./image');
const { getMousePos, createElement } = require('./utils');
const { getWebcamStream } = require('./webcam');
const colors = require('./colors');


function App() {
  this.config = {
    colors: colors[2]
  };
  this.images = [];
  this.keysDown = [];
  this.moveImages = true;
  this.initialize = (element) => {
    this.current = { x: 0, y: 0, color: this.config.colors[0], size: 25 };

    const {
      canvas,
      toolbar,
      webcamButton
    } = this.createDOM();

    this.toolbar = toolbar;
    this.footer = document.querySelector('footer');
    this.webcamButton = webcamButton;

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
    this.moveButton = document.querySelector('button#move');

    this.ctx = this.canvas.getContext('2d');

    this.drawing = false;

    // mouse event listeners
    ['mousedown', 'mouseup', 'mouseout', 'mousemove'].forEach(evt => this.canvas.addEventListener(evt, this.handleLocalEvents));

    // touch event listeners
    // ['touchstart', 'touchmove', 'touchcancel', 'touchend', 'touchcancel'].forEach(evt => this.canvas.addEventListener(evt, this.touchEventHandler, { passive: true }));

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
    this.moveButton.addEventListener('click', this.toggleState);
    this.webcamButton.addEventListener('click', this.displayWebcamModal);

    this.addSocketListeners();

    window.addEventListener('resize', this.onResize);

    this.onResize();
  }
  this.addSocketListeners = () => {
    this.socket.on('drawing', this.onDrawingEvent);
    this.socket.on('history', this.onCanvasHistory);
    this.socket.on('clear', this.clearCanvas);
    this.socket.on('image:fetch', ({ id }) => this.fetchImage(id));
    this.socket.on('image:history', this.handleImageHistory);
    this.socket.on('image:update', ({ image }) => this.updateImage(image));
  }
  this.handleImageHistory = (imageHistory) => {
    imageHistory.forEach(imageData => {
      const { id, x, y, width, height } = imageData;
      fetch(`/api/images/${id}`)
        .then(res => res.blob())
        .then(img => {
          const canvasImg = new CanvasImage(img, this.ctx, id);
          canvasImg.image.addEventListener('load', () => canvasImg.display());
          canvasImg.x = x;
          canvasImg.y = y;
          canvasImg.width = width;
          canvasImg.height = height;
          this.images.push(canvasImg);
        });
    });
    this.displayImages();
  }
  this.updateImage = (imageData) => {
    const image = this.images.find(img => img.id === imageData.id);
    for (let key in imageData) {
      image[key] = imageData[key];
    }
    this.displayImages();
  }
  this.getCanvasDimensions = () => ({ w: this.canvas.width, h: this.canvas.height })
  this.toggleState = () => {
    this.moveImages = !this.moveImages;
    this.moveButton.classList.toggle('active');
    this.images.forEach(img => img.selected = false);
    if (!this.moveImages) {
      this.displayImages();
    }
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
    const canvas = createElement('canvas', { classes: ['whiteboard'] });
    const toolbar = createElement('div', { classes: ['toolbar'] });
    const lineWidthContainer = createElement('div', { classes: ['line-width-container'] });
    const lineWidthRange = createElement('input', {
      classes: ['line-width'],
      attribs: [
        { name: 'type', value: 'range' },
        { name: 'min', value: 1 },
        { name: 'max', value: 50 },
        { name: 'step', value: 1 },
        { name: 'value', value: this.current.size }
      ]
    });


    const circleContainer = createElement('div', { classes: ['circle-container'] });
    const circle = createElement('span', { classes: ['circle'] });

    circle.style.width = lineWidthRange.value + 'px';
    circle.style.height = lineWidthRange.value + 'px';

    lineWidthContainer.appendChild(lineWidthRange);
    circleContainer.appendChild(circle);
    lineWidthContainer.appendChild(circleContainer);

    const colors = createElement('div', { classes: ['colors'] });

    this.config.colors.forEach(color => {
      let el = createElement('div', {
        classes: ['color'],
        attribs: [
          { name: 'data-color', value: color }
        ]
      });
      colors.appendChild(el);
    });

    colors.children[0].classList.add('active');

    const clearButton = createElement('button', { id: 'clear', text: 'Clear' });

    const grabButtonClass = this.moveImages ? 'active' : '';
    const grabButton = createElement('button', { id: 'move', text: 'Move', classes: [grabButtonClass] });

    const webcamButton = createElement('button', { id: 'webcam', text: '8==>' });

    toolbar.appendChild(lineWidthContainer);
    toolbar.appendChild(colors);
    toolbar.appendChild(webcamButton);
    toolbar.appendChild(grabButton);
    toolbar.appendChild(clearButton);

    return {
      canvas,
      toolbar,
      webcamButton
    }
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
  this.clearEventHandler = () => {
    this.clearCanvas(true);
  }
  this.clearCanvas = (emit = false) => {
    this.images = [];
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (emit) {
      this.socket.emit('clear');
    }
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
  this.getMousePos = (e) => getMousePos(this.canvas, e)
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
    if (this.moveImages) {
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
    // this.canvas.width = window.innerWidth;
    // this.canvas.height = window.innerHeight;
    const toolbarHeight = this.toolbar.offsetHeight;
    const footerHeight = this.footer.offsetHeight;
    const canvasHeight = window.innerHeight - (toolbarHeight + footerHeight);
    const canvasWidth = window.innerWidth;
    this.canvas.height = canvasHeight;
    this.canvas.width = canvasWidth;
    this.setStyles();
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
    const matchingImage = this.images.find(img => img.id === id);
    if (!matchingImage) {
      fetch(`/api/images/${id}`)
        .then(res => res.blob())
        .then(img => {
          const canvasImg = new CanvasImage(img, this.ctx, id);
          canvasImg.image.addEventListener('load', () => canvasImg.display());
          this.images.push(canvasImg);
          this.socket.emit('image:fetch', { id });
        });
    }
  }
  this.displayImage = () => {
    this.socket.emit('image:display', ({ image: this.image }));
  }
  this.handleKeyEvents = (e) => {
    if (e.type === 'keydown') {
      if (!this.keysDown.includes(e.keyCode)) this.keysDown.push(e.keyCode);
    } else if (e.type === 'keyup') {
      this.keysDown.splice(this.keysDown.indexOf(e.keyCode), 1);
    } else {
      console.log(e);
    }
  }
  this.toggleContainerVisibility = (container) => {
    container.classList.toggle('hidden');
  }
  this.displayWebcamModal = async() => {
    const webcamContainer = document.querySelector('.webcam-container');
    const webcamWrapper = webcamContainer.querySelector('.webcam-wrapper');
    this.toggleContainerVisibility(webcamContainer);
    const videoElement = createElement('video');
    const stream = await getWebcamStream();
    videoElement.srcObject = stream;
    videoElement.play();
    webcamWrapper.prepend(videoElement);
    const takeSnapshotButton = document.querySelector('button#take-snapshot');
    const cancelButton = document.querySelector('button#cancel-snapshot');
    takeSnapshotButton.addEventListener('click', (e) => {
      this.takeWebcamSnapshot(videoElement);
      this.toggleContainerVisibility(webcamContainer);
      stream.getVideoTracks().forEach(track => track.stop());
    });
    cancelButton.addEventListener('click', () => this.toggleContainerVisibility('.webcam-container'));
  }
  this.takeWebcamSnapshot = (video) => {
    const { videoWidth, videoHeight } = video;
    const tmpCanvas = createElement('canvas');
    tmpCanvas.width = videoWidth;
    tmpCanvas.height = videoHeight;
    const tmpContext = tmpCanvas.getContext('2d');
    tmpContext.drawImage(video, 0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpCanvas.toBlob((blob) => {
      const snapshot = new CanvasImage(blob, this.ctx, this.images.length + 1);
      this.image = snapshot;
      this.images.push(this.image);
      this.image.image.addEventListener('load', () => this.image.display());
    });
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
  this.imageUnderMouse = (x, y) => {
    return this.images.find(img =>
      x >= img.x - img.anchorRadius &&
      y >= img.y - img.anchorRadius &&
      x <= img.x + img.width + img.anchorRadius &&
      y <= img.y + img.height + img.anchorRadius
    );
  }
  this.displayImages = () => {
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.images.forEach(img => img.display(this.ctx));
  }
  this.imageAnchorHitTest = (image, x, y) => {
    if (typeof image !== 'undefined') {
      const anchors = image.anchors.map(a => Object.assign({}, a));
      const r = image.anchorRadius;
      return anchors.findIndex(a => {
        const dx = x - a.x;
        const dy = y - a.y;
        return dx * dx + dy * dy < r * r;
      });
    } else {
      return;
    }
  }
  this.handleKeysDownMouseEvent = (e) => {
    const { x, y } = this.getMousePos(e);
    switch (e.type) {
      case 'mousedown':
        this.image = this.imageUnderMouse(x, y);
        this.anchorHit = this.imageAnchorHitTest(this.image, x, y);
        this.isMoving = this.anchorHit < 0 && typeof this.image !== 'undefined';
        this.images.forEach(img => img.selected = img === this.image);
        this.start = { x, y };
        break;
      case 'mousemove':
        if (this.image) {
          if (this.isMoving) {
            const dx = x - this.start.x;
            const dy = y - this.start.y;
            this.image.x += dx;
            this.image.y += dy;
          } else if (this.anchorHit > -1) {
            const imageRight = this.image.x + this.image.width;
            const imageBottom = this.image.y + this.image.height;
            switch (this.anchorHit) {
              case 0:
                this.image.x = x;
                this.image.width = imageRight - x;
                this.image.y = y;
                this.image.height = imageBottom - y;
                break;
              case 1:
                this.image.x = x;
                this.image.width = imageRight - x;
                this.image.height = y - this.image.y;
                break;
              case 2:
                this.image.y = y;
                this.image.width = x - this.image.x;
                this.image.height = imageBottom - y;
                break;
              case 3:
                this.image.width = x - this.image.x;
                this.image.height = y - this.image.y;
                break;
              default:
                break;
            }
          }
          this.start = { x, y };
        }
        break;
      default:
        this.isMoving = false;
        this.anchorHit = -1;
        this.image = null;
        break;
    }
    if (this.image) this.handleImageUpdate();
    this.displayImages();
  }
  this.handleImageUpdate = () => {
    const { id, x, y, width, height } = this.image;
    const image = { id, x, y, width, height };
    this.socket.emit('image:update', { image });
  }
}

module.exports = App;
