// Initialize Socket.IO
const socket = io();

// Get current user from localStorage
let currentUser = localStorage.getItem('currentUser') || '';

// ------------------- SIGNUP -------------------
async function signup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();

  if (!username || !password) return alert('Please fill both fields.');

  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    alert(text);

    if (res.ok) location.href = 'login.html';
  } catch (err) {
    alert('Signup failed: ' + err.message);
  }
}

// ------------------- LOGIN -------------------
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();

  if (!username || !password) return alert('Please fill both fields.');

  try {
    const res = await fetch('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    const text = await res.text();
    alert(text);

    if (text === 'Logged in!') {
      currentUser = username;
      localStorage.setItem('currentUser', currentUser);

      // Join Socket.IO room for real-time messages
      socket.emit('join', currentUser);

      location.href = 'inbox.html';
    }
  } catch (err) {
    alert('Login failed: ' + err.message);
  }
}

// ------------------- SEND EMAIL -------------------
async function send() {
  if (!currentUser) return alert('You must be logged in to send an email.');

  const to = document.getElementById('to').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const body = document.getElementById('body').value.trim();

  if (!to || !subject || !body) return alert('All fields are required.');

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: currentUser, to, subject, body })
    });

    const text = await res.text();
    alert(text);

    if (res.ok) location.href = 'inbox.html';
  } catch (err) {
    alert('Failed to send: ' + err.message);
  }
}

// ------------------- LOAD INBOX -------------------
function loadInbox() {
  if (!document.getElementById('inbox')) return; // only run on inbox page

  if (!currentUser) {
    alert('You are not logged in!');
    location.href = 'login.html';
    return;
  }

  document.getElementById('current-user').textContent = `Logged in as: ${currentUser}`;

  // Fetch inbox messages
  fetch(`/inbox/${currentUser}`)
    .then(res => res.json())
    .then(msgs => {
      renderInbox(msgs);
    })
    .catch(err => {
      console.error('Failed to load inbox:', err);
    });

  // Listen for real-time incoming messages
  socket.on('newMessage', msg => {
    if (msg.to === currentUser || msg.to_user === currentUser) {
      prependMessage(msg);
    }
  });

  // Join user's Socket.IO room
  socket.emit('join', currentUser);
}

// ------------------- RENDER INBOX -------------------
function renderInbox(messages) {
  const inboxDiv = document.getElementById('inbox');
  inboxDiv.innerHTML = '';

  if (!messages || messages.length === 0) {
    inboxDiv.innerHTML = '<p class="system-message">No messages yet.</p>';
    return;
  }

  messages.forEach(msg => {
    const div = document.createElement('div');
    div.classList.add('message');
    if (msg.from_user === currentUser) div.classList.add('self');
    div.innerHTML = `<b>From:</b> ${msg.from_user} <b>Subject:</b> ${msg.subject}
                     <p>${msg.body}</p>`;
    inboxDiv.appendChild(div);
  });
}

// Prepend a new message at the top
function prependMessage(msg) {
  const inboxDiv = document.getElementById('inbox');
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<b>From:</b> ${msg.from} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p>`;
  inboxDiv.prepend(div);
}

// ------------------- LOGOUT -------------------
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = '';
  location.href = 'index.html';
}

// Automatically load inbox if on inbox.html
if (window.location.pathname.includes('inbox.html')) loadInbox();