import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

app.use(express.json());
app.use(express.static('./')); // serve index.html

// --- Minimal JSON DB ---
const DB_FILE = './database.json';
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], messages: [] }));

function readDB() { return JSON.parse(fs.readFileSync(DB_FILE)); }
function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data)); }

// --- Signup ---
app.post('/signup', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  if (db.users.find(u => u.username === username)) return res.status(400).send('User exists');
  db.users.push({ username, password }); // plain text for bare-bones
  writeDB(db);
  res.send('Signed up!');
});

// --- Login ---
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  const user = db.users.find(u => u.username === username && u.password === password);
  if (user) res.send('Logged in!');
  else res.status(400).send('Invalid login');
});

// --- Send message ---
app.post('/send', (req, res) => {
  const { from, to, subject, body } = req.body;
  const db = readDB();
  db.messages.push({ from, to, subject, body, timestamp: Date.now() });
  writeDB(db);
  io.to(to).emit('newMessage', { from, to, subject, body });
  res.send('Message sent!');
});

// --- Socket.IO ---
io.on('connection', (socket) => {
  socket.on('join', username => { socket.join(username); });
});

httpServer.listen(process.env.PORT || 3000, () => console.log('Server running on port 3000'));