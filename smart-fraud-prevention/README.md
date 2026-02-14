# 🛡️ Smart Fraud Prevention System

A full-stack banking fraud prevention simulation built with Node.js, Express, and vanilla HTML/CSS/JS.

---

## 🚀 How to Run

```bash
# 1. Install dependencies
npm install

# 2. Start the server
node server.js

# 3. Open in browser
http://localhost:3000
```

---

## 🔐 Demo Login Credentials

| Field | Value |
|-------|-------|
| Account Number | `4532-7891-0234-5678` |
| Password | `pass123` |

Or sign up for a new account!

---

## 🗂️ Project Structure

```
smart-fraud-prevention/
├── server.js          ← Express backend with all API routes
├── users.json         ← User accounts database
├── transactions.json  ← Transaction records
├── alerts.json        ← Security alerts
├── devices.json       ← Known devices per user
├── package.json
└── public/
    ├── login.html      ← Sign Up / Login page
    ├── dashboard.html  ← Main dashboard + transaction simulation
    ├── transactions.html ← Full transaction history
    ├── alerts.html     ← Security alerts page
    ├── reports.html    ← Analytics & reports
    ├── styles.css      ← Global styles (light blue-violet theme)
    └── app.js          ← Shared JS utilities + sidebar
```

---

## 🔄 Workflow

1. **Sign Up / Login** — with Bank Account Number + Password
2. **Device Detection** — new devices trigger an alert (login is NOT blocked)
3. **Dashboard** — see stats, recent transactions, live alerts
4. **Simulate Transaction** — click the button to generate a random transaction
5. **Risk Analysis** — backend scores the transaction:
   - Amount > ₹50,000 → +40
   - New/unrecognised device → +25
   - New location → +20
   - Night time (10 PM – 6 AM) → +15
6. **Decision**:
   - 🟢 LOW (0–39): Auto-approved
   - 🟡 MEDIUM (40–69): OTP required (demo OTP: **1234**)
   - 🔴 HIGH (70–100): Manual approve/block required
7. **Block**: Only the **transaction** is blocked — your account stays open, device access is unaffected
8. **Alerts**: View all security events; mark as read

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/signup` | Register new user |
| POST | `/login` | Authenticate user + device detection |
| GET | `/transactions?userId=` | Get user transactions |
| POST | `/transaction/new` | Simulate new transaction |
| POST | `/transaction/approve` | Approve a transaction |
| POST | `/transaction/block` | Block a transaction (NOT account/device) |
| GET | `/alerts?userId=` | Get security alerts |
| POST | `/alerts/read` | Mark alerts as read |
| GET | `/user?userId=` | Get user profile |

---

## ⚠️ Disclaimer

This is a **simulation only** for educational purposes.
No real bank APIs, no real payments, no real OTP services are used.
