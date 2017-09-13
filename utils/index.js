const Loki = require('lokijs');
const fs = require('fs');
const path = require('path');

function cleanDirectory(dirPath) {
  fs.readdir(dirPath, (err, files) => {
    if (err) throw err;
    files.forEach(file => {
      const filePath = path.resolve(dirPath, file);
      fs.unlink(filePath, (err) => {
        if (err) throw err;
      });
    });
  });
  console.log(`Successfully cleaned ${dirPath}`);
}

function loadCollection(collectionName, db) {
  return new Promise((resolve, reject) => {
    const _collection = db.getCollection(collectionName) || db.addCollection(collectionName);
    resolve(_collection);
  });
}

const filter = {
  images(req, file, cb) {
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    return cb(null, true);
  }
}

module.exports = { loadCollection, filter, cleanDirectory };
