// SOCKET.IO
const socket = io();

// CURRENT USER
let currentUser = localStorage.getItem('currentUser') || '';

// DOM READY
document.addEventListener('DOMContentLoaded',()=>{
  const sendBtn = document.getElementById('sendBtn');
  if(sendBtn) sendBtn.addEventListener('click',send);

  const loginBtn = document.getElementById('loginBtn');
  if(loginBtn) loginBtn.addEventListener('click',login);

  const signupBtn = document.getElementById('signupBtn');
  if(signupBtn) signupBtn.addEventListener('click',signup);

  const logoutBtn = document.getElementById('logoutBtn');
  if(logoutBtn) logoutBtn.addEventListener('click',logout);

  if(window.location.pathname.includes('inbox.html')) loadInbox();
  if(window.location.pathname.includes('sent.html')) loadSent();
});

// SIGNUP
async function signup(){
  const username = document.getElementById('signup-username').value.trim();
  const password = document.getElementById('signup-password').value.trim();
  if(!username||!password) return alert('Fill both fields');
  try{
    const res = await fetch('/signup',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password})});
    alert(await res.text());
    if(res.ok) location.href='login.html';
  }catch(e){alert('Signup failed: '+e.message);}
}

// LOGIN
async function login(){
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  if(!username||!password) return alert('Fill both fields');
  try{
    const res = await fetch('/login',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({username,password})});
    const text = await res.text();
    alert(text);
    if(text==='Logged in!'){
      currentUser=username;
      localStorage.setItem('currentUser',currentUser);
      socket.emit('join',currentUser);
      location.href='inbox.html';
    }
  }catch(e){alert('Login failed: '+e.message);}
}

// LOGOUT
function logout(){
  localStorage.removeItem('currentUser');
  currentUser='';
  location.href='index.html';
}

// SEND
async function send(){
  if(!currentUser) return alert('You must log in');
  const to=document.getElementById('to').value.trim();
  const subject=document.getElementById('subject').value.trim();
  const body=document.getElementById('body').value.trim();
  if(!to||!subject||!body) return alert('All fields required');
  try{
    const res=await fetch('/send',{method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({from:currentUser,to,subject,body})});
    alert(await res.text());
    if(res.ok){document.getElementById('to').value=''; document.getElementById('subject').value=''; document.getElementById('body').value=''; location.href='inbox.html';}
  }catch(e){alert('Failed to send: '+e.message);}
}

// LOAD INBOX
function loadInbox(){
  if(!currentUser){alert('Not logged in'); location.href='login.html'; return;}
  const inboxDiv=document.getElementById('inbox');
  if(!inboxDiv) return;
  fetch(`/inbox/${currentUser}`).then(r=>r.json()).then(msgs=>renderInbox(msgs)).catch(e=>console.error(e));
  socket.emit('join',currentUser);
  socket.on('newMessage',msg=>{ if(msg.to===currentUser||msg.to_user===currentUser) prependInboxMessage(msg); });
}

// RENDER INBOX WITH DELETE
function renderInbox(messages){
  const inboxDiv=document.getElementById('inbox');
  inboxDiv.innerHTML='';
  if(!messages||messages.length===0){inboxDiv.innerHTML='<p class="system-message">No messages</p>'; return;}
  messages.forEach((msg,index)=>{
    const div=document.createElement('div');
    div.classList.add('message');
    if(msg.from_user===currentUser) div.classList.add('self');
    div.innerHTML=`<b>From:</b> ${msg.from_user} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p>
    <button onclick="deleteInbox(${index})">Delete</button>`;
    inboxDiv.appendChild(div);
  });
}

// DELETE INBOX MESSAGE
function deleteInbox(index){
  fetch(`/message/${index}/${currentUser}`,{method:'DELETE'}).then(r=>r.text()).then(t=>{alert(t); loadInbox();}).catch(e=>alert('Delete failed: '+e.message));
}

// PREPEND REAL-TIME INBOX
function prependInboxMessage(msg){
  const inboxDiv=document.getElementById('inbox');
  const div=document.createElement('div');
  div.classList.add('message');
  div.innerHTML=`<b>From:</b> ${msg.from} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p>`;
  inboxDiv.prepend(div);
}

// LOAD SENT
function loadSent(){
  if(!currentUser){alert('Not logged in'); location.href='login.html'; return;}
  const sentDiv=document.getElementById('sent');
  if(!sentDiv) return;
  fetch(`/sent/${currentUser}`).then(r=>r.json()).then(msgs=>{
    sentDiv.innerHTML='';
    if(msgs.length===0){sentDiv.innerHTML='<p class="system-message">No sent messages</p>'; return;}
    msgs.forEach((msg,index)=>{
      const div=document.createElement('div');
      div.classList.add('message');
      div.innerHTML=`<b>To:</b> ${msg.to_user} <b>Subject:</b> ${msg.subject}<p>${msg.body}</p>
      <button onclick="deleteSent(${index})">Delete</button>`;
      sentDiv.appendChild(div);
    });
  }).catch(e=>console.error(e));
}

// DELETE SENT MESSAGE
function deleteSent(index){
  fetch(`/sent/${index}/${currentUser}`,{method:'DELETE'}).then(r=>r.text()).then(t=>{alert(t); loadSent();}).catch(e=>alert('Delete failed: '+e.message));
}