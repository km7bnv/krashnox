const express = require("express");
const session = require("express-session");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 3000;

// -------------------
// Middleware
// -------------------
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: "supersecretkey",
  resave: false,
  saveUninitialized: false
}));

// Serve static files
app.use(express.static(path.join(__dirname,"public")));

// -------------------
// Database
// -------------------
const db = new sqlite3.Database("mail.db");

// Create users table
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    username TEXT PRIMARY KEY,
    password TEXT,
    isAdmin INTEGER DEFAULT 0
  )
`);

// Create messages table
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Create default admin user if not exists
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

bcrypt.hash(ADMIN_PASSWORD, 10, (err, hash) => {
  if (err) return;
  db.get("SELECT * FROM users WHERE username=?", [ADMIN_USERNAME], (err,row)=>{
    if(!row){
      db.run(
        "INSERT INTO users(username,password,isAdmin) VALUES(?,?,1)",
        [ADMIN_USERNAME, hash]
      );
    }
  });
});

// -------------------
// Helper middleware
// -------------------
function requireLogin(req,res,next){
  if(!req.session.user){
    return res.status(403).json({error:"Not logged in"});
  }
  next();
}

function requireAdmin(req,res,next){
  if(!req.session.user || !req.session.isAdmin){
    return res.status(403).json({error:"Admin only"});
  }
  next();
}

// -------------------
// Signup
// -------------------
app.post("/signup", async (req,res)=>{
  const {username,password} = req.body;

  db.get("SELECT * FROM users WHERE username=?", [username], async (err,row)=>{
    if(row) return res.json({success:false,error:"Username taken"});

    const hash = await bcrypt.hash(password,10);
    db.run("INSERT INTO users(username,password,isAdmin) VALUES(?,?,0)",
      [username,hash], (err)=>{
        if(err) return res.json({success:false,error:"DB error"});
        res.json({success:true});
      });
  });
});

// -------------------
// Login
// -------------------
app.post("/login",(req,res)=>{
  const {username,password} = req.body;

  db.get("SELECT * FROM users WHERE username=?", [username], async (err,row)=>{
    if(!row) return res.json({success:false,error:"User not found"});

    const ok = await bcrypt.compare(password,row.password);
    if(!ok) return res.json({success:false,error:"Wrong password"});

    req.session.user = username;
    req.session.isAdmin = row.isAdmin === 1;

    res.json({success:true,isAdmin:req.session.isAdmin});
  });
});

// -------------------
// Logout
// -------------------
app.post("/logout",(req,res)=>{
  req.session.destroy(()=>res.json({success:true}));
});

// -------------------
// Send Message
// -------------------
app.post("/api/send", requireLogin, (req,res)=>{
  const {toUser,subject,body} = req.body;

  db.get("SELECT * FROM users WHERE username=?", [toUser], (err,row)=>{
    if(!row) return res.json({success:false,error:"Recipient not found"});

    db.run("INSERT INTO messages(fromUser,toUser,subject,body) VALUES(?,?,?,?)",
      [req.session.user,toUser,subject,body], (err)=>{
        if(err) return res.json({success:false,error:"DB error"});
        res.json({success:true});
      });
  });
});

// -------------------
// Inbox
// -------------------
app.get("/api/inbox", requireLogin, (req,res)=>{
  db.all("SELECT * FROM messages WHERE toUser=? ORDER BY timestamp DESC",
    [req.session.user], (err,rows)=>{
      if(err) return res.json([]);
      res.json(rows);
    });
});

// -------------------
// Sent
// -------------------
app.get("/api/sent", requireLogin, (req,res)=>{
  db.all("SELECT * FROM messages WHERE fromUser=? ORDER BY timestamp DESC",
    [req.session.user], (err,rows)=>{
      if(err) return res.json([]);
      res.json(rows);
    });
});

// -------------------
// Admin: List users
// -------------------
app.get("/api/users", requireAdmin, (req,res)=>{
  db.all("SELECT username FROM users WHERE username!=?", [ADMIN_USERNAME], (err,rows)=>{
    if(err) return res.json([]);
    res.json(rows);
  });
});

// -------------------
// Admin: Delete user
// -------------------
app.post("/api/delete-user", requireAdmin, (req,res)=>{
  const {username} = req.body;

  db.run("DELETE FROM users WHERE username=?", [username], ()=>{
    db.run("DELETE FROM messages WHERE fromUser=? OR toUser=?", [username,username], ()=>{
      res.json({success:true});
    });
  });
});

// -------------------
// Protect admin.html
// -------------------
app.get("/admin.html",(req,res,next)=>{
  if(!req.session.user || !req.session.isAdmin){
    return res.redirect("/login.html");
  }
  next();
});

// -------------------
// Start server
// -------------------
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));