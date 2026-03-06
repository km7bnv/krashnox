// ==================== DOM ELEMENTS ====================
const inboxList = document.getElementById("inboxList");
const sentList = document.getElementById("sentList");
const fullMessagePanel = document.getElementById("fullMessage");
const fullMessageContent = document.getElementById("fullMessageContent");
const composeForm = document.getElementById("composeForm");

// ==================== FUNCTIONS ====================

// Render inbox (use your system's inboxMessages array)
function renderInbox() {
  if(!inboxList || !window.inboxMessages) return;
  inboxList.innerHTML = "";
  window.inboxMessages.forEach(msg => {
    const item = document.createElement("div");
    item.classList.add("message-item");

    const info = document.createElement("div");
    info.classList.add("info");
    info.innerHTML = `
      <span><strong>From:</strong> ${msg.from}</span>
      <span><strong>Subject:</strong> ${msg.subject}</span>
      <span class="snippet">${msg.snippet}</span>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      // call your system's delete function here
      deleteInboxMessage(msg.id);
    });

    item.appendChild(info);
    item.appendChild(deleteBtn);

    item.addEventListener("click", () => {
      fullMessageContent.textContent = msg.body;
      fullMessagePanel.classList.remove("hidden");
    });

    inboxList.appendChild(item);
  });
}

// Render sent (use your system's sentMessages array)
function renderSent() {
  if(!sentList || !window.sentMessages) return;
  sentList.innerHTML = "";
  window.sentMessages.forEach(msg => {
    const item = document.createElement("div");
    item.classList.add("message-item");

    const info = document.createElement("div");
    info.classList.add("info");
    info.innerHTML = `
      <span><strong>To:</strong> ${msg.to}</span>
      <span><strong>Subject:</strong> ${msg.subject}</span>
      <span class="snippet">${msg.snippet}</span>
    `;

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.addEventListener("click", e => {
      e.stopPropagation();
      // call your system's delete function here
      deleteSentMessage(msg.id);
    });

    item.appendChild(info);
    item.appendChild(deleteBtn);

    item.addEventListener("click", () => {
      fullMessageContent.textContent = msg.body;
      fullMessagePanel.classList.remove("hidden");
    });

    sentList.appendChild(item);
  });
}

// Compose message (keeps your existing system)
if(composeForm){
  composeForm.addEventListener("submit", e => {
    e.preventDefault();
    const to = composeForm.elements["to"].value;
    const subject = composeForm.elements["subject"].value;
    const body = composeForm.elements["body"].value;

    if(!to || !subject || !body){
      alert("Fill all fields!");
      return;
    }

    // call your system's send function here
    sendMessage(to, subject, body);
  });
}

// Close full message panel
if(fullMessagePanel){
  document.getElementById("closeFullMessage").addEventListener("click", () => {
    fullMessagePanel.classList.add("hidden");
  });
}

// ==================== INITIAL RENDER ====================
renderInbox();
renderSent();