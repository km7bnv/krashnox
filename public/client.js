// -------------------
// API HELPER
// -------------------
async function api(url, method = "GET", data = null) {
  const options = { method, headers: {} }
  if (data) {
    options.headers["Content-Type"] = "application/json"
    options.body = JSON.stringify(data)
  }
  const res = await fetch(url, options)
  return res.json()
}

// -------------------
// LOGIN / SIGNUP
// -------------------
async function login() {
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value
  const res = await api("/login", "POST", { username, password })
  if (res.success) window.location.href = res.isAdmin ? "admin.html" : "inbox.html"
  else alert(res.error)
}

async function signup() {
  const username = document.getElementById("username").value
  const password = document.getElementById("password").value
  const res = await api("/signup", "POST", { username, password })
  if (res.success) {
    alert("Account created")
    window.location.href = "login.html"
  } else alert(res.error)
}

// -------------------
// LOGOUT
// -------------------
async function logout() {
  await api("/logout", "POST")
  window.location.href = "index.html"
}

// -------------------
// SEND MESSAGE / REPLY
// -------------------
async function sendMessage() {
  const subject = document.getElementById("subject").value
  const body = document.getElementById("body").value
  const threadId = sessionStorage.getItem("replyThread")

  let toUser = null
  if (threadId) {
    // Find recipient from thread
    const messages = await api("/api/thread?id=" + threadId)
    if (messages.length > 0) {
      toUser = messages[0].fromUser === sessionStorage.getItem("username")
        ? messages[0].toUser
        : messages[0].fromUser
    }
  }

  // For new messages (not a reply)
  if (!toUser) {
    toUser = document.getElementById("to")?.value
    if (!toUser) return alert("Recipient required")
  }

  const res = await api("/api/send", "POST", { toUser, subject, body, threadId })
  if (res.success) {
    sessionStorage.removeItem("replyThread")
    window.location.href = "inbox.html" // Redirect to inbox after sending
  }
}

// -------------------
// LOAD INBOX (collapsed threads)
// -------------------
async function loadInbox() {
  const mails = await api("/api/inbox-collapsed")
  const list = document.getElementById("mailList")
  if (!list) return
  list.innerHTML = ""

  for (const mail of mails) {
    const div = document.createElement("div")
    div.className = "mail-item"

    // Check if any message in this thread is unread
    const threadMessages = await api("/api/thread?id=" + mail.threadId)
    const hasUnread = threadMessages.some(m => m.read === 0)
    const unreadClass = hasUnread ? "mailUnread" : ""
    const unreadDot = hasUnread ? '<span class="unreadDot"></span>' : ""

    div.innerHTML = `
      <span class="${unreadClass}">
        <b>${mail.fromUser}</b> - ${mail.subject} ${unreadDot}
      </span>
    `
    div.onclick = () => {
      sessionStorage.setItem("threadId", mail.threadId)
      window.location.href = "view.html"
    }
    list.appendChild(div)
  }
}

// -------------------
// LOAD SENT
// -------------------
async function loadSent() {
  const mails = await api("/api/sent")
  const list = document.getElementById("mailList")
  if (!list) return
  list.innerHTML = ""

  for (const mail of mails) {
    const div = document.createElement("div")
    div.className = "mail-item"

    // Optional: show unread if any recipient hasn't read
    const threadMessages = await api("/api/thread?id=" + mail.threadId)
    const hasUnread = threadMessages.some(m => m.read === 0 && m.fromUser !== sessionStorage.getItem("username"))
    const unreadClass = hasUnread ? "mailUnread" : ""
    const unreadDot = hasUnread ? '<span class="unreadDot"></span>' : ""

    div.innerHTML = `
      <span class="${unreadClass}">
        To <b>${mail.toUser}</b> - ${mail.subject} ${unreadDot}
      </span>
    `
    div.onclick = () => {
      sessionStorage.setItem("threadId", mail.threadId)
      window.location.href = "view.html"
    }
    list.appendChild(div)
  }
}

// -------------------
// LOAD THREAD VIEW
// -------------------
async function loadThread() {
  const threadId = sessionStorage.getItem("threadId")
  if (!threadId) return
  const convo = document.getElementById("conversation")
  if (!convo) return
  const messages = await api("/api/thread?id=" + threadId)
  convo.innerHTML = ""

  for (const m of messages) {
    const div = document.createElement("div")
    div.className = "message"
    const unreadClass = m.read ? "" : "mailUnread"
    const unreadDot = m.read ? "" : '<span class="unreadDot"></span>'
    div.innerHTML = `
      <b class="${unreadClass}">${m.fromUser}</b> ${unreadDot}
      <p>${m.body}</p>
      <hr>
    `
    convo.appendChild(div)

    if (!m.read) await api("/api/mark-read", "POST", { id: m.id })
  }
}

// -------------------
// DELETE ENTIRE THREAD
// -------------------
async function deleteThread() {
  const threadId = sessionStorage.getItem("threadId")
  if (!threadId) return alert("No thread selected")
  const messages = await api("/api/thread?id=" + threadId)
  for (const m of messages) {
    await api("/api/delete", "POST", { id: m.id })
  }
  window.location.href = "inbox.html"
}

// -------------------
// REPLY
// -------------------
function reply() {
  const threadId = sessionStorage.getItem("threadId")
  if (!threadId) return
  sessionStorage.setItem("replyThread", threadId)
  window.location.href = "reply.html"
}

// -------------------
// ADMIN USERS
// -------------------
async function loadUsers() {
  const users = await api("/api/users")
  const list = document.getElementById("userList")
  if (!list) return
  list.innerHTML = ""
  users.forEach(u => {
    const div = document.createElement("div")
    div.innerHTML = u.username + ' <button onclick="deleteUser(\'' + u.username + '\')">Delete</button>'
    list.appendChild(div)
  })
}

async function deleteUser(username) {
  await api("/api/delete-user", "POST", { username })
  loadUsers()
}

// -------------------
// DOM READY HOOK
// -------------------
document.addEventListener("DOMContentLoaded", () => {
  if (document.getElementById("conversation")) loadThread()
  if (document.getElementById("mailList")) {
    const page = window.location.pathname.split("/").pop()
    if (page === "inbox.html") loadInbox()
    if (page === "sent.html") loadSent()
  }
})