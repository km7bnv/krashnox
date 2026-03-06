const user = localStorage.getItem("user")

async function signup(){

const username=document.getElementById("username").value
const password=document.getElementById("password").value

const res=await fetch("/api/signup",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})

const data=await res.json()

if(data.success){
location.href="login.html"
}else{
alert(data.error)
}

}

async function login(){

const username=document.getElementById("username").value
const password=document.getElementById("password").value

const res=await fetch("/api/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})

const data=await res.json()

if(data.success){

localStorage.setItem("user",username)

location.href="inbox.html"

}else{

alert("Login failed")

}

}

async function sendMessage(){

const to=document.getElementById("to").value
const subject=document.getElementById("subject").value
const body=document.getElementById("body").value

await fetch("/api/send",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
from:user,
to,
subject,
body
})
})

location.href="sent.html"

}

async function loadInbox(){

const res=await fetch("/api/inbox?user="+user)
const msgs=await res.json()

const list=document.getElementById("mailList")

list.innerHTML=""

msgs.forEach(m=>{

const div=document.createElement("div")

div.className="mailItem"+(m.read?"":" mailUnread")

div.onclick=()=>location.href="view.html?id="+m.id

div.innerHTML=`
<span>${m.sender} - ${m.subject}</span>
${!m.read?'<span class="unreadDot"></span>':""}
`

list.appendChild(div)

})

}

async function loadSent(){

const res=await fetch("/api/sent?user="+user)
const msgs=await res.json()

const list=document.getElementById("mailList")

list.innerHTML=""

msgs.forEach(m=>{

const div=document.createElement("div")

div.className="mailItem"

div.onclick=()=>location.href="view.html?id="+m.id

div.innerHTML=`<span>${m.receiver} - ${m.subject}</span>`

list.appendChild(div)

})

}

async function loadMessage(){

const params=new URLSearchParams(location.search)
const id=params.get("id")

const res=await fetch("/api/message?id="+id)
const msg=await res.json()

document.getElementById("viewSubject").innerText=msg.subject
document.getElementById("viewFrom").innerText=msg.sender
document.getElementById("viewTo").innerText=msg.receiver
document.getElementById("viewBody").innerText=msg.body

document.getElementById("replyBtn").onclick=()=>{

localStorage.setItem("replyTo",msg.sender)
localStorage.setItem("replySubject","Re: "+msg.subject)

location.href="compose.html"

}

window.deleteMessage=async()=>{

await fetch("/api/delete",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({id})
})

location.href="inbox.html"

}

}

function loadComposeReply(){

const to=localStorage.getItem("replyTo")
const subject=localStorage.getItem("replySubject")

if(to){

document.getElementById("to").value=to
document.getElementById("subject").value=subject

localStorage.removeItem("replyTo")
localStorage.removeItem("replySubject")

}

}

if(location.pathname.includes("inbox"))loadInbox()
if(location.pathname.includes("sent"))loadSent()
if(location.pathname.includes("view"))loadMessage()
if(location.pathname.includes("compose"))loadComposeReply()