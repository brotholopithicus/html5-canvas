const router = require('express').Router();

/* GET home page. */
router.get('/', (req, res, next) => {
  res.render('index', { title: 'Realtime HTML5 Canvas' });
});
router.get('/upload', (req, res) => {
  res.render('upload', { title: 'Upload Image' });
})
module.exports = router;
