const io = require('socket.io-client');
const { createKeyboardEvent, createElement } = require('./utils');

function Chat() {
  this.config = {
    colors: [
      '#e21400', '#91580f', '#f8a700', '#f78b00',
      '#58dc00', '#287b00', '#a8f07a', '#4ae8c4',
      '#3b88eb', '#3824aa', '#a700ff', '#d300e7'
    ]
  }
  this.initialize = (element) => {
    this.element = element;
    this.element.appendChild(this.createDOM());

    this.usernameInput = document.querySelector('.usernameInput');
    this.messages = document.querySelector('.messages');
    this.messageInput = document.querySelector('.messageInput');
    this.loginPage = document.querySelector('.login.page');
    this.chatPage = document.querySelector('.chat.page');
    this.chatToggle = document.querySelector('#chatToggle');

    this.chatToggle.addEventListener('click', this.onChatToggle);

    this.participants = document.querySelector('#numUsers');

    this.currentInput = this.usernameInput;
    this.currentInput.focus();

    this.unreadMessages = 0;

    this.socket = io();
    this.addSocketListeners();

    window.addEventListener('keydown', (event) => {
      if (!this.element.classList.contains('closed')) {
        this.currentInput.focus();
        if (event.keyCode === 13) {
          if (this.username) {
            this.sendMessage();
          } else {
            this.setUsername();
          }
        }
        if (this.username && event.keyCode === 27) {
          this.onChatToggle();
        }
      }
    });
    this.usernameInput.value = localStorage.getItem('username') ?
      localStorage.getItem('username') : '';

    if (this.usernameInput.value.length) {
      this.setUsername();
    }

  }
  this.onChatToggle = (e) => {
    this.flash(this.chatToggle, 'green');
    this.element.classList.toggle('closed');
    if (this.element.classList.contains('closed')) {
      this.chatToggle.textContent = `Open Chat (${this.unreadMessages})`;
    } else {
      this.chatToggle.textContent = `Close Chat`;
      this.unreadMessages = 0;
    }
  }
  this.createDOM = () => {
    const pages = createElement('ul', { classes: ['pages'] });
    const chatPage = createElement('li', { classes: ['chat', 'page'] });
    const chatArea = createElement('div', { classes: ['chatArea'] });
    const messages = createElement('ul', { classes: ['messages'] });
    const messageInput = createElement('input', { classes: ['messageInput'] });
    const loginPage = createElement('li', { classes: ['login', 'page'] });
    const form = createElement('div', { classes: ['form'] });
    const title = createElement('h3', { classes: ['title'], text: `Enter Your Username` });
    const usernameInput = createElement('input', { classes: ['usernameInput'], attribs: [{ name: 'type', value: 'text' }, { name: 'maxLength', value: '14' }] });

    chatArea.appendChild(messages);
    chatPage.appendChild(chatArea);
    chatPage.appendChild(messageInput);
    pages.appendChild(chatPage);

    form.appendChild(title);
    form.appendChild(usernameInput);
    loginPage.appendChild(form);
    pages.appendChild(loginPage);

    return pages;
  }
  this.log = (msg, opts) => {
    const el = document.createElement('li');
    el.classList.add('log');
    el.textContent = msg;
    this.addMessageElement(el, opts);
  }
  this.setUsername = () => {
    this.username = this.usernameInput.value.trim();
    localStorage.setItem('username', this.username);
    this.chatToggle = document.querySelector('#chatToggle');
    this.chatToggle.disabled = false;
    this.flash(this.chatToggle, 'green');
    this.chatToggle.textContent = 'Open Chat (0)';
    this.element.classList.add('closed');
    this.loginPage.style.display = 'none';
    this.chatPage.style.display = 'block';
    this.currentInput = this.messageInput;

    this.socket.emit('add user', this.username);
  }
  this.sendMessage = () => {
    let message = this.messageInput.value.trim();
    this.messageInput.value = '';
    this.addChatMessage({ username: this.username, message });
    this.socket.emit('new message', message);
  }
  this.addChatMessage = (data, options = { fade: true, prepend: false }) => {
    const username = document.createElement('span');
    username.classList.add('username');
    username.style.color = this.getUsernameColor(data.username);
    username.textContent = data.username;
    const body = document.createElement('span');
    body.classList.add('messageBody');
    body.textContent = data.message;
    const msg = document.createElement('li');
    msg.classList.add('message');
    msg.dataset.username = data.username;

    msg.appendChild(username);
    msg.appendChild(body);

    this.addMessageElement(msg, {});
  }
  this.addMessageElement = (el, options = { fade: true, prepend: false }) => {
    this.messages.appendChild(el);
    this.messages.scrollTop = this.messages.scrollHeight;
  }
  this.flash = (element, color) => {
    element.classList.add('flash', color);
    setTimeout(() => {
      element.classList.remove('flash', color);
    }, 1000);
  }
  this.getUsernameColor = (username) => {
    let hash = 7;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + (hash << 5) - hash;
    }
    let index = Math.abs(hash % this.config.colors.length);
    return this.config.colors[index];
  }
  this.updateUnreadMessages = () => {
    if (this.element.classList.contains('closed')) {
      this.unreadMessages++;
      this.chatToggle.textContent = `Open Chat (${this.unreadMessages})`;
      this.flash(this.chatToggle, 'blue');
    }
  }
  this.addSocketListeners = () => {
    // new message
    this.socket.on('new message', (data) => {
      this.addChatMessage(data);
      this.updateUnreadMessages();
    });
    // chat history
    this.socket.on('chatHistory', (data) => {
      data.forEach(msgData => {
        console.log(msgData);
        this.addChatMessage(msgData);
      });
    });
    // user joined
    this.socket.on('user joined', (data) => {
      this.log(data.username + ' joined');
      this.updateUserNum(data);
    });
    // login
    this.socket.on('login', (data) => {
      this.updateUserNum(data);
      this.socket.emit('chatHistory');
    });
    // user left
    this.socket.on('user left', (data) => {
      if (this.username) this.log(data.username + ' left');
      this.updateUserNum(data);
    });
    // disconnect
    this.socket.on('disconnect', () => this.log('You have been disconnected.'));
  }
  this.updateUserNum = (data) => {
    this.participants.textContent = data.numUsers;
  }
}

module.exports = Chat;
