// ================= SOCKET.IO =================
const socket = io();

// ================= CURRENT USER =================
let currentUser = localStorage.getItem('currentUser') || '';

// ================= DOM READY =================
document.addEventListener('DOMContentLoaded', () => {
  const sendBtn = document.getElementById('sendBtn');
  if (sendBtn) sendBtn.addEventListener('click', send);

  const loginBtn = document.getElementById('loginBtn');
  if (loginBtn) loginBtn.addEventListener('click', login);

  const signupBtn = document.getElementById('signupBtn');
  if (signupBtn) signupBtn.addEventListener('click', signup);

  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logout);

  if (window.location.pathname.includes('inbox.html')) loadInbox();
  if (window.location.pathname.includes('sent.html')) loadSent();
});

// ================= SIGNUP =================
async function signup() {
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  if (!username || !password) return alert('Fill both fields');

  try {
    const res = await fetch('/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    alert(await res.text());
    if (res.ok) location.href = 'login.html';
  } catch (e) {
    alert('Signup failed: ' + e.message);
  }
}

// ================= LOGIN =================
async function login() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if (!username || !password) return alert('Fill both fields');

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
      socket.emit('join', currentUser);
      location.href = 'inbox.html';
    }
  } catch (e) {
    alert('Login failed: ' + e.message);
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
  if (!currentUser) return alert('You must log in');
  const to = document.getElementById('to').value.trim();
  const subject = document.getElementById('subject').value.trim();
  const body = document.getElementById('body').value.trim();
  if (!to || !subject || !body) return alert('All fields required');

  try {
    const res = await fetch('/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: currentUser, to, subject, body })
    });
    alert(await res.text());
    if (res.ok) {
      document.getElementById('to').value = '';
      document.getElementById('subject').value = '';
      document.getElementById('body').value = '';
      location.href = 'inbox.html';
    }
  } catch (e) {
    alert('Failed to send: ' + e.message);
  }
}

// ================= LOAD INBOX =================
function loadInbox() {
  if (!currentUser) { alert('Not logged in'); location.href = 'login.html'; return; }
  const inboxDiv = document.getElementById('inbox');
  const msgView = document.getElementById('message-view');
  if (!inboxDiv || !msgView) return;

  document.getElementById('current-user').textContent = `Logged in as: ${currentUser}`;

  fetch(`/inbox/${currentUser}`)
    .then(r => r.json())
    .then(msgs => renderInbox(msgs))
    .catch(e => console.error(e));

  socket.emit('join', currentUser);
  socket.on('newMessage', msg => {
    if (msg.to === currentUser || msg.to_user === currentUser) prependInboxMessage(msg);
  });
}

// ================= RENDER INBOX =================
function renderInbox(messages) {
  const inboxDiv = document.getElementById('inbox');
  inboxDiv.innerHTML = '';
  if (!messages || messages.length === 0) {
    inboxDiv.innerHTML = '<p class="system-message">No messages</p>';
    return;
  }

  messages.forEach((msg, index) => {
    const div = document.createElement('div');
    div.classList.add('message-item');
    div.innerHTML = `
      <div class="info">
        <span><b>From:</b> ${msg.from_user}</span>
        <span><b>Subject:</b> ${msg.subject}</span>
        <span class="snippet">${msg.body.substring(0, 50)}...</span>
      </div>
    `;
    div.addEventListener('click', () => showInboxMessage(msg, index));
    inboxDiv.appendChild(div);
  });
}

// ================= SHOW FULL INBOX MESSAGE =================
function showInboxMessage(msg, index) {
  const msgView = document.getElementById('message-view');
  msgView.classList.remove('hidden');
  document.getElementById('msg-subject').textContent = msg.subject;
  document.getElementById('msg-from').textContent = msg.from_user;
  document.getElementById('msg-body').textContent = msg.body;

  const deleteBtn = document.getElementById('deleteMsgBtn');
  deleteBtn.onclick = () => deleteInbox(index);
}

// ================= DELETE INBOX MESSAGE =================
function deleteInbox(index) {
  fetch(`/message/${index}/${currentUser}`, { method: 'DELETE' })
    .then(r => r.text())
    .then(t => {
      alert(t);
      closeMessage();
      loadInbox();
    })
    .catch(e => alert('Delete failed: ' + e.message));
}

// ================= CLOSE MESSAGE =================
function closeMessage() {
  const msgView = document.getElementById('message-view');
  msgView.classList.add('hidden');
}

// ================= PREPEND NEW MESSAGE =================
function prependInboxMessage(msg) {
  const inboxDiv = document.getElementById('inbox');
  const div = document.createElement('div');
  div.classList.add('message-item');
  div.innerHTML = `<div class="info">
    <span><b>From:</b> ${msg.from}</span>
    <span><b>Subject:</b> ${msg.subject}</span>
    <span class="snippet">${msg.body.substring(0,50)}...</span>
  </div>`;
  div.addEventListener('click', () => showInboxMessage(msg, 0)); // index 0 because latest pushed
  inboxDiv.prepend(div);
}

// ================= LOAD SENT =================
function loadSent() {
  if (!currentUser) { alert('Not logged in'); location.href = 'login.html'; return; }
  const sentDiv = document.getElementById('sent');
  const msgView = document.getElementById('message-view');
  if (!sentDiv || !msgView) return;

  document.getElementById('current-user').textContent = `Logged in as: ${currentUser}`;

  fetch(`/sent/${currentUser}`)
    .then(r => r.json())
    .then(msgs => renderSent(msgs))
    .catch(e => console.error(e));
}

// ================= RENDER SENT =================
function renderSent(messages) {
  const sentDiv = document.getElementById('sent');
  sentDiv.innerHTML = '';
  if (!messages || messages.length === 0) {
    sentDiv.innerHTML = '<p class="system-message">No sent messages</p>';
    return;
  }

  messages.forEach((msg, index) => {
    const div = document.createElement('div');
    div.classList.add('message-item');
    div.innerHTML = `
      <div class="info">
        <span><b>To:</b> ${msg.to_user}</span>
        <span><b>Subject:</b> ${msg.subject}</span>
        <span class="snippet">${msg.body.substring(0,50)}...</span>
      </div>
    `;
    div.addEventListener('click', () => showSentMessage(msg, index));
    sentDiv.appendChild(div);
  });
}

// ================= SHOW FULL SENT MESSAGE =================
function showSentMessage(msg, index) {
  const msgView = document.getElementById('message-view');
  msgView.classList.remove('hidden');
  document.getElementById('msg-subject').textContent = msg.subject;
  document.getElementById('msg-to').textContent = msg.to_user;
  document.getElementById('msg-body').textContent = msg.body;

  const deleteBtn = document.getElementById('deleteSentBtn');
  deleteBtn.onclick = () => deleteSent(index);
}

// ================= DELETE SENT MESSAGE =================
function deleteSent(index) {
  fetch(`/sent/${index}/${currentUser}`, { method: 'DELETE' })
    .then(r => r.text())
    .then(t => {
      alert(t);
      closeMessage();
      loadSent();
    })
    .catch(e => alert('Delete failed: ' + e.message));
}