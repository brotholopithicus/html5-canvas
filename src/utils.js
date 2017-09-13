function getMousePos(canvas, e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: parseInt(e.clientX - scaleX),
    y: parseInt(e.clientY - scaleY)
  }
}

module.exports = {
  getMousePos
}
