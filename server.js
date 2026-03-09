const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "supersecret",
  resave: false,
  saveUninitialized: true
}));


/* ======================
   USERS
====================== */

const users = {
  admin: { password: "admin123", isAdmin: true },
  user: { password: "123", isAdmin: false }
};


/* ======================
   MESSAGE STORAGE
====================== */

let messages = [];


/* ======================
   MAINTENANCE MODE
====================== */

let maintenance = false;


/* ======================
   LOGIN
====================== */

app.post("/login", (req, res) => {
  const { username, password } = req.body;

  const user = users[username];

  if (!user || user.password !== password) {
    return res.json({ success: false });
  }

  req.session.user = username;
  req.session.isAdmin = user.isAdmin;

  res.json({ success: true, isAdmin: user.isAdmin });
});


/* ======================
   LOGOUT
====================== */

app.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});


/* ======================
   SEND MESSAGE
====================== */

app.post("/send", (req, res) => {

  if (!req.session.user) {
    return res.status(401).json({ error: "Not logged in" });
  }

  const { to, subject, body } = req.body;

  const msg = {
    from: req.session.user,
    to: to,
    subject: subject,
    body: body,
    time: Date.now()
  };

  messages.push(msg);

  res.json({ success: true });

});


/* ======================
   INBOX
====================== */

app.get("/inbox", (req, res) => {

  if (!req.session.user) {
    return res.json([]);
  }

  const inbox = messages.filter(
    m => m.to === req.session.user
  );

  res.json(inbox);

});


/* ======================
   SENT MESSAGES
====================== */

app.get("/sent", (req, res) => {

  if (!req.session.user) {
    return res.json([]);
  }

  const sent = messages.filter(
    m => m.from === req.session.user
  );

  res.json(sent);

});


/* ======================
   ADMIN LOGIN CHECK
====================== */

function requireAdmin(req, res, next) {

  if (!req.session.user || !req.session.isAdmin) {
    return res.redirect("/");
  }

  next();

}


/* ======================
   ADMIN PAGE PROTECTION
====================== */

app.get("/admin.html", requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, "public/admin.html"));
});


/* ======================
   ADMIN LOGOUT
====================== */

app.post("/admin/logout", (req, res) => {

  req.session.destroy(() => {
    res.json({ success: true });
  });

});


/* ======================
   MAINTENANCE TOGGLE
====================== */

app.post("/admin/toggle-maintenance", requireAdmin, (req, res) => {

  maintenance = !maintenance;

  res.json({
    maintenance: maintenance
  });

});


/* ======================
   CHECK MAINTENANCE
====================== */

app.get("/maintenance-status", (req, res) => {

  res.json({
    maintenance: maintenance
  });

});


/* ======================
   STATIC FILES
====================== */

app.use(express.static(path.join(__dirname, "public")));


/* ======================
   START SERVER
====================== */

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});