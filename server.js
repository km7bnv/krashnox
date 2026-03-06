const express = require("express")
const sqlite3 = require("sqlite3").verbose()
const bcrypt = require("bcrypt")

const app = express()

app.use(express.json())
app.use(express.static("public"))

const db = new sqlite3.Database("mail.db")

db.serialize(()=>{

db.run(`
CREATE TABLE IF NOT EXISTS users(
id INTEGER PRIMARY KEY AUTOINCREMENT,
username TEXT UNIQUE,
password TEXT
)
`)

db.run(`
CREATE TABLE IF NOT EXISTS messages(
id INTEGER PRIMARY KEY AUTOINCREMENT,
sender TEXT,
receiver TEXT,
subject TEXT,
body TEXT,
read INTEGER DEFAULT 0,
timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
)
`)

})

app.post("/api/signup", async (req,res)=>{

const {username,password}=req.body
const hash=await bcrypt.hash(password,10)

db.run(
"INSERT INTO users(username,password) VALUES(?,?)",
[username,hash],
err=>{
if(err) return res.json({error:"User exists"})
res.json({success:true})
}
)

})

app.post("/api/login",(req,res)=>{

const {username,password}=req.body

db.get(
"SELECT * FROM users WHERE username=?",
[username],
async (err,user)=>{

if(!user) return res.json({error:"Invalid login"})

const ok=await bcrypt.compare(password,user.password)

if(!ok) return res.json({error:"Invalid login"})

res.json({success:true})

}
)

})

app.post("/api/send",(req,res)=>{

const {from,to,subject,body}=req.body

db.run(
`INSERT INTO messages(sender,receiver,subject,body)
VALUES(?,?,?,?)`,
[from,to,subject,body],
()=>res.json({success:true})
)

})

app.get("/api/inbox",(req,res)=>{

const user=req.query.user

db.all(
`SELECT * FROM messages
WHERE receiver=?
ORDER BY timestamp DESC`,
[user],
(err,rows)=>res.json(rows)
)

})

app.get("/api/sent",(req,res)=>{

const user=req.query.user

db.all(
`SELECT * FROM messages
WHERE sender=?
ORDER BY timestamp DESC`,
[user],
(err,rows)=>res.json(rows)
)

})

app.get("/api/message",(req,res)=>{

const id=req.query.id

db.get(
"SELECT * FROM messages WHERE id=?",
[id],
(err,row)=>{

if(row){
db.run("UPDATE messages SET read=1 WHERE id=?", [id])
}

res.json(row)

}
)

})

app.post("/api/delete",(req,res)=>{

const {id}=req.body

db.run(
"DELETE FROM messages WHERE id=?",
[id],
()=>res.json({success:true})
)

})

const PORT=process.env.PORT||3000

app.listen(PORT,()=>console.log("Server running"))