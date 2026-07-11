# 🍚 Batter Shop — Ordering & Credit Management System

A full-stack batter ordering system built with **Node.js**, **Express**, **MongoDB**, and **Razorpay** payments. Customers can place orders for Idli/Dosa batter, pay online or on credit, and receive email notifications. Admins get a real-time dashboard to manage orders, customers, and revenue.

---

## ⚡ Quick Start (Single Command)

```bash
git clone https://github.com/Tharun-2006161/Batter-shop.git
cd Batter-shop
```

1. **Copy and configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your MongoDB URI, SMTP credentials, and Razorpay keys
   ```

2. **Install & Run:**
   ```bash
   npm run setup
   ```

That's it! The server starts at **http://localhost:3000** 🎉

---

## 🔧 Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [MongoDB](https://www.mongodb.com/) (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Gmail App Password ([Generate here](https://myaccount.google.com/apppasswords)) — for email notifications
- Razorpay account ([Dashboard](https://dashboard.razorpay.com/)) — for online payments (optional)

---

## 📂 Project Structure

```
Batter-shop/
├── server.js          # Express server entry point
├── database.js        # MongoDB connection & auto-seed admin
├── middleware.js       # JWT auth middleware
├── email.js           # Email notification service (Nodemailer)
├── seed.js            # Database seeder (admin + sample customers)
├── models/
│   ├── User.js        # User schema (admin & customer roles)
│   ├── Order.js       # Order schema with credit tracking
│   ├── Payment.js     # Razorpay payment records
│   └── Setting.js     # App settings (prices, etc.)
├── routes/
│   ├── auth.js        # Login, register, email OTP verification
│   ├── orders.js      # Order CRUD, Razorpay integration
│   └── admin.js       # Admin dashboard, customer management
├── public/            # Frontend (vanilla HTML/CSS/JS SPA)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   ├── api.js
│   ├── pages.js
│   ├── pages-order.js
│   └── pages-admin.js
├── .env.example       # Environment variable template
└── package.json
```

---

## 🚀 Available Scripts

| Command | Description |
|---------|-------------|
| `npm run setup` | Install dependencies + start server (one command) |
| `npm start` | Start the production server |
| `npm run dev` | Start with nodemon (auto-restart on changes) |
| `npm run seed` | Seed database with admin & sample customers |

---

## 🔑 Default Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@battershop.com` | `admin123` |
| Customer | `ravi@example.com` | `customer123` |
| Customer | `priya@example.com` | `customer123` |

> **Note:** Admin is auto-created on first startup. Run `npm run seed` to also create sample customers.

---

## ✨ Features

- **Customer Portal** — Register, verify email (OTP), place batter orders
- **Credit System** — Order on credit, track pending balances
- **Razorpay Payments** — Online payment integration with verification
- **Email Notifications** — Order confirmations & admin alerts via Gmail SMTP
- **Admin Dashboard** — Real-time metrics: daily orders, revenue, pending dues, customer counts
- **Single Session Auth** — JWT-based authentication with one active session per user
- **Booking Hours** — Orders restricted to 8:00 PM – 2:00 PM window

---

## 🌐 Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `SMTP_USER` / `SMTP_PASS` | Gmail credentials for email |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Razorpay API keys |
| `IDLI_BATTER_PRICE` / `DOSA_BATTER_PRICE` | Batter prices in INR |

---

## 📄 License

MIT © [Tharun Kumar](https://github.com/Tharun-2006161)
