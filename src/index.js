const App = require('./app');

let app = new App();
const container = document.querySelector('.container');
app.initialize(container);
