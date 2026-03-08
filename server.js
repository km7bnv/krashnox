const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("mail.db");

// ------------------------
// Admin config
// ------------------------
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "supersecret"; // change this

// ------------------------
// Middleware
// ------------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "mail_secret_key",
  resave: false,
  saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, "public")));

// ------------------------
// Database tables
// ------------------------
db.run(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fromUser TEXT,
  toUser TEXT,
  subject TEXT,
  body TEXT,
  read INTEGER DEFAULT 0,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// ------------------------
// Create admin account
// ------------------------
bcrypt.hash(ADMIN_PASSWORD, 10).then(hash => {

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [ADMIN_USERNAME],
    (err,row)=>{
      if(!row){
        db.run(
          "INSERT INTO users(username,password) VALUES (?,?)",
          [ADMIN_USERNAME, hash]
        );
      }
    }
  );

});

// ------------------------
// Auth middleware
// ------------------------
function requireLogin(req,res,next){
  if(req.session.user) return next();
  res.status(403).send({error:"Not logged in"});
}

function requireAdmin(req,res,next){
  if(req.session.isAdmin) return next();
  res.status(403).send({error:"Admin only"});
}

// ------------------------
// Signup
// ------------------------
app.post("/signup", async (req,res)=>{

  const { username, password } = req.body;

  if(!username || !password)
    return res.status(400).send({error:"Username and password required"});

  const hashed = await bcrypt.hash(password,10);

  db.run(
    "INSERT INTO users(username,password) VALUES (?,?)",
    [username, hashed],
    function(err){

      if(err)
        return res.status(400).send({error:"Username taken"});

      res.send({success:true});

    }
  );

});

// ------------------------
// Login
// ------------------------
app.post("/login", (req,res)=>{

  const { username, password } = req.body;

  db.get(
    "SELECT * FROM users WHERE username = ?",
    [username],
    async (err,row)=>{

      if(!row)
        return res.status(400).send({error:"User not found"});

      const match = await bcrypt.compare(password,row.password);

      if(!match)
        return res.status(400).send({error:"Wrong password"});

      req.session.user = username;
      req.session.isAdmin = username === ADMIN_USERNAME;

      res.send({
        success:true,
        isAdmin:req.session.isAdmin
      });

    }
  );

});

// ------------------------
// Logout
// ------------------------
app.post("/logout",(req,res)=>{
  req.session.destroy();
  res.send({success:true});
});

// ------------------------
// Send message
// ------------------------
app.post("/api/send", requireLogin, (req,res)=>{

  const { toUser, subject, body } = req.body;

  if(!toUser || !body)
    return res.status(400).send({error:"Recipient and body required"});

  db.run(
    "INSERT INTO messages(fromUser,toUser,subject,body) VALUES (?,?,?,?)",
    [req.session.user, toUser, subject || "", body],
    function(err){

      if(err)
        return res.status(500).send({error:"DB error"});

      res.send({success:true});

    }
  );

});

// ------------------------
// Inbox
// ------------------------
app.get("/api/inbox", requireLogin, (req,res)=>{

  db.all(
    "SELECT * FROM messages WHERE toUser=? ORDER BY timestamp DESC",
    [req.session.user],
    (err,rows)=>{

      if(err)
        return res.status(500).send({error:"DB error"});

      res.send(rows);

    }
  );

});

// ------------------------
// Sent
// ------------------------
app.get("/api/sent", requireLogin, (req,res)=>{

  db.all(
    "SELECT * FROM messages WHERE fromUser=? ORDER BY timestamp DESC",
    [req.session.user],
    (err,rows)=>{

      if(err)
        return res.status(500).send({error:"DB error"});

      res.send(rows);

    }
  );

});

// ------------------------
// Mark read
// ------------------------
app.post("/api/read/:id", requireLogin, (req,res)=>{

  db.run(
    "UPDATE messages SET read=1 WHERE id=?",
    [req.params.id],
    ()=>res.send({success:true})
  );

});

// ------------------------
// Delete message
// ------------------------
app.post("/api/delete/:id", requireLogin, (req,res)=>{

  db.run(
    "DELETE FROM messages WHERE id=?",
    [req.params.id],
    ()=>res.send({success:true})
  );

});

// ------------------------
// Admin: list users
// ------------------------
app.get("/api/users", requireAdmin, (req,res)=>{

  db.all(
    "SELECT username FROM users WHERE username != ?",
    [ADMIN_USERNAME],
    (err,rows)=>res.send(rows)
  );

});

// ------------------------
// Admin: delete user
// ------------------------
app.post("/api/delete-user", requireAdmin, (req,res)=>{

  const { username } = req.body;

  db.run(
    "DELETE FROM users WHERE username=?",
    [username],
    ()=>{

      db.run(
        "DELETE FROM messages WHERE fromUser=? OR toUser=?",
        [username,username]
      );

      res.send({success:true});

    }
  );

});

// ------------------------
const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("Server running on port "+PORT);
});