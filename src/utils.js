function getMousePos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY
  }
}

function createKeyboardEvent(keyCode) {
  return new KeyboardEvent('keydown', { keyCode });
}

function createElement(tag, options = {}) {
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

module.exports = {
  getMousePos,
  createKeyboardEvent,
  createElement
}
