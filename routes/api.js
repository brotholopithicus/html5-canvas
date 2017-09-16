const fs = require('fs');
const path = require('path');
const router = require('express').Router();
const multer = require('multer');

const { DB_NAME, COLLECTION_NAME, db, UPLOAD_PATH } = require('../config');
const { loadCollection, filter, generateUUID } = require('../utils');


const upload = multer({ dest: `${UPLOAD_PATH}/`, fileFilter: filter.images });

// post a single image
router.post('/image', upload.single('image'), async(req, res) => {
  try {
    const collection = await loadCollection(COLLECTION_NAME, db);
    const data = collection.insert(req.file);
    db.saveDatabase();
    return res.json({
      id: data.$loki,
      uuid: generateUUID(),
      fileName: data.filename,
      originalName: data.originalname
    });
  } catch (err) {
    res.sendStatus(400);
  }
});

// get list of all images
router.get('/images', async(req, res) => {
  try {
    const collection = await loadCollection(COLLECTION_NAME, db);
    res.send(collection.data);
  } catch (err) {
    res.sendStatus(400);
  }
});

// get single image by id
router.get('/images/:id', async(req, res) => {
  try {
    const collection = await loadCollection(COLLECTION_NAME, db);
    const result = collection.get(req.params.id);
    return result ? (() => {
      res.setHeader('Content-Type', result.mimetype);
      fs.createReadStream(path.resolve(__dirname, '..', result.path)).pipe(res);
    })() : res.sendStatus(404);
  } catch (err) {
    res.sendStatus(400);
  }
});

module.exports = router;
