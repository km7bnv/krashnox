const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("mail.db");

// Admin config
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin"; // change this

let adminHashedPassword;
bcrypt.hash(ADMIN_PASSWORD, 10).then(hash => {
  adminHashedPassword = hash;

  db.get("SELECT * FROM users WHERE username = ?", [ADMIN_USERNAME], (err,row)=>{
    if(err) console.log(err);
    if(!row){
      db.run("INSERT INTO users (username,password) VALUES (?,?)", [ADMIN_USERNAME, adminHashedPassword]);
    }
  });
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
  secret: "some_secret_key",
  resave: false,
  saveUninitialized: false
}));
app.use(express.static(path.join(__dirname,"public")));

// DB tables
db.run(`CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT
)`);

db.run(`CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUser TEXT,
  toUser TEXT,
  subject TEXT,
  body TEXT,
  read INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)`);

// --------------------
// Routes
// --------------------

// Signup
app.post("/signup", async (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send({error:"Username and password required"});
  
  const hashed = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (username,password) VALUES (?,?)", [username, hashed], function(err){
    if(err) return res.status(400).send({error:"Username taken"});
    res.send({success:true});
  });
});

// Login
app.post("/login", (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send({error:"Username and password required"});

  db.get("SELECT * FROM users WHERE username = ?", [username], async (err,row)=>{
    if(err) return res.status(500).send({error:"DB error"});
    if(!row) return res.status(400).send({error:"User not found"});

    const match = await bcrypt.compare(password, row.password);
    if(!match) return res.status(400).send({error:"Incorrect password"});

    req.session.user = username;
    req.session.isAdmin = (username === ADMIN_USERNAME);
    res.send({success:true});
  });
});

// Logout
app.post("/logout", (req,res)=>{
  req.session.destroy();
  res.send({success:true});
});

// Middleware to protect auth pages
function requireLogin(req,res,next){
  if(req.session && req.session.user) return next();
  res.status(403).send({error:"Not logged in"});
}

// Middleware to protect admin
function requireAdmin(req,res,next){
  if(req.session && req.session.isAdmin) return next();
  res.status(403).send({error:"Admin only"});
}

// Get inbox messages
app.get("/api/inbox", requireLogin, (req,res)=>{
  db.all("SELECT * FROM messages WHERE toUser = ? ORDER BY timestamp DESC", [req.session.user], (err,rows)=>{
    if(err) return res.status(500).send({error:"DB error"});
    res.send(rows);
  });
});

// Get sent messages
app.get("/api/sent", requireLogin, (req,res)=>{
  db.all("SELECT * FROM messages WHERE fromUser = ? ORDER BY timestamp DESC", [req.session.user], (err,rows)=>{
    if(err) return res.status(500).send({error:"DB error"});
    res.send(rows);
  });
});

// Send message
app.post("/api/send", requireLogin, (req,res)=>{
  const { toUser, subject, body } = req.body;
  if(!toUser || !body) return res.status(400).send({error:"Recipient and body required"});

  db.run("INSERT INTO messages (fromUser,toUser,subject,body) VALUES (?,?,?,?)",
    [req.session.user,toUser,subject||"",body], function(err){
      if(err) return res.status(500).send({error:"DB error"});
      res.send({success:true});
    });
});

// Mark message as read
app.post("/api/read/:id", requireLogin, (req,res)=>{
  db.run("UPDATE messages SET read=1 WHERE id=? AND toUser=?",
    [req.params.id, req.session.user], function(err){
      if(err) return res.status(500).send({error:"DB error"});
      res.send({success:true});
    });
});

// Delete message
app.post("/api/delete/:id", requireLogin, (req,res)=>{
  db.run("DELETE FROM messages WHERE id=? AND (fromUser=? OR toUser=?)",
    [req.params.id, req.session.user, req.session.user], function(err){
      if(err) return res.status(500).send({error:"DB error"});
      res.send({success:true});
    });
});

// Admin: list users
app.get("/api/users", requireAdmin, (req,res)=>{
  db.all("SELECT username FROM users WHERE username != ?", [ADMIN_USERNAME], (err,rows)=>{
    if(err) return res.status(500).send({error:"DB error"});
    res.send(rows);
  });
});

// Admin: delete user
app.post("/api/delete-user", requireAdmin, (req,res)=>{
  const { username } = req.body;
  if(!username) return res.status(400).send({error:"Username required"});

  db.run("DELETE FROM users WHERE username = ?", [username], function(err){
    if(err) return res.status(500).send({error:"DB error"});
    db.run("DELETE FROM messages WHERE toUser = ? OR fromUser = ?", [username, username]);
    res.send({success:true});
  });
});

// Serve homepage (index.html)
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log(`Server running on port ${PORT}`));