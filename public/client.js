function getToken(){
return localStorage.getItem("token")
}

function signup(){
const username=document.getElementById("username").value
const password=document.getElementById("password").value

fetch("/signup",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
}).then(r=>r.text()).then(alert)
}

function login(){
const username=document.getElementById("username").value
const password=document.getElementById("password").value

fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({username,password})
})
.then(r=>r.json())
.then(d=>{
localStorage.setItem("token",d.token)
location.href="inbox.html"
})
}

function loadInbox(){
fetch("/inbox",{
headers:{authorization:getToken()}
})
.then(r=>r.json())
.then(showMessages)
}

function loadSent(){
fetch("/sent",{
headers:{authorization:getToken()}
})
.then(r=>r.json())
.then(showMessages)
}

function showMessages(messages){
const box=document.getElementById("messages")
box.innerHTML=""

messages.forEach(m=>{
const div=document.createElement("div")
div.className="message"

div.innerHTML=`
<b>${m.subject}</b><br>
From: ${m.from}<br>
To: ${m.to}<br>
${m.body}<br>
<button onclick="deleteMsg('${m.id}')">Delete</button>
`

box.appendChild(div)
})
}

function sendMessage(){
const to=document.getElementById("to").value
const subject=document.getElementById("subject").value
const body=document.getElementById("body").value

fetch("/send",{
method:"POST",
headers:{
"Content-Type":"application/json",
authorization:getToken()
},
body:JSON.stringify({to,subject,body})
}).then(()=>alert("Sent"))
}

function deleteMsg(id){
fetch("/delete/"+id,{
method:"DELETE",
headers:{authorization:getToken()}
})
.then(()=>location.reload())
}