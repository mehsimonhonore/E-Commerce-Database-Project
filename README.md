# Trendora

Trendora is a scalable multi-vendor e-commerce database system built with PostgreSQL. The project focuses on designing a secure, optimized, and normalized database architecture capable of supporting real-world e-commerce operations such as inventory management, orders, payments, promotions, and customer interactions.

This project was developed as coursework for Database Design and Optimization under the supervision of Engr Kinge Patrick.

---

# Project Goals

- Design a scalable and normalized e-commerce database
- Ensure data integrity and transaction consistency
- Optimize query performance using indexes and relational design
- Implement secure database structures and access control
- Simulate real-world e-commerce workflows

---

# Technologies Used

## Database
- PostgreSQL
- SQL
- pgcrypto
- uuid-ossp

## Backend
- Node.js
- Express.js

## Frontend
- HTML
- CSS
- JavaScript

---

# Core Features

- Multi-vendor system
- Product categories and variants
- Shopping cart and order management
- Inventory tracking
- Coupon and promotion system
- Mobile money payment support
- Role-based admin permissions
- UUID-based relational schema

---

# Folder Structure

```text
Trendora/
├── README.md
├── database/
│   └── schema.sql
│
└── e-commerce project/
    ├── backend/
    │   ├── package.json
    │   └── server.js
    │
    └── frontend/
        ├── index.html
        ├── scrpt.js
        └── style.css
```

---

# Database Setup

## PostgreSQL Installation

Download PostgreSQL:

https://www.postgresql.org/download/

During installation:
- Keep the default port `5432`
- Remember your PostgreSQL password
- Install pgAdmin if prompted

---

# Setup Using pgAdmin (GUI)

## 1. Create Database

Open pgAdmin and create a database named:

```text
trendora
```

---

## 2. Open Query Tool

- Select the `trendora` database
- Navigate to:
  
```text
Tools → Query Tool
```

---

## 3. Run the Schema

Open the file:

```text
database/schema.sql
```

Copy and execute the script inside the Query Tool.

---

## 4. Verify Tables

Expand:

```text
trendora
└── Schemas
    └── public
        └── Tables
```

---

# Setup Using Terminal (CLI)

## Login to PostgreSQL

```bash
psql -U postgres
```

---

## Create Database

```sql
CREATE DATABASE trendora;
```

---

## Connect to Database

```sql
\c trendora
```

---

## Run Schema File

```bash
psql -U postgres -d trendora -f schema.sql
```

---

## Verify Tables

```sql
\dt
```

---

# Backend Setup

Move into the backend folder:

```bash
cd "e-commerce project/backend"
```

Install dependencies:

```bash
npm install
```

Start the server:

```bash
npm start
```

Server runs on:

```text
http://localhost:3000
```

---

# Current Status

| Component | Status |
|---|---|
| Database Schema | Completed |
| Backend API | In Progress |
| Frontend UI | In Progress |

---

# Team Members

| Name | Matricule |
|---|---|
| ESINGILA LAUREL LUMIERE | FE24A267 |
| MATUTE RANSOM | FE24A307 |
| ATEMKENG PRINCE LOVET TANZE | FE24A230 |
| NGORAN FLORENCE | FE24A338 |
| MBUH DORA FONGWI | FE24A313 |
| MANAKWA BLESSING | FE24A304 |
| DIONI SHAMMAH | FE24A248 |
| MASUMBE SAKWE MASUMBE JR | FE24A306 |
| TREVOR EFEME MOKABOE | FE24A381 |
| TAMOKOUE FOGUE LANDRY | FE24A625 |
| GRAI NGONG DOUORE RUDOLF | FE24A287 |
| BEBONGCHU BLAISE | FE24A239 |
| MEH SIMON HONORE TANCHA | FE24A316 |

---

# References

- PostgreSQL Documentation  
  https://www.postgresql.org/docs/

- Express.js Documentation  
  https://expressjs.com/

- Node.js Documentation  
  https://nodejs.org/en/docs

---

# License

This project was developed for academic and educational purposes.
