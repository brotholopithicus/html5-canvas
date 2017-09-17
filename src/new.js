const io = require('socket.io-client');
const CanvasImage = require('./image');
const { getMousePos, createElement } = require('./utils');
const colors = require('./colors');


function App() {
  this.config = {
    colors: colors[0]
  };
  this.images = [];
  this.canvasHistory = [];
  this.moveImages = true;
  this.drawMode = 'draw';

  this.initialize = (element) => {
    this.current = { x: 0, y: 0, color: this.config.colors[0], size: 25 };

    const {
      canvas,
      toolbar,
      eraserButton
    } = this.createDOM();

    this.toolbar = toolbar;
    this.footer = document.querySelector('footer');
    this.eraserButton = eraserButton;

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
    this.webcamButton = document.querySelector('button#webcam');

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
    this.moveButton.addEventListener('click', this.toggleState);
    this.webcamButton.addEventListener('click', this.displayWebcamModal);
    this.eraserButton.addEventListener('click', this.toggleDrawMode);

    this.addSocketListeners();

    window.addEventListener('resize', this.onResize);

    this.onResize();
  }

  this.toggleDrawMode = () => {
    if (this.moveImages) return;
    this.eraserButton.classList.toggle('active');
    this.drawMode = this.drawMode === 'draw' ? 'erase' : 'draw';
  }

  this.addSocketListeners = () => {
    this.socket.on('drawing', this.onDrawingEvent);
    this.socket.on('history', this.onAllHistory);
    this.socket.on('canvas:history', this.onCanvasHistory);
    this.socket.on('canvas:cache', this.cacheCanvasHistory);
    this.socket.on('clear', this.clearCanvas);
    this.socket.on('image:fetch', this.fetchImage);
    this.socket.on('image:update', ({ image }) => this.updateImage(image));
    this.socket.on('image:delete', this.handleImageDelete);
  }


  this.fetchImage = ({ id }) => {
    fetch(`/api/images/${id}`)
      .then(res => res.blob())
      .then(img => {
        const canvasImg = new CanvasImage(img, this.ctx, id);
        canvasImg.image.addEventListener('load', () => canvasImg.display());
        this.images.push(canvasImg);
      });
  }

  this.updateImage = (data) => {
    const { w, h } = this.getCanvasDimensions();
    const image = this.images.find(img => img.id === data.id);
    image.x = data.x * w;
    image.y = data.y * h;
    image.width = data.width * w;
    image.height = data.height * h;
    this.displayImages(false);
  }


  this.getCanvasDimensions = () => ({ w: this.canvas.width, h: this.canvas.height })


  this.toggleState = () => {
    this.moveImages = !this.moveImages;
    this.moveButton.classList.toggle('active');
    this.canvas.classList.toggle('moving');
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
    const canvas = createElement('canvas', { classes: ['whiteboard', 'moving'] });
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

    const eraserButton = createElement('button', { id: 'eraser', text: 'Eraser' });

    toolbar.appendChild(lineWidthContainer);
    toolbar.appendChild(colors);
    toolbar.appendChild(eraserButton);
    toolbar.appendChild(grabButton);
    toolbar.appendChild(clearButton);

    return {
      canvas,
      toolbar,
      eraserButton
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
    this.canvasHistory = [];
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    if (emit) {
      this.socket.emit('clear');
    }
  }

  this.onAllHistory = ({ canvasHistory, imageHistory }) => {
    this.onImageHistory(imageHistory)
      .then(() => {
        this.canvasHistory = canvasHistory;
        this.onCanvasHistory();
      });
  }

  this.onCanvasHistory = () => {
    this.canvasHistory.forEach(item => this.onDrawingEvent(item));
  }

  this.onImageHistory = (images) => {
    return Promise.all(
      images.map(
        async(data) => {
          const { x, y, width, height, id } = data;
          const res = await fetch(`/api/images/${id}`).then(res => res.blob());
          const image = new CanvasImage(res, this.ctx, id);
          image.image.addEventListener('load', () => {
            this.updateImage(data);
          });
          this.images.push(image);
        }
      )
    );
  }


  this.cacheCanvasHistory = (history) => {
    this.canvasHistory = history;
  }

  this.updateColor = (e) => {
    document.querySelector('.color.active').classList.remove('active');
    e.target.classList.add('active');
    this.current.color = e.target.dataset.color;
    this.lineWidthDisplay.style.backgroundColor = e.target.dataset.color;
  }


  this.getMousePos = (e) => getMousePos(this.canvas, e)


  this.drawLine = (x0, y0, x1, y1, color, size, mode = 'draw', emit = false) => {
    this.ctx.beginPath();
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.lineWidth = size;
    this.ctx.strokeStyle = mode === 'erase' ? '#222' : color;
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
      size,
      mode
    });

  }


  this.handleLocalEvents = (e) => {
    if (this.moveImages) {
      this.handleMoveImagesMouseEvent(e);
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
        this.drawLine(this.current.x, this.current.y, this.current.x, this.current.y, this.current.color, this.current.size, this.drawMode, true);
        break;
      case 'mousemove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, this.drawMode, true);
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      default: // mouseup and mouseout
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, this.drawMode, true);
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
        this.drawLine(this.current.x, this.current.y, this.current.x, this.current.y, this.current.color, this.current.size, this.drawMode, true);
        break;
      case 'touchmove':
        if (!this.drawing) return;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, this.drawMode, true);
        this.current.x = coords.x;
        this.current.y = coords.y;
        break;
      default:
        if (!this.drawing) return;
        this.drawing = false;
        this.drawLine(this.current.x, this.current.y, coords.x, coords.y, this.current.color, this.current.size, this.drawMode, true);
        break;
    }
  }


  this.onDrawingEvent = (data) => {
    const { w, h } = this.getCanvasDimensions();
    this.drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, data.mode);
  }


  this.onResize = () => {
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


  this.handleKeyEvents = (e) => {
    if (e.type === 'keydown' && e.keyCode === 46) {
      const image = this.images.find(image => image.selected);
      if (image) {
        this.socket.emit('image:delete', { id: image.id });
      }
    }
  }

  this.handleImageDelete = ({ id }) => {
    const index = this.images.findIndex(img => img.id === id);
    this.images.splice(index, 1);
    this.displayImages(false);
  }

  this.toggleContainerVisibility = (container) => {
    container.classList.toggle('hidden');
  }


  this.displayWebcamModal = () => {
    const webcamContainer = document.querySelector('.webcam-container');
    const webcamWrapper = webcamContainer.querySelector('.webcam-wrapper');
    this.toggleContainerVisibility(webcamContainer);
    const videoElement = createElement('video');
    navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      .then(stream => {
        videoElement.srcObject = stream;
        videoElement.play();
        webcamWrapper.prepend(videoElement);
        const takeSnapshotButton = document.querySelector('button#take-snapshot');
        const cancelButton = document.querySelector('button#cancel-snapshot');
        takeSnapshotButton.addEventListener('click', (e) => {
          this.takeWebcamSnapshot(videoElement);
          webcamWrapper.removeChild(videoElement);
          this.toggleContainerVisibility(webcamContainer);
          stream.getVideoTracks().forEach(track => track.stop());
        });
        cancelButton.addEventListener('click', () => this.toggleContainerVisibility('.webcam-container'));
      });
  }


  this.takeWebcamSnapshot = (video) => {
    const { videoWidth, videoHeight } = video;
    const tmpCanvas = createElement('canvas');
    tmpCanvas.width = videoWidth;
    tmpCanvas.height = videoHeight;
    const tmpContext = tmpCanvas.getContext('2d');
    tmpContext.drawImage(video, 0, 0, tmpCanvas.width, tmpCanvas.height);
    tmpCanvas.toBlob((blob) => {
      const formData = new FormData();
      const file = new File([blob], 'snapshot.jpeg', { type: blob.type });
      formData.append('image', file);
      fetch('/api/image', {
          method: 'POST',
          body: formData
        })
        .then(res => res.json())
        .then(res => {
          this.socket.emit('image:fetch', { id: res.id });
        })
        .catch(err => console.log(err));
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


  this.displayImages = (emit = false) => {
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.images.forEach(img => img.display(this.ctx));
    if (emit) {
      const { id, x, y, width, height } = this.image;
      const { w, h } = this.getCanvasDimensions();
      const image = {
        id,
        x: x / w,
        y: y / h,
        width: width / w,
        height: height / h
      };
      this.socket.emit('image:update', { image });
    }
    this.onCanvasHistory();
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


  this.handleMoveImagesMouseEvent = (e) => {
    const { x, y } = this.getMousePos(e);
    switch (e.type) {
      case 'mousedown':
        this.image = this.imageUnderMouse(x, y);
        this.anchorHit = this.imageAnchorHitTest(this.image, x, y);
        this.isMoving = this.anchorHit < 0 && typeof this.image !== 'undefined';
        this.images.forEach(img => img.selected = img === this.image);
        this.start = { x, y };
        const emit = typeof this.image !== 'undefined';
        this.displayImages(emit);
        this.socket.emit('canvas:cache');
        break;
      case 'mousemove':
        if (this.image) {
          if (this.isMoving) {
            const dx = x - this.start.x;
            const dy = y - this.start.y;
            this.image.x += dx;
            this.image.y += dy;
            this.displayImages(true);
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
            this.displayImages(true);
          }
          this.start = { x, y };
        }
        break;
      default:
        this.isMoving = false;
        this.anchorHit = -1;
        this.image = undefined;
        break;
    }
  }
}

module.exports = App;
