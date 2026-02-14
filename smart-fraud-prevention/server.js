// ============================================================
// SMART FRAUD PREVENTION SYSTEM - Backend (server.js)
// ============================================================
const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readJSON(filename) {
  const fp = path.join(__dirname, filename);
  if (!fs.existsSync(fp)) return [];
  return JSON.parse(fs.readFileSync(fp, 'utf8'));
}
function writeJSON(filename, data) {
  fs.writeFileSync(path.join(__dirname, filename), JSON.stringify(data, null, 2));
}
function generateId(prefix) { return prefix + Date.now() + Math.floor(Math.random() * 1000); }
function randomFrom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const DEVICE_POOL = [
  'iPhone 15 Pro · Safari', 'Samsung Galaxy S24 · Chrome', 'MacBook Air M2 · Chrome',
  'Windows 11 PC · Edge', 'iPad Pro · Safari', 'OnePlus 12 · Chrome',
  'Pixel 8 · Firefox', 'Windows 10 Laptop · Chrome', 'Xiaomi 14 · Chrome', 'MacBook Pro 16 · Safari'
];

const MERCHANTS = [
  'Amazon India', 'Flipkart', 'Apple Store', 'Netflix', 'Zomato',
  'MakeMyTrip', 'IRCTC', 'Swiggy', 'Myntra', 'International Wire', 'Crypto Exchange', 'JioMart'
];

const LOCATIONS = [
  'Mumbai, India','Delhi, India','Bengaluru, India','Chennai, India','Hyderabad, India',
  'Dubai, UAE','Singapore','London, UK','New York, USA','Frankfurt, Germany'
];

function calculateRisk(transaction, userId, isNewDevice) {
  let score = 0;
  const reasons = [];

  if (transaction.amount > 50000) {
    score += 40;
    reasons.push(`High amount: ₹${transaction.amount.toLocaleString('en-IN')}`);
  }
  if (isNewDevice) {
    score += 25;
    reasons.push(`Unknown device: ${transaction.device}`);
  }

  const transactions = readJSON('transactions.json');
  const userLocations = transactions.filter(t => t.userId === userId).map(t => t.location);
  if (!userLocations.includes(transaction.location)) {
    score += 20;
    reasons.push(`New location: ${transaction.location}`);
  }

  const hour = new Date(transaction.time).getHours();
  if (hour >= 22 || hour < 6) {
    score += 15;
    reasons.push('Night-time transaction (10 PM – 6 AM)');
  }

  score = Math.min(score, 100);
  let level = 'LOW';
  if (score >= 70) level = 'HIGH';
  else if (score >= 40) level = 'MEDIUM';
  return { score, level, reasons };
}

// POST /signup
app.post('/signup', (req, res) => {
  const { name, accountNumber, password, email, phone } = req.body;
  if (!name || !accountNumber || !password)
    return res.status(400).json({ error: 'Name, account number and password required' });
  const users = readJSON('users.json');
  if (users.find(u => u.accountNumber === accountNumber))
    return res.status(409).json({ error: 'Account already registered' });
  users.push({ id: generateId('u'), name, accountNumber, password, email: email||'', phone: phone||'', joinDate: new Date().toISOString().split('T')[0], isFrozen: false });
  writeJSON('users.json', users);
  res.json({ success: true });
});

// POST /login
app.post('/login', (req, res) => {
  const { accountNumber, password, deviceId } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.accountNumber === accountNumber && u.password === password);
  if (!user) return res.status(401).json({ error: 'Invalid account number or password' });

  const devices = readJSON('devices.json');
  const known = devices.find(d => d.userId === user.id && d.deviceId === deviceId);
  let newDeviceAlert = false;
  if (!known) {
    devices.push({ userId: user.id, deviceId, firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), trusted: false });
    writeJSON('devices.json', devices);
    const alerts = readJSON('alerts.json');
    alerts.push({ id: generateId('alt'), userId: user.id, type: 'new_device', message: `New device login: ${deviceId}`, time: new Date().toISOString(), severity: 'medium', read: false });
    writeJSON('alerts.json', alerts);
    newDeviceAlert = true;
  } else {
    known.lastSeen = new Date().toISOString();
    writeJSON('devices.json', devices);
  }
  res.json({ success: true, user: { id: user.id, name: user.name, accountNumber: user.accountNumber, email: user.email, phone: user.phone, joinDate: user.joinDate, isFrozen: user.isFrozen }, newDeviceAlert });
});

// POST /user/update
app.post('/user/update', (req, res) => {
  const { userId, name, email, phone, currentPassword, newPassword } = req.body;
  const users = readJSON('users.json');
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (name) user.name = name;
  if (email !== undefined) user.email = email;
  if (phone !== undefined) user.phone = phone;
  if (newPassword) {
    if (user.password !== currentPassword) return res.status(403).json({ error: 'Current password incorrect' });
    user.password = newPassword;
  }
  writeJSON('users.json', users);
  res.json({ success: true, user: { id: user.id, name: user.name, accountNumber: user.accountNumber, email: user.email, phone: user.phone, joinDate: user.joinDate } });
});

// GET /transactions
app.get('/transactions', (req, res) => {
  const { userId } = req.query;
  const txns = readJSON('transactions.json').filter(t => t.userId === userId).sort((a, b) => new Date(b.time) - new Date(a.time));
  res.json(txns);
});

// POST /transaction/new
app.post('/transaction/new', (req, res) => {
  const { userId } = req.body;
  const device = randomFrom(DEVICE_POOL);
  const merchant = randomFrom(MERCHANTS);
  const transaction = {
    id: generateId('txn'), userId,
    amount: Math.floor(Math.random() * 99900) + 100,
    location: randomFrom(LOCATIONS),
    device, merchant, type: 'merchant',
    time: new Date().toISOString(), status: 'pending'
  };
  const devices = readJSON('devices.json');
  const isNewDevice = !devices.find(d => d.userId === userId && d.deviceId === device);
  const risk = calculateRisk(transaction, userId, isNewDevice);
  transaction.riskScore = risk.score;
  transaction.riskLevel = risk.level;
  transaction.riskReasons = risk.reasons;
  const transactions = readJSON('transactions.json');
  transactions.push(transaction);
  writeJSON('transactions.json', transactions);
  res.json({ success: true, transaction });
});

// POST /transaction/approve
app.post('/transaction/approve', (req, res) => {
  const { transactionId } = req.body;
  const txns = readJSON('transactions.json');
  const txn = txns.find(t => t.id === transactionId);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  txn.status = 'approved';
  txn.resolvedAt = new Date().toISOString();
  writeJSON('transactions.json', txns);
  res.json({ success: true, transaction: txn });
});

// POST /transaction/block
app.post('/transaction/block', (req, res) => {
  const { transactionId, userId } = req.body;
  const txns = readJSON('transactions.json');
  const txn = txns.find(t => t.id === transactionId);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  txn.status = 'blocked';
  txn.resolvedAt = new Date().toISOString();
  writeJSON('transactions.json', txns);
  const alerts = readJSON('alerts.json');
  alerts.push({ id: generateId('alt'), userId, type: 'blocked_transaction', message: `Transaction ₹${txn.amount.toLocaleString('en-IN')} blocked — ${txn.riskLevel} (score: ${txn.riskScore}) via ${txn.device}`, time: new Date().toISOString(), severity: 'high', read: false });
  writeJSON('alerts.json', alerts);
  res.json({ success: true });
});

// POST /transaction/suspicious
app.post('/transaction/suspicious', (req, res) => {
  const { transactionId, userId, reason } = req.body;
  const txns = readJSON('transactions.json');
  const txn = txns.find(t => t.id === transactionId);
  if (!txn) return res.status(404).json({ error: 'Not found' });
  txn.flaggedSuspicious = true;
  txn.suspiciousReason = reason || 'Flagged by user';
  writeJSON('transactions.json', txns);
  const alerts = readJSON('alerts.json');
  alerts.push({ id: generateId('alt'), userId, type: 'suspicious', message: `User flagged ₹${txn.amount.toLocaleString('en-IN')} as suspicious: "${reason||'No reason given'}" — via ${txn.device}`, time: new Date().toISOString(), severity: 'high', read: false });
  writeJSON('alerts.json', alerts);
  res.json({ success: true });
});

// GET /alerts
app.get('/alerts', (req, res) => {
  const { userId } = req.query;
  res.json(readJSON('alerts.json').filter(a => a.userId === userId).sort((a, b) => new Date(b.time) - new Date(a.time)));
});

// POST /alerts/read
app.post('/alerts/read', (req, res) => {
  const { userId } = req.body;
  const alerts = readJSON('alerts.json');
  alerts.forEach(a => { if (a.userId === userId) a.read = true; });
  writeJSON('alerts.json', alerts);
  res.json({ success: true });
});

// GET /user
app.get('/user', (req, res) => {
  const user = readJSON('users.json').find(u => u.id === req.query.userId);
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ id: user.id, name: user.name, accountNumber: user.accountNumber, email: user.email, phone: user.phone, joinDate: user.joinDate, isFrozen: user.isFrozen });
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));

app.listen(PORT, () => console.log(`🛡️  Running at http://localhost:${PORT}`));
