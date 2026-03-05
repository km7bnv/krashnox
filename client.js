// Initialize socket for real-time messages
const socket = io();
let currentUser = localStorage.getItem('currentUser') || '';

// --- SIGNUP ---
async function signup() {
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;

  if (!username || !password) return alert('Please fill both fields.');

  const res = await fetch('/signup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });

  const text = await res.text();
  alert(text);

  if (res.ok) location.href = 'login.html';
}

// --- LOGIN ---
async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  if (!username || !password) return alert('Please fill both fields.');

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

    // Join socket room for real-time inbox updates
    socket.emit('join', currentUser);

    location.href = 'inbox.html';
  }
}

// --- SEND EMAIL ---
async function send() {
  const to = document.getElementById('to').value;
  const subject = document.getElementById('subject').value;
  const body = document.getElementById('body').value;

  if (!to || !subject || !body) return alert('All fields are required.');

  const res = await fetch('/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: currentUser, to, subject, body })
  });

  const text = await res.text();
  alert(text);

  if (res.ok) location.href = 'inbox.html';
}

// --- LOAD INBOX ---
function loadInbox() {
  if (!document.getElementById('inbox')) return;

  document.getElementById('current-user').textContent = `Logged in as: ${currentUser}`;

  fetch(`/inbox/${currentUser}`)
    .then(r => r.json())
    .then(msgs => {
      const inboxDiv = document.getElementById('inbox');
      inboxDiv.innerHTML = msgs
        .map(
          m => `<b>From:</b> ${m.from_user} <b>Subject:</b> ${m.subject}
                 <p>${m.body}</p><hr>`
        )
        .join('');
    });

  // Real-time updates
  socket.on('newMessage', msg => {
    const inboxDiv = document.getElementById('inbox');
    inboxDiv.innerHTML = `<b>From:</b> ${msg.from} <b>Subject:</b> ${msg.subject}
                          <p>${msg.body}</p><hr>` + inboxDiv.innerHTML;
  });
}

// --- LOGOUT ---
function logout() {
  localStorage.removeItem('currentUser');
  currentUser = '';
  location.href = 'index.html';
}

// Automatically load inbox when on inbox page
if (window.location.pathname.includes('inbox.html')) loadInbox();