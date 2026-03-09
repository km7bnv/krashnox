const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("mail.db");

const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "supersecret";

// ------------------
// Middleware
// ------------------

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "mail_secret_key",
  resave: false,
  saveUninitialized: false
}));

// ------------------
// Database tables
// ------------------

db.run(`
CREATE TABLE IF NOT EXISTS users (
  username TEXT PRIMARY KEY,
  password TEXT
)
`);

db.run(`
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender TEXT,
  recipient TEXT,
  subject TEXT,
  body TEXT,
  time DATETIME DEFAULT CURRENT_TIMESTAMP
)
`);

// ------------------
// Create admin user
// ------------------

bcrypt.hash(ADMIN_PASSWORD,10).then(hash=>{

  db.get(
    "SELECT * FROM users WHERE username=?",
    [ADMIN_USERNAME],
    (err,row)=>{

      if(!row){
        db.run(
          "INSERT INTO users(username,password) VALUES(?,?)",
          [ADMIN_USERNAME,hash]
        );
      }

    }
  );

});

// ------------------
// Auth middleware
// ------------------

function requireLogin(req,res,next){

  if(!req.session.user){
    return res.status(403).send("Not logged in");
  }

  next();

}

function requireAdmin(req,res,next){

  if(!req.session.user || req.session.user !== ADMIN_USERNAME){
    return res.status(403).send("Admin only");
  }

  next();

}

// ------------------
// Static files
// ------------------

app.use(express.static("public"));

// ------------------
// Protect admin page
// ------------------

app.get("/admin.html", requireAdmin, (req,res)=>{
  res.sendFile(path.join(__dirname,"public","admin.html"));
});

// ------------------
// Signup
// ------------------

app.post("/signup", async (req,res)=>{

  const {username,password}=req.body;

  const hash = await bcrypt.hash(password,10);

  db.run(
    "INSERT INTO users(username,password) VALUES(?,?)",
    [username,hash],
    function(err){

      if(err) return res.send({error:"Username taken"});

      res.send({success:true});

    }
  );

});

// ------------------
// Login
// ------------------

app.post("/login",(req,res)=>{

  const {username,password}=req.body;

  db.get(
    "SELECT * FROM users WHERE username=?",
    [username],
    async (err,row)=>{

      if(!row) return res.send({error:"User not found"});

      const ok = await bcrypt.compare(password,row.password);

      if(!ok) return res.send({error:"Wrong password"});

      req.session.user=username;

      res.send({
        success:true,
        isAdmin: username===ADMIN_USERNAME
      });

    }
  );

});

// ------------------
// Logout
// ------------------

app.post("/logout",(req,res)=>{

  req.session.destroy(()=>{
    res.send({success:true});
  });

});

// ------------------
// Send message
// ------------------

app.post("/api/send", requireLogin, (req,res)=>{

  const {toUser,subject,body}=req.body;

  db.run(
    "INSERT INTO messages(sender,recipient,subject,body) VALUES(?,?,?,?)",
    [req.session.user,toUser,subject,body],
    function(err){

      if(err) return res.send({error:"DB error"});

      res.send({success:true});

    }
  );

});

// ------------------
// Inbox
// ------------------

app.get("/api/inbox", requireLogin, (req,res)=>{

  db.all(
    "SELECT * FROM messages WHERE recipient=? ORDER BY time DESC",
    [req.session.user],
    (err,rows)=>{

      if(err) return res.send([]);

      res.send(rows);

    }
  );

});

// ------------------
// Sent messages
// ------------------

app.get("/api/sent", requireLogin, (req,res)=>{

  db.all(
    "SELECT * FROM messages WHERE sender=? ORDER BY time DESC",
    [req.session.user],
    (err,rows)=>{

      if(err) return res.send([]);

      res.send(rows);

    }
  );

});

// ------------------
// Admin: list users
// ------------------

app.get("/api/users", requireAdmin, (req,res)=>{

  db.all(
    "SELECT username FROM users WHERE username != ?",
    [ADMIN_USERNAME],
    (err,rows)=>{

      res.send(rows);

    }
  );

});

// ------------------
// Admin: delete user
// ------------------

app.post("/api/delete-user", requireAdmin, (req,res)=>{

  const {username}=req.body;

  db.run(
    "DELETE FROM users WHERE username=?",
    [username],
    ()=>{

      db.run(
        "DELETE FROM messages WHERE sender=? OR recipient=?",
        [username,username]
      );

      res.send({success:true});

    }
  );

});

// ------------------

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
  console.log("Server running on port "+PORT);
});