# 🚀 RediStack Backend

**RediStack Backend** is a **production-style backend platform** built with **Node.js, TypeScript, PostgreSQL (Prisma), and Redis**, designed to demonstrate **real-world Redis usage beyond basic caching**.

This project focuses on **scalability, performance, and backend system design**, making it an ideal **portfolio project** for backend and full-stack roles.

---

## 🧠 Project Purpose

Most projects use Redis only for caching.  
**RediStack Backend** uses Redis as a **core system component** for:

- Authentication & session management
- Real-time messaging
- API rate limiting
- Background job processing
- Analytics & leaderboards

This project is **backend-only** and can be used by **any frontend or platform**.

---

## 🏗 High-Level Architecture


---

## 🧩 Core Features & Redis Usage

### 🔐 Authentication & Sessions
- User signup & login
- JWT-based authentication
- Redis-backed session storage
- OTP & password reset
- Login attempt rate limiting

**Redis used:**
- Strings
- Hashes
- TTL / Expiry
- Atomic operations

---

### 💬 Real-Time Chat & Notifications
- One-to-one and group chat
- Online / offline presence
- Typing indicators
- Event-based notifications

**Redis used:**
- Pub/Sub
- Streams
- Sets

---

### ⚙️ Background Job Queue
- Email & notification jobs
- Retry & delayed jobs
- Failed job handling

**Redis used:**
- Lists
- Sorted Sets
- Pipelines & Transactions

---

### 📊 Analytics & Leaderboards
- Active users tracking
- User activity counters
- Top users leaderboard
- Unique visitor count

**Redis used:**
- Sorted Sets
- HyperLogLog
- Hashes

---

### 🛡 API Rate Limiting & Caching
- Per-user / per-IP rate limiting
- Cache-aside pattern for database queries
- Automatic cache expiration

**Redis used:**
- INCR + EXPIRE
- TTL-based caching
- Pipelines

---

## 🛠 Tech Stack

| Layer | Technology |
|------|-----------|
| Runtime | Node.js |
| Language | TypeScript |
| Framework | Express |
| Database | PostgreSQL |
| ORM | Prisma |
| In-Memory Store | Redis |
| Authentication | JWT |

---

