// ======================
// API helper
// ======================

async function api(url, method="GET", data=null){

  const options = {
    method,
    headers:{}
  };

  if(data){
    options.headers["Content-Type"]="application/json";
    options.body=JSON.stringify(data);
  }

  const res = await fetch(url,options);
  return res.json();
}


// ======================
// LOGIN
// ======================

async function login(){

  const username=document.getElementById("username").value;
  const password=document.getElementById("password").value;

  const res=await api("/login","POST",{username,password});

  if(res.success){

    if(res.isAdmin)
      window.location.href="admin.html";
    else
      window.location.href="inbox.html";

  }else{
    alert(res.error);
  }

}


// ======================
// SIGNUP
// ======================

async function signup(){

  const username=document.getElementById("username").value;
  const password=document.getElementById("password").value;

  const res=await api("/signup","POST",{username,password});

  if(res.success){

    alert("Account created");
    window.location.href="login.html";

  }else{
    alert(res.error);
  }

}


// ======================
// SEND MESSAGE
// ======================

async function sendMessage(){

  const toUser=document.getElementById("to").value;
  const subject=document.getElementById("subject").value;
  const body=document.getElementById("body").value;

  const res=await api("/api/send","POST",{toUser,subject,body});

  if(res.success){

    alert("Message sent");
    window.location.href="sent.html";

  }else{
    alert(res.error);
  }

}


// ======================
// LOAD INBOX
// ======================

async function loadInbox(){

  const mails=await api("/api/inbox");

  const list=document.getElementById("mailList");
  list.innerHTML="";

  mails.forEach(mail=>{

    const div=document.createElement("div");
    div.className="mailItem";

    const unread=mail.read ? "" : "<span class='unreadDot'></span>";

    div.innerHTML=
      "<span><b>"+mail.fromUser+"</b> - "+
      (mail.subject || "(No subject)")+
      "</span>"+unread;

    div.onclick=()=>{
      sessionStorage.setItem("mail",JSON.stringify(mail));
      window.location.href="view.html";
    };

    list.appendChild(div);

  });

}


// ======================
// LOAD SENT
// ======================

async function loadSent(){

  const mails=await api("/api/sent");

  const list=document.getElementById("mailList");
  list.innerHTML="";

  mails.forEach(mail=>{

    const div=document.createElement("div");
    div.className="mailItem";

    div.innerHTML=
      "<span>To: <b>"+mail.toUser+"</b> - "+
      (mail.subject || "(No subject)")+
      "</span>";

    div.onclick=()=>{
      sessionStorage.setItem("mail",JSON.stringify(mail));
      window.location.href="view.html";
    };

    list.appendChild(div);

  });

}


// ======================
// LOAD THREAD
// ======================

async function loadConversation(){

  const mail=JSON.parse(sessionStorage.getItem("mail"));

  if(!mail) return;

  document.getElementById("viewSubject").innerText=mail.subject;

  const msgs=await api("/api/thread?id="+mail.threadId);

  const convo=document.getElementById("conversation");
  convo.innerHTML="";

  msgs.forEach(m=>{

    const div=document.createElement("div");
    div.className="message";

    div.innerHTML="<b>"+m.fromUser+"</b><br>"+m.body;

    convo.appendChild(div);

  });

}


// ======================
// REPLY
// ======================

function replyMessage(){

  const mail=JSON.parse(sessionStorage.getItem("mail"));

  sessionStorage.setItem("replyTo",mail.fromUser);
  sessionStorage.setItem("replySubject","Re: "+mail.subject);
  sessionStorage.setItem("threadId",mail.threadId);

  window.location.href="compose.html";

}


// ======================
// DELETE MESSAGE
// ======================

async function deleteMessage(){

  const mail=JSON.parse(sessionStorage.getItem("mail"));

  if(!confirm("Delete message?")) return;

  const res=await api("/api/delete","POST",{id:mail.id});

  if(res.success)
    window.location.href="inbox.html";
  else
    alert(res.error);

}


// ======================
// AUTO FILL REPLY
// ======================

window.addEventListener("load",()=>{

  const to=document.getElementById("to");
  const subject=document.getElementById("subject");

  if(!to || !subject) return;

  const replyTo=sessionStorage.getItem("replyTo");
  const replySubject=sessionStorage.getItem("replySubject");

  if(replyTo){
    to.value=replyTo;
    sessionStorage.removeItem("replyTo");
  }

  if(replySubject){
    subject.value=replySubject;
    sessionStorage.removeItem("replySubject");
  }

});


// ======================
// ADMIN LOAD USERS
// ======================

async function loadUsers(){

  const users=await api("/api/users");

  const list=document.getElementById("userList");
  list.innerHTML="";

  users.forEach(u=>{

    const div=document.createElement("div");

    div.innerHTML=
      u.username+
      " <button onclick=\"deleteUser('"+u.username+"')\">Delete</button>";

    list.appendChild(div);

  });

}


// ======================
// ADMIN DELETE USER
// ======================

async function deleteUser(username){

  if(!confirm("Delete "+username+"?")) return;

  await api("/api/delete-user","POST",{username});

  loadUsers();

}

async function logout(){

  try{

    const res = await fetch("/logout",{
      method:"POST",
      headers:{
        "Content-Type":"application/json"
      }
    });

    const data = await res.json();

    if(data.success){
      window.location.href="index.html";
    }else{
      alert("Logout failed");
    }

  }catch(err){
    console.error(err);
    window.location.href="index.html";
  }

}