const express = require("express");
const session = require("express-session");
const pg = require("pg");
const bcrypt = require("bcrypt");
const PgSession = require("connect-pg-simple")(session);
const path = require("path");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ------------------------
// PostgreSQL setup
// ------------------------
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL || "postgres://username:password@localhost:5432/maildb",
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// ------------------------
// Session store
// ------------------------
app.use(session({
  store: new PgSession({ pool, tableName: 'session' }),
  secret: "your_secret_here",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24*60*60*1000 } // 1 day
}));

// ------------------------
// Admin config
// ------------------------
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "supersecret"; // change this

// ------------------------
// Create tables if not exist
// ------------------------
(async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        username TEXT PRIMARY KEY,
        password TEXT NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        from_user TEXT,
        to_user TEXT,
        subject TEXT,
        body TEXT,
        read BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    // Add admin user if not exists
    const adminCheck = await client.query("SELECT * FROM users WHERE username=$1", [ADMIN_USERNAME]);
    if(adminCheck.rows.length===0){
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
      await client.query("INSERT INTO users(username,password) VALUES($1,$2)", [ADMIN_USERNAME, hashed]);
    }
  } finally {
    client.release();
  }
})();

// ------------------------
// Serve static files
// ------------------------
app.use(express.static(path.join(__dirname, "public")));

// ------------------------
// Authentication middleware
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
// Routes
// ------------------------

// Signup
app.post("/signup", async (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send({error:"Username and password required"});
  const hashed = await bcrypt.hash(password,10);
  try {
    await pool.query("INSERT INTO users(username,password) VALUES($1,$2)", [username, hashed]);
    res.send({success:true});
  } catch(e){
    res.status(400).send({error:"Username taken"});
  }
});

// Login
app.post("/login", async (req,res)=>{
  const { username, password } = req.body;
  if(!username || !password) return res.status(400).send({error:"Username and password required"});
  const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
  if(result.rows.length===0) return res.status(400).send({error:"User not found"});
  const user = result.rows[0];
  const match = await bcrypt.compare(password, user.password);
  if(!match) return res.status(400).send({error:"Incorrect password"});

  req.session.user = username;
  req.session.isAdmin = (username===ADMIN_USERNAME);

  res.send({success:true, isAdmin:req.session.isAdmin});
});

// Logout
app.post("/logout", (req,res)=>{
  req.session.destroy();
  res.send({success:true});
});

// Inbox
app.get("/api/inbox", requireLogin, async (req,res)=>{
  const result = await pool.query("SELECT * FROM messages WHERE to_user=$1 ORDER BY timestamp DESC", [req.session.user]);
  res.send(result.rows);
});

// Sent
app.get("/api/sent", requireLogin, async (req,res)=>{
  const result = await pool.query("SELECT * FROM messages WHERE from_user=$1 ORDER BY timestamp DESC", [req.session.user]);
  res.send(result.rows);
});

// Send message
app.post("/api/send", requireLogin, async (req,res)=>{
  const { toUser, subject, body } = req.body;
  if(!toUser || !body) return res.status(400).send({error:"Recipient and body required"});
  await pool.query("INSERT INTO messages(from_user,to_user,subject,body) VALUES($1,$2,$3,$4)",
    [req.session.user,toUser,subject||"",body]);
  res.send({success:true});
});

// Mark read
app.post("/api/read/:id", requireLogin, async (req,res)=>{
  await pool.query("UPDATE messages SET read=TRUE WHERE id=$1 AND to_user=$2",[req.params.id,req.session.user]);
  res.send({success:true});
});

// Delete message
app.post("/api/delete/:id", requireLogin, async (req,res)=>{
  await pool.query("DELETE FROM messages WHERE id=$1 AND (from_user=$2 OR to_user=$2)",[req.params.id,req.session.user]);
  res.send({success:true});
});

// Admin: list users
app.get("/api/users", requireAdmin, async (req,res)=>{
  const result = await pool.query("SELECT username FROM users WHERE username <> $1", [ADMIN_USERNAME]);
  res.send(result.rows);
});

// Admin: delete user
app.post("/api/delete-user", requireAdmin, async (req,res)=>{
  const { username } = req.body;
  if(!username) return res.status(400).send({error:"Username required"});
  await pool.query("DELETE FROM users WHERE username=$1",[username]);
  await pool.query("DELETE FROM messages WHERE from_user=$1 OR to_user=$1",[username]);
  res.send({success:true});
});

// Serve homepage
app.get("/", (req,res)=>{
  res.sendFile(path.join(__dirname,"public","index.html"));
});

// Start server
const PORT = process.env.PORT||3000;
app.listen(PORT,()=>console.log(`Server running on port ${PORT}`));