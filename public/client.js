// -------------------
// API HELPER
// -------------------
async function api(url,method="GET",data=null){
  const options={method,headers:{}}
  if(data){options.headers["Content-Type"]="application/json";options.body=JSON.stringify(data)}
  const res=await fetch(url,options)
  return res.json()
}

// -------------------
// LOGIN / SIGNUP
// -------------------
async function login(){
  const username=document.getElementById("username").value
  const password=document.getElementById("password").value
  const res=await api("/login","POST",{username,password})
  if(res.success){window.location.href = res.isAdmin ? "admin.html":"inbox.html"}
  else alert(res.error)
}

async function signup(){
  const username=document.getElementById("username").value
  const password=document.getElementById("password").value
  const res=await api("/signup","POST",{username,password})
  if(res.success){alert("Account created");window.location.href="login.html"}
  else alert(res.error)
}

// -------------------
// LOGOUT
// -------------------
async function logout(){await api("/logout","POST");window.location.href="index.html"}

// -------------------
// SEND MESSAGE
// -------------------
async function sendMessage(){
  const toUser=document.getElementById("to").value
  const subject=document.getElementById("subject").value
  const body=document.getElementById("body").value
  const threadId=sessionStorage.getItem("replyThread")
  const res=await api("/api/send","POST",{toUser,subject,body,threadId})
  if(res.success){window.location.href="sent.html"}
}

// -------------------
// LOAD INBOX (collapsed threads)
// -------------------
async function loadInbox(){
  const mails=await api("/api/inbox-collapsed")
  const list=document.getElementById("mailList")
  list.innerHTML=""
  mails.forEach(mail=>{
    const div=document.createElement("div")
    div.className="mailItem"
    const unreadClass = mail.read ? "" : "mailUnread"
    const unreadDot = mail.read ? "" : '<span class="unreadDot"></span>'
    div.innerHTML=`<span class="${unreadClass}"><b>${mail.fromUser}</b> - ${mail.subject} ${unreadDot}</span>`
    div.onclick=()=>{
      sessionStorage.setItem("threadId",mail.threadId)
      window.location.href="view.html"
    }
    list.appendChild(div)
  })
}

// -------------------
// LOAD SENT
// -------------------
async function loadSent(){
  const mails=await api("/api/sent")
  const list=document.getElementById("mailList")
  list.innerHTML=""
  mails.forEach(mail=>{
    const div=document.createElement("div")
    div.className="mailItem"
    div.innerHTML=`<span>To <b>${mail.toUser}</b></span> <span>${mail.subject}</span>`
    div.onclick=()=>{
      sessionStorage.setItem("threadId",mail.threadId)
      window.location.href="view.html"
    }
    list.appendChild(div)
  })
}

// -------------------
// LOAD THREAD
// -------------------
async function loadThread(){
  const threadId=sessionStorage.getItem("threadId")
  const messages=await api("/api/thread?id="+threadId)
  const convo=document.getElementById("conversation")
  convo.innerHTML=""
  for(const m of messages){
    const div=document.createElement("div")
    div.className="message"
    div.innerHTML=`
      <b>${m.fromUser}</b>
      <p>${m.body}</p>
      <button onclick="deleteMessage(${m.id})">Delete</button>
      <hr>
    `
    convo.appendChild(div)
    if(!m.read) await api("/api/mark-read","POST",{id:m.id})
  }
}

// -------------------
// DELETE MESSAGE
// -------------------
async function deleteMessage(id){
  const res=await api("/api/delete","POST",{id})
  if(res.success) loadThread()
}

// -------------------
// REPLY
// -------------------
function reply(){
  const threadId=sessionStorage.getItem("threadId")
  sessionStorage.setItem("replyThread",threadId)
  window.location.href="compose.html"
}

// -------------------
// ADMIN USERS
// -------------------
async function loadUsers(){
  const users=await api("/api/users")
  const list=document.getElementById("userList")
  list.innerHTML=""
  users.forEach(u=>{
    const div=document.createElement("div")
    div.innerHTML=u.username+' <button onclick="deleteUser(\''+u.username+'\')">Delete</button>'
    list.appendChild(div)
  })
}

async function deleteUser(username){
  await api("/api/delete-user","POST",{username})
  loadUsers()
}