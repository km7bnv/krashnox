import express from 'express';
import fs from 'fs';
import path from 'path';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Serve static files from root
app.use(express.static(process.cwd()));

// Serve index.html at root
app.get('/', (req,res)=>{
  res.sendFile(path.join(process.cwd(),'index.html'));
});

// DATABASE
const dbFile = path.join(process.cwd(),'database.json');
if(!fs.existsSync(dbFile)){
  fs.writeFileSync(dbFile, JSON.stringify({users: [], messages: []}, null, 2));
}

// SOCKET.IO
io.on('connection', socket => {
  socket.on('join', username => socket.join(username));
});

// SIGNUP
app.post('/signup', (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send('Missing fields');

  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  if(db.users.find(u=>u.username===username)) return res.status(400).send('Username taken');

  db.users.push({ username, password });
  fs.writeFileSync(dbFile, JSON.stringify(db,null,2));
  res.send('User created!');
});

// LOGIN
app.post('/login', (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send('Missing fields');

  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  const user = db.users.find(u=>u.username===username && u.password===password);
  if(!user) return res.status(401).send('Invalid credentials');

  res.send('Logged in!');
});

// SEND MESSAGE
app.post('/send', (req,res)=>{
  const { from, to, subject, body } = req.body;
  if(!from || !to || !subject || !body) return res.status(400).send('Missing fields');

  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  db.messages.push({ from_user: from, to_user: to, subject, body });
  fs.writeFileSync(dbFile, JSON.stringify(db,null,2));

  io.to(to).emit('newMessage',{ from, subject, body });

  res.send('Message sent!');
});

// FETCH INBOX
app.get('/inbox/:username',(req,res)=>{
  const username = req.params.username;
  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  const inbox = db.messages.filter(m=>m.to_user===username);
  res.json(inbox);
});

// FETCH SENT
app.get('/sent/:username',(req,res)=>{
  const username = req.params.username;
  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  const sent = db.messages.filter(m=>m.from_user===username);
  res.json(sent);
});

// DELETE INBOX MESSAGE
app.delete('/message/:index/:username',(req,res)=>{
  const { index, username } = req.params;
  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  const msg = db.messages[index];
  if(!msg) return res.status(404).send('Message not found');
  if(msg.to_user !== username) return res.status(403).send('Not allowed');

  db.messages.splice(index,1);
  fs.writeFileSync(dbFile, JSON.stringify(db,null,2));
  res.send('Message deleted!');
});

// DELETE SENT MESSAGE
app.delete('/sent/:index/:username',(req,res)=>{
  const { index, username } = req.params;
  const db = JSON.parse(fs.readFileSync(dbFile,'utf-8'));
  const msg = db.messages[index];
  if(!msg) return res.status(404).send('Message not found');
  if(msg.from_user !== username) return res.status(403).send('Not allowed');

  db.messages.splice(index,1);
  fs.writeFileSync(dbFile, JSON.stringify(db,null,2));
  res.send('Sent message deleted!');
});

const PORT = process.env.PORT || 3000;
server.listen(PORT,()=>console.log(`Server running on port ${PORT}`));