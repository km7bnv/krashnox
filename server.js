const express = require("express");
const session = require("express-session");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use(session({
  secret: "secret123",
  resave: false,
  saveUninitialized: true
}));

app.use(express.static(path.join(__dirname,"public")));

let users = [
  { username:"admin", password:"admin123", isAdmin:true }
];

let messages = [];

// LOGIN
app.post("/login",(req,res)=>{

  const {username,password}=req.body;

  const user=users.find(u=>u.username===username && u.password===password);

  if(!user){
    return res.json({success:false,error:"Invalid login"});
  }

  req.session.user=username;
  req.session.isAdmin=user.isAdmin;

  res.json({success:true,isAdmin:user.isAdmin});
});


// SIGNUP
app.post("/signup",(req,res)=>{

  const {username,password}=req.body;

  if(users.find(u=>u.username===username)){
    return res.json({success:false,error:"User exists"});
  }

  users.push({
    username,
    password,
    isAdmin:false
  });

  res.json({success:true});
});


// SEND MAIL
app.post("/api/send",(req,res)=>{

  if(!req.session.user)
    return res.json({success:false,error:"Not logged in"});

  const {toUser,subject,body}=req.body;

  messages.push({
    fromUser:req.session.user,
    toUser,
    subject,
    body
  });

  res.json({success:true});
});


// INBOX
app.get("/api/inbox",(req,res)=>{

  if(!req.session.user)
    return res.json([]);

  const inbox = messages.filter(
    m => m.toUser === req.session.user
  );

  res.json(inbox);
});


// SENT
app.get("/api/sent",(req,res)=>{

  if(!req.session.user)
    return res.json([]);

  const sent = messages.filter(
    m => m.fromUser === req.session.user
  );

  res.json(sent);
});


// ADMIN USERS
app.get("/api/users",(req,res)=>{

  if(!req.session.isAdmin)
    return res.json([]);

  res.json(users);
});


// DELETE USER
app.post("/api/delete-user",(req,res)=>{

  if(!req.session.isAdmin)
    return res.json({success:false});

  const {username}=req.body;

  users = users.filter(u=>u.username!==username);

  messages = messages.filter(
    m => m.fromUser !== username && m.toUser !== username
  );

  res.json({success:true});
});


// ADMIN PAGE PROTECTION
app.get("/admin.html",(req,res,next)=>{

  if(!req.session.isAdmin){
    return res.redirect("/login.html");
  }

  next();

});

app.listen(PORT,()=>{
  console.log("Server running on port "+PORT);
});