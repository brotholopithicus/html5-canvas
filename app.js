const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const cors = require('cors');
const Loki = require('lokijs');
const multer = require('multer');

require('dotenv').config();

const index = require('./routes/index');
const api = require('./routes/api');

// db config
const { DB_NAME, COLLECTION_NAME, db, UPLOAD_PATH } = require('./config');

const { cleanDirectory } = require('./utils');
// cleanDirectory(path.resolve(__dirname, UPLOAD_PATH));

const app = express();

// use webpack middleware in development
if (process.env.NODE_ENV === 'development') {
  const config = require('./webpack.config');
  const compiler = require('webpack')(config);
  app.use(require('webpack-dev-middleware')(compiler, {
    publicPath: config.output.publicPath
  }));
}
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(cors());
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(morgan('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/api', api);

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
