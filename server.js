// server.js — Oyu Cargo backend (MongoDB Atlas ашигладаг)
require('dotenv').config();
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'oyu-cargo-dev-secret-please-change';

app.use(express.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin', express.static(path.join(__dirname, 'admin')));

function normalizePhone(phone) {
  return String(phone || '').replace(/\D/g, '');
}

function requireAuth(req, res, next) {
  const token = req.cookies.token;
  if (!token) return res.status(401).json({ error: 'Нэвтрээгүй байна' });
  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Токен буруу эсвэл хугацаа дууссан' });
  }
}

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await db.findAdminByUsername(username);
    if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
      return res.status(401).json({ error: 'Нэвтрэх нэр эсвэл нууц үг буруу байна' });
    }
    const token = jwt.sign({ id: user._id.toString(), username: user.username }, JWT_SECRET, { expiresIn: '12h' });
    res.cookie('token', token, { httpOnly: true, maxAge: 12 * 60 * 60 * 1000, sameSite: 'lax' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/admin/me', requireAuth, (req, res) => {
  res.json({ username: req.admin.username });
});

app.post('/api/admin/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.findAdminById(req.admin.id);
    if (!user || !bcrypt.compareSync(currentPassword || '', user.password_hash)) {
      return res.status(401).json({ error: 'Одоогийн нууц үг буруу байна' });
    }
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ error: 'Шинэ нууц үг хэт богино байна' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    await db.updateAdminPassword(req.admin.id, hash);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

app.get('/api/admin/shipments', requireAuth, async (req, res) => {
  try {
    res.json(await db.getAllShipments());
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

app.post('/api/admin/shipments', requireAuth, async (req, res) => {
  try {
    const { phone, item_code, item_name, status, note } = req.body;
    const cleanPhone = normalizePhone(phone);
    if (!cleanPhone) return res.status(400).json({ error: 'Утасны дугаар оруулна уу' });
    const id = await db.addShipment({ phone: cleanPhone, item_code, item_name, status, note });
    res.json({ ok: true, id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

app.put('/api/admin/shipments/:id', requireAuth, async (req, res) => {
  try {
    const { phone, item_code, item_name, status, note } = req.body;
    const cleanPhone = normalizePhone(phone);
    const ok = await db.updateShipment(req.params.id, { phone: cleanPhone, item_code, item_name, status, note });
    if (!ok) return res.status(404).json({ error: 'Илгээмж олдсонгүй' });
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

app.delete('/api/admin/shipments/:id', requireAuth, async (req, res) => {
  try {
    await db.deleteShipment(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

// Нийтийн: утасны дугаар ЭСВЭЛ барааны дугаараар хайх
app.get('/api/track', async (req, res) => {
  try {
    const q = req.query.q || req.query.phone || '';
    if (!String(q).trim()) return res.status(400).json({ error: 'Утасны дугаар эсвэл барааны дугаараа оруулна уу' });
    const rows = await db.searchShipments(q);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Илгээмж олдсонгүй' });
    }
    res.json(rows);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Серверийн алдаа' });
  }
});

db.connect().then(() => {
  app.listen(PORT, () => {
    console.log(`Oyu Cargo сервер ажиллаж байна: http://localhost:${PORT}`);
    console.log(`Admin хуудас: http://localhost:${PORT}/admin`);
  });
}).catch(err => {
  console.error('Database холболт амжилтгүй боллоо:', err);
});
