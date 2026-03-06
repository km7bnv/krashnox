// ===========================
// CLIENT.JS
// ===========================

// API helper
async function api(url, method="GET", data=null){
  const options = { method, headers:{} };
  if(data){
    options.headers["Content-Type"]="application/json";
    options.body=JSON.stringify(data);
  }
  const res = await fetch(url, options);
  return res.json();
}

// ---------------------------
// AUTH
// ---------------------------
async function signup(){
  const username=document.getElementById("username").value;
  const password=document.getElementById("password").value;
  const res=await api("/signup","POST",{username,password});
  if(res.success){ alert("Account created!"); window.location.href="login.html"; }
  else alert(res.error);
}

async function login(){
  const username=document.getElementById("username").value;
  const password=document.getElementById("password").value;
  const res=await api("/login","POST",{username,password});
  if(res.success){
    if(res.isAdmin) window.location.href="admin.html";
    else window.location.href="inbox.html";
  } else alert(res.error);
}

async function logout(){
  await api("/logout","POST");
  window.location.href="index.html";
}

// ---------------------------
// INBOX / SENT
// ---------------------------
async function loadInbox(){
  const mails=await api("/api/inbox");
  const list=document.getElementById("mailList");
  list.innerHTML="";
  mails.forEach(mail=>{
    const div=document.createElement("div");
    div.className="mailItem"+(mail.read?"":" mailUnread");
    div.innerHTML=`<span>${mail.fromUser} - ${mail.subject}</span>`+(mail.read?"":`<span class="unreadDot"></span>`);
    div.onclick=()=>viewMessage(mail.id);
    list.appendChild(div);
  });
}

async function loadSent(){
  const mails=await api("/api/sent");
  const list=document.getElementById("mailList");
  list.innerHTML="";
  mails.forEach(mail=>{
    const div=document.createElement("div");
    div.className="mailItem";
    div.innerHTML=`<span>To: ${mail.toUser} - ${mail.subject}</span>`;
    div.onclick=()=>viewMessage(mail.id);
    list.appendChild(div);
  });
}

// ---------------------------
// VIEW MESSAGE
// ---------------------------
async function viewMessage(id){
  const inbox=await api("/api/inbox");
  const sent=await api("/api/sent");
  const mail=inbox.find(m=>m.id===id)||sent.find(m=>m.id===id);
  if(!mail) return alert("Message not found");
  if(mail.toUser) await api(`/api/read/${id}`,"POST");
  sessionStorage.setItem("currentMail",JSON.stringify(mail));
  window.location.href="view.html";
}

function loadCurrentMessage(){
  const mail=JSON.parse(sessionStorage.getItem("currentMail"));
  if(!mail) return alert("No message loaded");
  document.getElementById("viewFrom").innerText=mail.fromUser||"";
  document.getElementById("viewTo").innerText=mail.toUser||"";
  document.getElementById("viewSubject").innerText=mail.subject||"";
  document.getElementById("viewBody").innerText=mail.body||"";
  document.getElementById("replyBtn").onclick=()=>{
    document.getElementById("to").value=mail.fromUser;
    document.getElementById("subject").value="Re: "+mail.subject;
    window.location.href="compose.html";
  }
}

async function deleteMessage(){
  const mail=JSON.parse(sessionStorage.getItem("currentMail"));
  if(!mail) return alert("No message selected");
  await api(`/api/delete/${mail.id}`,"POST");
  alert("Message deleted");
  window.location.href="inbox.html";
}

// ---------------------------
// COMPOSE
// ---------------------------
async function sendMessage(){
  const toUser=document.getElementById("to").value;
  const subject=document.getElementById("subject").value;
  const body=document.getElementById("body").value;
  if(!toUser||!body) return alert("Recipient and body required");
  const res=await api("/api/send","POST",{toUser,subject,body});
  if(res.success){ alert("Message sent!"); window.location.href="sent.html"; }
  else alert(res.error);
}

// ---------------------------
// ADMIN
// ---------------------------
async function loadUsers(){
  const users=await api("/api/users");
  const list=document.getElementById("userList");
  list.innerHTML="";
  users.forEach(u=>{
    const div=document.createElement("div");
    div.innerHTML=`<span>${u.username}</span> <button onclick="deleteUser('${u.username}')">Delete</button>`;
    list.appendChild(div);
  });
}

async function deleteUser(username){
  if(!confirm(`Delete user ${username}?`)) return;
  const res=await api("/api/delete-user","POST",{username});
  if(res.success){ alert("User deleted"); loadUsers(); }
  else alert(res.error);
}