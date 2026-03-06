function getToken(){
    return localStorage.getItem("token")
}

// SIGNUP WITH REDIRECT
function signup(){
    const username = document.getElementById("username").value
    const password = document.getElementById("password").value

    fetch("/signup", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({username,password})
    })
    .then(r => r.text())
    .then(msg => {
        alert(msg)
        if(msg.toLowerCase().includes("success")){
            location.href = "login.html" // redirect after successful signup
        }
    })
}

// LOGIN
function login(){
    const username=document.getElementById("username").value
    const password=document.getElementById("password").value

    fetch("/login", {
        method:"POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify({username,password})
    })
    .then(r=>r.json())
    .then(d=>{
        localStorage.setItem("token", d.token)
        location.href="inbox.html"
    })
}

// SEND MESSAGE
function sendMessage(){
    const to=document.getElementById("to").value
    const subject=document.getElementById("subject").value
    const body=document.getElementById("body").value

    fetch("/send", {
        method:"POST",
        headers:{
            "Content-Type":"application/json",
            "Authorization": getToken()
        },
        body: JSON.stringify({to,subject,body})
    })
    .then(()=> alert("Sent"))
}

// DELETE MESSAGE
function deleteMsg(id){
    fetch("/delete/"+id, {
        method:"DELETE",
        headers:{ "Authorization": getToken() }
    })
    .then(()=> location.reload())
}

// SHOW MESSAGES (Inbox/Sent) WITH FULL MESSAGE TOGGLE
function showMessages(messages, isSent=false){
    const chat=document.getElementById("chat")
    chat.innerHTML=""

    messages.forEach(m => {
        const row=document.createElement("div")
        row.className="message"

        // sender/recipient
        const name = isSent ? m.to : m.from

        row.innerHTML = `
            <div class="sender">${name}</div>
            <div class="subject">${m.subject}</div>
            <div class="time">
                <button onclick="deleteMsg('${m.id}')">Delete</button>
            </div>
        `

        // full message container
        const full = document.createElement("div")
        full.className = "full-message"
        full.style.display = "none"
        full.style.padding = "10px 15px"
        full.style.borderTop = "1px solid var(--border-color)"
        full.style.backgroundColor = "rgba(255,255,255,0.05)"
        full.textContent = m.body

        row.appendChild(full)

        // toggle full message on click (ignore delete button clicks)
        row.addEventListener("click", e => {
            if(e.target.tagName !== "BUTTON"){
                full.style.display = full.style.display === "none" ? "block" : "none"
            }
        })

        chat.appendChild(row)
    })
}

// LOAD INBOX
function loadInbox(){
    fetch("/inbox", { headers:{ "Authorization": getToken() } })
    .then(r=>r.json())
    .then(messages => showMessages(messages, false))
}

// LOAD SENT
function loadSent(){
    fetch("/sent", { headers:{ "Authorization": getToken() } })
    .then(r=>r.json())
    .then(messages => showMessages(messages, true))
}