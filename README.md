# 🚛 TransitOps — Smart Transport Operations Platform

<p align="center">
  <img src="frontend/public/bg-highway.png" alt="TransitOps Banner" width="600" style="border-radius: 12px" />
</p>

<p align="center">
  <strong>A production-grade, full-stack fleet management system powered by Django REST Framework + React + Gemini AI.</strong>
</p>

---

## ✨ Features

### 🏎️ Core Fleet Management
- **Vehicle Registry** — Full CRUD with soft-delete, status tracking (Available, On Trip, Maintenance, Out of Service), VIN/license validation
- **Driver Registry** — License class management (Class A/B/C), real-time expiry tracking, automatic Driver Profile creation on registration
- **Trip Dispatch** — Cargo weight validation against vehicle payload, driver/vehicle availability gating, GPS route tracking, lifecycle transitions (Scheduled → In Progress → Completed/Cancelled)
- **Maintenance Logs** — Auto-transitions vehicle status to `MAINTENANCE` on create, reverts to `AVAILABLE` on completion
- **Fuel Logs** — Strictly-increasing odometer validation, per-vehicle fuel efficiency tracking
- **Expense Logs** — Per-trip cost categorization, attached to dispatches

### 🤖 AI Copilot (Powered by Gemini 2.5 Flash)
- **TransitOps Copilot** — Floating AI assistant available on every dashboard screen
- Receives real-time fleet context (active trips, vehicle/driver counts, maintenance status) as system prompt
- Supports open-ended operations queries: "What is the current fleet utilization?", "Draft a delay notice for Route X"
- Graceful offline fallback with live fleet snapshot if API key isn't configured
- One-click suggestion prompts for common operational queries

### 👤 Authentication & RBAC
- JWT-based authentication (SimpleJWT) with token blacklisting on logout
- **4 Roles**: Administrator, Dispatcher, Maintenance Manager, Fleet Driver
- Role-based UI (menu items filtered per role, API permissions enforced per endpoint)
- Full self-registration with role selection
- **Driver registration** auto-creates a linked `Driver` profile with license info

### 📊 Operations Dashboard
- 6 live KPI cards: Active Trips, Fleet Size, Available Drivers, Utilization %, Under Maintenance, Expiring Licenses
- Monthly Dispatch Trend area chart (last 6 months)
- Fleet Status donut chart (Available / On Trip / Maintenance / OOS)
- Financial Audit bar chart (Fuel / Maintenance / Expenses breakdown)
- System Alert Center (expired licenses, active maintenance, out-of-service vehicles)
- Live Dispatches feed with status badges

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Backend | Django 5.0, Django REST Framework, SimpleJWT |
| AI | Google GenAI SDK (Gemini 2.5 Flash) |
| Frontend | React 18, Vite, Tailwind CSS v4 |
| Charts | Recharts |
| Animations | Framer Motion |
| Auth | JWT + Token Blacklisting |
| DB | SQLite (dev) / PostgreSQL (prod-ready) |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt

python manage.py migrate
python manage.py createsuperuser  # Creates admin account

# (Optional) Seed demo accounts
python manage.py seed_demo_users

python manage.py runserver 8000
```

Set `GEMINI_API_KEY` environment variable to enable AI Copilot:
```bash
set GEMINI_API_KEY=your_api_key_here    # Windows
# export GEMINI_API_KEY=your_key        # macOS/Linux
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

The app runs on **http://localhost:5174**

---

## 🔑 Demo Sandbox Accounts

| Role | Email | Password |
|---|---|---|
| Administrator | admin@transitops.com | TransitOps@2024 |
| Dispatcher | dispatcher@transitops.com | TransitOps@2024 |
| Maintenance Manager | maintenance@transitops.com | TransitOps@2024 |
| Fleet Driver | driver@transitops.com | TransitOps@2024 |

---

## 📁 Project Structure

```
TransitOps/
├── backend/
│   ├── api/
│   │   ├── models.py           # Vehicle, Driver, Trip, MaintenanceLog, FuelLog, ExpenseLog
│   │   ├── serializers.py      # DRF serializers with full validation logic
│   │   ├── views.py            # ViewSets + Analytics + AI Copilot endpoint
│   │   ├── admin.py            # Django Admin config for all models
│   │   ├── permissions.py      # RBAC permission classes
│   │   └── urls.py             # All REST routes
│   ├── transitops_backend/
│   │   ├── settings.py
│   │   └── pagination.py       # Custom StandardResultsPagination
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── DashboardLayout.jsx   # Layout with AI Copilot drawer
│   │   ├── context/AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx             # Sign In + Register (all 4 roles)
│   │   │   ├── Dashboard.jsx         # Operations Center
│   │   │   ├── Vehicles.jsx
│   │   │   ├── Drivers.jsx
│   │   │   ├── Trips.jsx
│   │   │   ├── Maintenance.jsx
│   │   │   ├── FuelLogs.jsx
│   │   │   ├── Expenses.jsx
│   │   │   └── Reports.jsx
│   │   └── api/axiosInstance.js
│   └── public/
│       └── bg-highway.png            # Login background
└── README.md
```

---

## 🤖 AI Copilot API

```
POST /api/ai/chat/
Authorization: Bearer <token>

Body: { "message": "How many drivers are currently available?" }

Response: { "reply": "3 out of 8 registered drivers are currently available." }
```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/login/` | JWT Login |
| POST | `/api/auth/register/` | Self-registration (all roles) |
| GET | `/api/analytics/dashboard/` | Live KPIs and chart data |
| POST | `/api/ai/chat/` | AI Copilot conversation |
| GET/POST | `/api/vehicles/` | Vehicle CRUD |
| GET/POST | `/api/drivers/` | Driver CRUD |
| GET/POST | `/api/trips/` | Trip CRUD |
| PATCH | `/api/trips/{id}/status/` | Trip lifecycle transitions |
| GET/POST | `/api/maintenance/` | Maintenance logs |
| GET/POST | `/api/fuel-logs/` | Fuel logs |
| GET | `/api/analytics/reports/` | Fleet ROI per vehicle |

---

## 📄 License

MIT © 2024 TransitOps