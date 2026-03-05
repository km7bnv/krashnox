const socket = io();
let currentUser = '';

async function signup() {
  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    })
  });
  alert(await res.text());
}

async function login() {
  const res = await fetch('/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: document.getElementById('username').value,
      password: document.getElementById('password').value
    })
  });
  const text = await res.text();
  alert(text);
  if (text === 'Logged in!') {
    currentUser = document.getElementById('username').value;
    socket.emit('join', currentUser);
  }
}

async function send() {
  const res = await fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: currentUser,
      to: document.getElementById('to').value,
      subject: document.getElementById('subject').value,
      body: document.getElementById('body').value
    })
  });
  alert(await res.text());
}

// Real-time inbox update
socket.on('newMessage', msg => {
  const inbox = document.getElementById('inbox');
  inbox.innerHTML = `<b>From:</b> ${msg.from} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p><hr>` + inbox.innerHTML;
});