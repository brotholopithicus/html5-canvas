require('./css/combo.css');

const App = require('./new');
const Chat = require('./chat');

const drawContainer = document.querySelector('.draw-container');
let app = new App();
app.initialize(drawContainer);
app.fetchImage(1);

const chatContainer = document.querySelector('.chat-container');
let chat = new Chat();
chat.initialize(chatContainer);
