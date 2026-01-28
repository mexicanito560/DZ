const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.DZ_KEY || null;
const DB_FILE = path.join(__dirname, 'db.json');
const ONLINE_TIMEOUT = 20000;

/* =========================
   DB
========================= */
let db = {
  total: 0,
  today: 0,
  newToday: 0,
  lastDay: new Date().toDateString(),
  lastPing: Date.now(),
  usersToday: {}
};

function saveDB(){
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function loadDB(){
  if(fs.existsSync(DB_FILE)){
    db = JSON.parse(fs.readFileSync(DB_FILE));
  } else {
    saveDB();
  }
}
loadDB();

/* =========================
   Reset diario
========================= */
function checkDay(){
  const today = new Date().toDateString();
  if(db.lastDay !== today){
    db.today = 0;
    db.newToday = 0;
    db.usersToday = {};
    db.lastDay = today;
    saveDB();
  }
}

/* =========================
   Auth opcional
========================= */
function checkKey(req, res, next){
  if(!API_KEY) return next();
  const key = req.headers['x-key'];
  if(key !== API_KEY){
    return res.status(403).json({ ok:false, error:'No autorizado' });
  }
  next();
}

/* =========================
   POST /exec  (Roblox)
========================= */
app.post('/exec', checkKey, (req, res) => {
  checkDay();

  const { userId, username } = req.body || {};
  if(!userId){
    return res.status(400).json({ ok:false, error:'userId requerido' });
  }

  db.total++;
  db.today++;
  db.lastPing = Date.now();

  // nuevo usuario hoy (REAL)
  if(!db.usersToday[userId]){
    db.usersToday[userId] = {
      username: username || 'Unknown',
      firstSeen: Date.now()
    };
    db.newToday++;
  }

  saveDB();

  res.json({
    ok: true,
    message: 'Ejecución registrada'
  });
});

/* =========================
   POST /online (ping)
========================= */
app.post('/online', checkKey, (req, res) => {
  db.lastPing = Date.now();
  saveDB();
  res.json({ ok:true });
});

/* =========================
   GET /stats (PANEL)
========================= */
app.get('/stats', (req, res) => {
  checkDay();

  const online = (Date.now() - db.lastPing) <= ONLINE_TIMEOUT;

  res.json({
    total: db.total,
    today: db.today,
    online: online,
    newToday: db.newToday
  });
});

/* =========================
   ROOT
========================= */
app.get('/', (req, res) => {
  res.send('DZ API ONLINE');
});

app.listen(PORT, () => {
  console.log('DZ API running on port', PORT);
});
