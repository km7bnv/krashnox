const express=require("express");
const session=require("express-session");
const sqlite3=require("sqlite3").verbose();
const bcrypt=require("bcrypt");

const app=express();
const db=new sqlite3.Database("./database.db");

app.use(express.json());

app.use(session({
  secret:"email-secret",
  resave:false,
  saveUninitialized:false
}));

app.get("/admin.html",(req,res)=>{

  if(!req.session.admin){
    return res.redirect("/login.html");
  }

  res.sendFile(__dirname + "/public/admin.html");

});

app.use(express.static("public"));


// ======================
// DATABASE
// ======================

db.serialize(()=>{

  db.run(`
  CREATE TABLE IF NOT EXISTS users(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT
  )
  `);

  db.run(`
  CREATE TABLE IF NOT EXISTS messages(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fromUser TEXT,
    toUser TEXT,
    subject TEXT,
    body TEXT,
    threadId INTEGER,
    read INTEGER DEFAULT 0
  )
  `);

});


// ======================
// LOGIN
// ======================

app.post("/login",(req,res)=>{

  const {username,password}=req.body;

  if(username==="admin" && password==="adminpass"){

    req.session.user="admin";
    req.session.admin=true;

    return res.json({success:true,isAdmin:true});
  }

  db.get("SELECT * FROM users WHERE username=?",[username],async (err,user)=>{

    if(!user)
      return res.json({success:false,error:"User not found"});

    const match=await bcrypt.compare(password,user.password);

    if(!match)
      return res.json({success:false,error:"Wrong password"});

    req.session.user=username;

    res.json({success:true});

  });

});


// ======================
// SIGNUP
// ======================

app.post("/signup",async (req,res)=>{

  const {username,password}=req.body;

  const hash=await bcrypt.hash(password,10);

  db.run(
    "INSERT INTO users(username,password) VALUES(?,?)",
    [username,hash],
    err=>{
      if(err)
        res.json({success:false,error:"Username exists"});
      else
        res.json({success:true});
    }
  );

});


// ======================
// SEND MESSAGE
// ======================

app.post("/api/send",(req,res)=>{

  if(!req.session.user)
    return res.json({success:false,error:"Not logged in"});

  const {toUser,subject,body}=req.body;

  const threadId=Date.now();

  db.run(
    `INSERT INTO messages(fromUser,toUser,subject,body,threadId)
     VALUES(?,?,?,?,?)`,
    [req.session.user,toUser,subject,body,threadId],
    err=>{
      if(err) res.json({success:false});
      else res.json({success:true});
    }
  );

});


// ======================
// INBOX
// ======================

app.get("/api/inbox",(req,res)=>{

  if(!req.session.user)
    return res.json([]);

  db.all(
    "SELECT * FROM messages WHERE toUser=? ORDER BY id DESC",
    [req.session.user],
    (err,rows)=>{
      res.json(rows);
    }
  );

});


// ======================
// SENT
// ======================

app.get("/api/sent",(req,res)=>{

  if(!req.session.user)
    return res.json([]);

  db.all(
    "SELECT * FROM messages WHERE fromUser=? ORDER BY id DESC",
    [req.session.user],
    (err,rows)=>{
      res.json(rows);
    }
  );

});


// ======================
// THREAD
// ======================

app.get("/api/thread",(req,res)=>{

  const id=req.query.id;

  db.all(
    "SELECT * FROM messages WHERE threadId=? ORDER BY id",
    [id],
    (err,rows)=>{
      res.json(rows);
    }
  );

});


// ======================
// DELETE MESSAGE
// ======================

app.post("/api/delete",(req,res)=>{

  const {id}=req.body;

  db.run(
    "DELETE FROM messages WHERE id=? AND (toUser=? OR fromUser=?)",
    [id,req.session.user,req.session.user],
    err=>{
      if(err) res.json({success:false});
      else res.json({success:true});
    }
  );

});


// ======================
// ADMIN USERS
// ======================

app.get("/api/users",(req,res)=>{

  if(!req.session.admin)
    return res.json([]);

  db.all("SELECT username FROM users",(err,rows)=>{
    res.json(rows);
  });

});


// ======================
// ADMIN DELETE USER
// ======================

app.post("/api/delete-user",(req,res)=>{

  if(!req.session.admin)
    return res.json({success:false});

  const {username}=req.body;

  db.run(
    "DELETE FROM users WHERE username=?",
    [username],
    err=>{
      if(err) res.json({success:false});
      else res.json({success:true});
    }
  );

});

// ======================
// LOGOUT
// ======================

app.post("/logout",(req,res)=>{

  req.session.destroy(err=>{

    if(err){
      return res.json({success:false});
    }

    res.json({success:true});

  });

});


app.listen(3000,()=>{
  console.log("Server running");
});