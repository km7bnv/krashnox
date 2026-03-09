// -------------------
// Generic API helper
// -------------------
async function api(url, method="GET", data=null){
  const options={method,headers:{}};
  if(data){
    options.headers["Content-Type"]="application/json";
    options.body = JSON.stringify(data);
  }
  const res = await fetch(url, options);
  return res.json();
}

// -------------------
// LOGIN
// -------------------
async function login(){
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await api("/login","POST",{username,password});

  if(res.success){
    if(res.isAdmin)
      window.location.href="admin.html";
    else
      window.location.href="inbox.html";
  }
  else alert(res.error);
}

// -------------------
// SIGNUP
// -------------------
async function signup(){
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;

  const res = await api("/signup","POST",{username,password});

  if(res.success){
    alert("Account created");
    window.location.href="login.html";
  }
  else alert(res.error);
}

// -------------------
// SEND MESSAGE
// -------------------
async function sendMessage(){
  const toUser = document.getElementById("to").value;
  const subject = document.getElementById("subject").value;
  const body = document.getElementById("body").value;

  const res = await api("/api/send","POST",{toUser,subject,body});
  if(res.success){
    alert("Message sent");
    window.location.href="sent.html";
  }
  else alert(res.error);
}

// -------------------
// LOAD INBOX
// -------------------
async function loadInbox(){
  const mails = await api("/api/inbox");
  const list = document.getElementById("mailList");
  list.innerHTML = "";

  mails.forEach(mail=>{
    const div = document.createElement("div");
    div.className = "mail-item";

    div.innerHTML = `<b>${mail.fromUser}</b> - ${mail.subject || "(No subject)"}`;
    div.onclick = ()=>{
      sessionStorage.setItem("mail",JSON.stringify(mail));
      window.location.href="view.html";
    };

    list.appendChild(div);
  });
}

// -------------------
// LOAD SENT
// -------------------
async function loadSent(){
  const mails = await api("/api/sent");
  const list = document.getElementById("mailList");
  list.innerHTML = "";

  mails.forEach(mail=>{
    const div = document.createElement("div");
    div.className = "mail-item";

    div.innerHTML = `To: <b>${mail.toUser}</b> - ${mail.subject || "(No subject)"}`;
    div.onclick = ()=>{
      sessionStorage.setItem("mail",JSON.stringify(mail));
      window.location.href="view.html";
    };

    list.appendChild(div);
  });
}

// -------------------
// VIEW MESSAGE
// -------------------
function loadMessage(){
  const mail = JSON.parse(sessionStorage.getItem("mail"));

  if(!mail) return;

  document.getElementById("viewFrom").innerText = mail.fromUser;
  document.getElementById("viewTo").innerText = mail.toUser;
  document.getElementById("viewSubject").innerText = mail.subject;
  document.getElementById("viewBody").innerText = mail.body;
}

// -------------------
// ADMIN: LOAD USERS
// -------------------
async function loadUsers(){
  const users = await api("/api/users");
  const list = document.getElementById("userList");
  list.innerHTML = "";

  users.forEach(u=>{
    const div = document.createElement("div");
    div.innerHTML = `${u.username} <button onclick="deleteUser('${u.username}')">Delete</button>`;
    list.appendChild(div);
  });
}

// -------------------
// ADMIN: DELETE USER
// -------------------
async function deleteUser(username){
  if(!confirm(`Delete ${username}?`)) return;
  await api("/api/delete-user","POST",{username});
  loadUsers();
}

// -------------------
// ADMIN LOGOUT
// -------------------
async function adminLogout(){
  await api("/logout","POST");
  window.location.href="login.html";
}