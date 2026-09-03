// db.js — MongoDB Atlas дээр суурилсан үнэгүй, найдвартай database
const { MongoClient, ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('АЛДАА: MONGODB_URI орчны хувьсагч тохируулагдаагүй байна!');
}

const client = new MongoClient(uri);
let db;

async function connect() {
  if (db) return db;
  await client.connect();
  db = client.db('oyucargo');
  await ensureDefaultAdmin();
  console.log('MongoDB-тэй амжилттай холбогдлоо.');
  return db;
}

async function ensureDefaultAdmin() {
  const admins = db.collection('admins');
  const count = await admins.countDocuments();
  if (count === 0) {
    const hash = bcrypt.hashSync('oyu2026', 10);
    await admins.insertOne({ username: 'admin', password_hash: hash });
    console.log('----------------------------------------------------');
    console.log('Анхдагч admin бүртгэл үүслээ: admin / oyu2026');
    console.log('----------------------------------------------------');
  }
}

function nowStr() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

module.exports = {
  connect,

  async findAdminByUsername(username) {
    return db.collection('admins').findOne({ username });
  },
  async findAdminById(id) {
    return db.collection('admins').findOne({ _id: new ObjectId(id) });
  },
  async updateAdminPassword(id, hash) {
    await db.collection('admins').updateOne(
      { _id: new ObjectId(id) },
      { $set: { password_hash: hash } }
    );
  },

  async getAllShipments() {
    const rows = await db.collection('shipments').find().sort({ updated_at: -1 }).toArray();
    return rows.map(r => ({ ...r, id: r._id.toString() }));
  },

  // Утасны дугаар ЭСВЭЛ барааны дугаараар хайх
  async searchShipments(query) {
    const trimmed = String(query || '').trim();
    if (!trimmed) return [];
    const digitsOnly = trimmed.replace(/\D/g, '');
    const orConditions = [{ item_code: trimmed }];
    if (digitsOnly) orConditions.push({ phone: digitsOnly });
    const rows = await db.collection('shipments')
      .find({ $or: orConditions })
      .sort({ updated_at: -1 })
      .toArray();
    return rows.map(r => ({ ...r, id: r._id.toString() }));
  },

  async addShipment({ phone, item_code, item_name, status, note }) {
    const doc = {
      phone,
      item_code: item_code || null,
      item_name: item_name || null,
      status: status || 'Бүртгэгдсэн',
      note: note || null,
      updated_at: nowStr(),
    };
    const result = await db.collection('shipments').insertOne(doc);
    return result.insertedId.toString();
  },
  async updateShipment(id, { phone, item_code, item_name, status, note }) {
    const result = await db.collection('shipments').updateOne(
      { _id: new ObjectId(id) },
      { $set: {
          phone,
          item_code: item_code || null,
          item_name: item_name || null,
          status: status || 'Бүртгэгдсэн',
          note: note || null,
          updated_at: nowStr(),
      }}
    );
    return result.matchedCount > 0;
  },
  async deleteShipment(id) {
    const result = await db.collection('shipments').deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
  },
};
