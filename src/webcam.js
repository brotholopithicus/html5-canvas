const { createElement } = require('./utils');

async function getWebcamStream() {
  return await navigator.mediaDevices.getUserMedia({ video: true, audio: false });

}

module.exports = {
  getWebcamStream
}
