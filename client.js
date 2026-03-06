// ==================== client.js ====================

// Make sure DOM is loaded before attaching any events
document.addEventListener("DOMContentLoaded", () => {

  // ==================== DOM ELEMENTS ====================
  const signupBtn = document.getElementById("signupBtn");
  const loginBtn = document.getElementById("loginBtn");
  const inboxList = document.getElementById("inboxList");
  const sentList = document.getElementById("sentList");
  const fullMessagePanel = document.getElementById("fullMessage");
  const fullMessageContent = document.getElementById("fullMessageContent");
  const composeForm = document.getElementById("composeForm");

  // ==================== HOME SCREEN BUTTONS ====================
  if (signupBtn) {
    signupBtn.addEventListener("click", () => {
      // Call your existing signup display function
      showSignupScreen();  
    });
  }

  if (loginBtn) {
    loginBtn.addEventListener("click", () => {
      // Call your existing login display function
      showLoginScreen();
    });
  }

  // ==================== INBOX / SENT RENDER ====================
  function renderInbox() {
    if (!inboxList || !window.inboxMessages) return;

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
        // Call your existing delete function
        deleteInboxMessage(msg.id);
        renderInbox();
      });

      item.appendChild(info);
      item.appendChild(deleteBtn);

      // Click to view full message
      item.addEventListener("click", () => {
        showFullMessage(msg);
      });

      inboxList.appendChild(item);
    });
  }

  function renderSent() {
    if (!sentList || !window.sentMessages) return;

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
        // Call your existing delete function
        deleteSentMessage(msg.id);
        renderSent();
      });

      item.appendChild(info);
      item.appendChild(deleteBtn);

      item.addEventListener("click", () => {
        showFullMessage(msg);
      });

      sentList.appendChild(item);
    });
  }

  // ==================== COMPOSE MESSAGE ====================
  if (composeForm) {
    composeForm.addEventListener("submit", e => {
      e.preventDefault();
      const to = composeForm.elements["to"].value;
      const subject = composeForm.elements["subject"].value;
      const body = composeForm.elements["body"].value;

      if (!to || !subject || !body) {
        alert("Fill all fields!");
        return;
      }

      // Call your existing send function
      sendMessage(to, subject, body);

      // Reset form
      composeForm.reset();
    });
  }

  // ==================== FULL MESSAGE PANEL ====================
  if (fullMessagePanel) {
    const closeBtn = document.getElementById("closeFullMessage");
    if (closeBtn) {
      closeBtn.addEventListener("click", () => {
        fullMessagePanel.classList.add("hidden");
      });
    }
  }

  // ==================== INITIAL RENDER ====================
  renderInbox();
  renderSent();

});