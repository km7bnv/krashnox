// ================= SOCKET.IO =================
const socket = io();

// ================= CURRENT USER =================
let currentUser = localStorage.getItem('currentUser') || '';

// ================= DOM READY =================
document.addEventListener('DOMContentLoaded', () => {
  // Attach Send button if exists
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.addEventListener('click', send);

  // Attach Login button if exists
  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', login);

  // Attach Signup button if exists
  const signupBtn = document.getElementById('signupBtn');
  if (signupBtn) signupBtn.addEventListener('click', signup);

  // Attach Logout button if exists
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  // Load inbox if on inbox page
  if (window.location.pathname.includes('inbox.html')) loadInbox();
});

// ================= SIGNUP =================
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

// ================= LOGIN =================
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

// ================= LOGOUT =================
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = '';
  location.href = 'index.html';
}

// ================= SEND EMAIL =================
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

    if (res.ok) {
      document.getElementById('to').value = '';
      document.getElementById('subject').value = '';
      document.getElementById('body').value = '';

      location.href = 'inbox.html';
    }
  } catch (err) {
    alert('Failed to send: ' + err.message);
  }
}

// ================= LOAD INBOX =================
function loadInbox() {
  if (!currentUser) {
    alert('You are not logged in!');
    location.href = 'login.html';
    return;
  }

  const inboxDiv = document.getElementById('inbox');
  if (!inboxDiv) return;

  document.getElementById('current-user').textContent = `Logged in as: ${currentUser}`;

  fetch(`/inbox/${currentUser}`)
    .then(res => res.json())
    .then(messages => renderInbox(messages))
    .catch(err => console.error(err));

  // Real-time updates
  socket.emit('join', currentUser);
  socket.on('newMessage', msg => {
    if (msg.to === currentUser || msg.to_user === currentUser) prependMessage(msg);
  });
}

// ================= RENDER INBOX =================
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

// ================= PREPEND NEW MESSAGE =================
function prependMessage(msg) {
  const inboxDiv = document.getElementById('inbox');
  const div = document.createElement('div');
  div.classList.add('message');
  div.innerHTML = `<b>From:</b> ${msg.from} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p>`;
  inboxDiv.prepend(div);
}