const Loki = require('lokijs');
const { loadCollection } = require('../utils');

const DB_NAME = 'db.json';
const COLLECTION_NAME = 'images';
const UPLOAD_PATH = 'uploads';

// const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, { persistenceMethod: 'fs' });
const dbOptions = {
  autoload: true,
  autoloadCallback: () => loadCollection(COLLECTION_NAME, db),
  autosave: true,
  autosaveInterval: 4000
};

const db = new Loki(`${UPLOAD_PATH}/${DB_NAME}`, dbOptions);

module.exports = { DB_NAME, COLLECTION_NAME, db, UPLOAD_PATH };
