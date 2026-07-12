# 🚌 TransitOps — Smart Transport Operations Platform

> A production-quality fleet management SaaS platform built for the hackathon.
> Manage vehicles, drivers, trips, maintenance, fuel and expenses — all in one dashboard.

![Platform Banner](https://img.shields.io/badge/TransitOps-Smart%20Transport-blue?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&style=flat-square)
![Django](https://img.shields.io/badge/Django-5-092E20?logo=django&style=flat-square)
![JWT](https://img.shields.io/badge/Auth-JWT-orange?style=flat-square)

---

## 📐 Architecture Overview

```
TransitOps/
├── backend/               # Django 5 + DRF + SimpleJWT
│   ├── api/               # Core application
│   │   ├── models.py      # All database entities (UUID PKs, RBAC)
│   │   ├── serializers.py # DRF serializers + custom JWT claims
│   │   ├── views.py       # ViewSets + Auth + Analytics views
│   │   ├── permissions.py # Role-based permission classes
│   │   └── urls.py        # API router + auth endpoints
│   ├── transitops_backend/
│   │   ├── settings.py    # Env-driven configuration
│   │   └── urls.py        # Root URL config
│   ├── seed.py            # Demo data seeder
│   ├── requirements.txt
│   └── .env.example
│
└── frontend/              # React 18 + Vite + Tailwind CSS v4
    ├── src/
    │   ├── api/
    │   │   └── axiosInstance.js  # Axios + silent JWT refresh interceptor
    │   ├── components/
    │   │   ├── DashboardLayout.jsx  # Sidebar + header shell
    │   │   └── ProtectedRoute.jsx   # Auth + RBAC navigation guard
    │   ├── context/
    │   │   └── AuthContext.jsx      # Global auth state (login/logout/hasRole)
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── Vehicles.jsx
    │   │   ├── Drivers.jsx
    │   │   └── Unauthorized.jsx
    │   └── App.jsx                  # Router + route definitions
    └── .env.example
```

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- Git

---

### Backend Setup

```bash
cd backend

# 1. Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux

# 4. Run database migrations
python manage.py migrate

# 5. Seed demo data (optional but recommended)
python seed.py

# 6. Start development server
python manage.py runserver
```

Backend runs at: **http://localhost:8000**

---

### Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure environment
copy .env.example .env      # Windows
# cp .env.example .env      # macOS/Linux

# 3. Start Vite dev server
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔑 Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Administrator | admin@transitops.com | admin123 |
| Dispatcher | dispatcher@transitops.com | admin123 |
| Maintenance Mgr | maintenance@transitops.com | admin123 |
| Driver | driver@transitops.com | admin123 |

---

## 🛡️ RBAC — Role Access Matrix

| Feature | ADMIN | DISPATCHER | MAINTENANCE | DRIVER |
|---------|-------|------------|-------------|--------|
| Dashboard Analytics | ✅ | ✅ | ✅ | ✅ |
| Vehicles — View | ✅ | ✅ | ✅ | ✅ |
| Vehicles — CRUD | ✅ | ✅ | ❌ | ❌ |
| Drivers — View | ✅ | ✅ | ❌ | ❌ |
| Drivers — CRUD | ✅ | ✅ | ❌ | ❌ |
| Trips — View | ✅ | ✅ | ❌ | ✅ (own) |
| Trips — Dispatch | ✅ | ✅ | ❌ | ❌ |
| Maintenance — CRUD | ✅ | ❌ | ✅ | ❌ |
| Fuel Logs | ✅ | ✅ | ✅ | ✅ |
| Expenses — Submit | ✅ | ✅ | ✅ | ✅ |
| Expenses — Approve | ✅ | ❌ | ❌ | ❌ |
| User Management | ✅ | ❌ | ❌ | ❌ |

---

## 📡 API Reference

All endpoints are prefixed with `/api/`

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/login/` | Obtain access + refresh tokens | None |
| POST | `/auth/logout/` | Blacklist refresh token | Required |
| POST | `/auth/token/refresh/` | Silent token refresh | None |
| GET | `/auth/me/` | Get current user profile | Required |
| POST | `/auth/register/` | Create new user | Admin |
| POST | `/auth/change-password/` | Change own password | Required |

### Resources

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/vehicles/` | List / Create vehicles |
| GET/PUT/DELETE | `/vehicles/{id}/` | Retrieve / Update / Archive |
| GET/POST | `/drivers/` | List / Register drivers |
| GET/PUT/DELETE | `/drivers/{id}/` | Driver detail operations |
| GET/POST | `/trips/` | List / Dispatch trips |
| GET/POST | `/maintenance/` | Maintenance log management |
| GET/POST | `/fuel-logs/` | Fuel purchase logging |
| GET/POST | `/expenses/` | Driver expense submissions |
| GET | `/analytics/dashboard/` | KPI dashboard data |

---

## 🏗️ Milestones

| # | Milestone | Status |
|---|-----------|--------|
| 1 | Project Planning & Architecture | ✅ Done |
| 2 | Project Foundation (Vite + Django scaffold) | ✅ Done |
| 3 | Authentication & RBAC (JWT + protected routes) | ✅ Done |
| 4 | Dashboard (KPIs, charts, alerts) | ✅ Done |
| 5 | Vehicle & Driver Management | ✅ Done |
| 6 | Trip Dispatch & Routing | 🚧 Next |
| 7 | Maintenance & Fuel Logs | ⬜ Pending |
| 8 | Expense Reimbursements | ⬜ Pending |
| 9 | Reporting & Analytics | ⬜ Pending |
| 10 | Final Polish & Deployment | ⬜ Pending |

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 5, Tailwind CSS v4 |
| State | React Context API |
| HTTP Client | Axios (with silent refresh interceptor) |
| Forms | React Hook Form + Zod |
| Animations | Framer Motion |
| Charts | Recharts |
| Backend | Django 5, Django REST Framework |
| Auth | SimpleJWT (access + refresh + blacklist) |
| Database | SQLite (dev) / PostgreSQL (prod) |
| CORS | django-cors-headers |
| Filtering | django-filter |

---

## 📄 License

MIT — built for hackathon purposes.