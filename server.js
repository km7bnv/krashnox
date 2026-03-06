const express = require("express")
const fs = require("fs")
const bcrypt = require("bcrypt")
const { v4: uuid } = require("uuid")

const app = express()

app.use(express.json())
app.use(express.static("public"))

function readDB() {
  return JSON.parse(fs.readFileSync("database.json"))
}

function writeDB(data) {
  fs.writeFileSync("database.json", JSON.stringify(data, null, 2))
}

let sessions = {}

function auth(req,res,next){
  const token = req.headers.authorization
  if(!token || !sessions[token]) return res.status(401).send("Not logged in")
  req.user = sessions[token]
  next()
}

app.post("/signup", async (req,res)=>{
  const {username,password} = req.body
  const db = readDB()

  if(db.users.find(u=>u.username===username))
    return res.send("User exists")

  const hash = await bcrypt.hash(password,10)

  db.users.push({
    id: uuid(),
    username,
    password: hash
  })

  writeDB(db)

  res.send("Signup success")
})

app.post("/login", async (req,res)=>{
  const {username,password} = req.body
  const db = readDB()

  const user = db.users.find(u=>u.username===username)
  if(!user) return res.send("Invalid")

  const ok = await bcrypt.compare(password,user.password)
  if(!ok) return res.send("Invalid")

  const token = uuid()
  sessions[token] = user.username

  res.json({token})
})

app.get("/inbox", auth, (req,res)=>{
  const db = readDB()

  const messages = db.messages.filter(m=>m.to===req.user && !m.deletedBy?.includes(req.user))

  res.json(messages)
})

app.get("/sent", auth, (req,res)=>{
  const db = readDB()

  const messages = db.messages.filter(m=>m.from===req.user && !m.deletedBy?.includes(req.user))

  res.json(messages)
})

app.post("/send", auth, (req,res)=>{
  const {to,subject,body} = req.body
  const db = readDB()

  const message = {
    id: uuid(),
    from: req.user,
    to,
    subject,
    body,
    time: Date.now(),
    deletedBy: []
  }

  db.messages.push(message)

  writeDB(db)

  res.send("sent")
})

app.delete("/delete/:id", auth, (req,res)=>{
  const db = readDB()

  const msg = db.messages.find(m=>m.id===req.params.id)

  if(msg && !msg.deletedBy.includes(req.user)){
    msg.deletedBy.push(req.user)
  }

  writeDB(db)

  res.send("deleted")
})

app.listen(3000, ()=>{
  console.log("Server running")
})