# 🚛 TransitOps — In-Depth Platform Documentation

TransitOps is a smart, production-grade transport operations platform built using **Django REST Framework (DRF)**, **React**, and **Gemini 2.5 Flash**. The platform is designed to streamline logistics workflows, optimize dispatch operations, enforce asset safety regulations, and deliver context-grounded AI assistance.

---

## 🏗️ 1. System Architecture

TransitOps is built on a modular decoupled architecture:

```
                  ┌─────────────────────────────────────────┐
                  │          Vite + React Frontend          │
                  │  (Role-based layouts & dashboard view)  │
                  └────────────────────┬────────────────────┘
                                       │
                                       │ JWT Bearer Token
                                       ▼
                  ┌─────────────────────────────────────────┐
                  │       Django REST Framework API         │
                  │    (Auth, Analytics, CRUD views)        │
                  └──────┬─────────────┬─────────────┬──────┘
                         │             │             │
        SQLite Database  │             │             │ SDK v2 Interactions
                         ▼             │             ▼
                  ┌────────────┐       │      ┌──────────────┐
                  │ db.sqlite3 │       │      │  Gemini AI   │
                  └────────────┘       │      │  Copilot API │
                                       │      └──────────────┘
                         Nominatim/OSRM│
                         Geocoding &   ▼
                         Routing APIs  (OpenStreetMap network)
```

### Key Architectural Standards:
1. **JWT Handshake & Blacklist:** Employs SimpleJWT with dynamic token rotation. Logging out blacklists the refresh token to guarantee secure API invalidation.
2. **Silent Re-Authentication:** Frontend Axios clients intercept `401 Unauthorized` errors to retrieve a new access token in the background.
3. **Optimistic Soft Deletes:** Roster and log models implement an `is_active` boolean field. Deleting records marks them inactive to preserve historical financial and compliance data.

---

## 🎨 2. Role-Based Access Control (RBAC) & Theme Matrix

The workspace shifts colors and permissions depending on the logged-in credentials:

| Role | UI Accent Color | Brand Mode | Nav Groups & Scope |
|---|---|---|---|
| **Administrator** | Violet / Purple | `Control Center` | Full system registry access, CSV audit exports, and a direct link to the Django admin panel. |
| **Dispatcher** | Blue / Cyan | `Dispatch Console` | Focused on Scheduling, Dispatch logs, Vehicle lists, and Driver checkouts. |
| **Maintenance Mgr** | Amber / Orange | `Fleet Workshop` | Servicing and repair logging, vehicle check-ins, and out-of-service tags. |
| **Fleet Driver** | Emerald / Teal | `Driver Portal` | Log trips, upload fuel receipts, submit expense reports, and check personal dispatches. |

---

## 📋 3. In-Depth Feature Specifications

### 🔑 3.1. Cinematic Authentication (`Login.jsx`)
- **Visuals:** Features a split-screen page layout. The left hero panel displays a dark highway visual, scrolling HUD metrics, and cycling operational role cards.
- **Role Previews:** Interactive preview chips cycle every 3 seconds to guide users through platform feature highlights.
- **Self-Registration:** Fully supports registering for all 4 roles. Choosing a `DRIVER` role dynamically displays required driver license fields (License number, Class, and Expiry Date).
- **Security:** Standard password eye-toggles are embedded on all input forms.

### 📊 3.2. Operations Dashboard (`Dashboard.jsx`)
- **Dynamic KPI Panels:** Displays 6 core metrics (Active Trips, Fleet size, Available Drivers, Utilization %, Under Maintenance, Expiring Licenses).
- **Progress Gauge:** The *Fleet Utilization* KPI uses an inline SVG circular progress bar.
- **Audit Analytics:**
  - **Area Graph:** Plots completed trip dispatches over a rolling 6-month window.
  - **Pie Diagram:** Breaks down vehicle statuses (Available, On Trip, Maintenance, OOS).
  - **Bar Graph:** Breaks down financial spends across Fuel, Maintenance, and general Expense claims.

### 🚛 3.3. Vehicle Registry & Lifecycle
- **Status Progression:** Tracks vehicles through `AVAILABLE` → `ON_TRIP` → `MAINTENANCE` → `OUT_OF_SERVICE`.
- **Validation:** Enforces unique VIN (exactly 17 characters) and unique license plate numbers.
- **Soft Deletes:** Preserves historical trip calculations by disabling vehicle records rather than deleting them from the database.

### 🪪 3.4. Driver Compliance
- **Real-Time Audits:** Compares driver license expiration dates against current system timestamps.
- **Alert Flags:** Flags warnings if a license is within a 30-day expiration window, and blocks dispatchers from assigning drivers to trips if their license has expired.

### 📅 3.5. Trip Dispatch Lifecycle
- **Step 1: Scheduled:** Matches an available vehicle and driver. Enforces two strict business rules:
  1. Driver license must be active.
  2. Cargo weight must not exceed the vehicle's maximum payload capacity.
- **Step 2: In Progress:** Transitions vehicle and driver statuses to locked states, preventing double-scheduling.
- **Step 3: Completed / Cancelled:** Prompt for the actual mileage driven. Updates the vehicle's odometer and returns both resources to the available pool.

### 🔧 3.6. Fleet Maintenance Logs
- **Safety Locking:** Registering a repair log automatically moves a vehicle to the `MAINTENANCE` status.
- **Release Automation:** Completing a repair log automatically releases the vehicle back to `AVAILABLE`.

### ⛽ 3.7. Fuel & Expense Sync
- **Strict Odometer Sequences:** Odometer inputs on fuel logs are verified to ensure they exceed the vehicle's last recorded mileage.
- **Financial Audit Trail:** Matches general expense claims (tolls, food, lodging) to dispatch IDs.

### 🗺️ 3.8. Live Dedicated Map Tracker (`Tracking.jsx`)
- **Dedicated View:** A full-screen page accessible from the sidebar. Shows a list of active `IN_PROGRESS` dispatches on the left and a large map canvas on the right.
- **Voyager Light Map:** Renders utilizing clean Voyager map tiles for clear legibility.
- **Route Resolution:** Resolves addresses to coordinates using Nominatim geocoding and OSRM routing.
- **Movement Simulation:** Animates a vehicle along the path, allowing users to adjust simulated speeds (30 to 120 km/h) to update live ETA in real-time.
- **Google Maps Integration:** Includes a deep-linked "Navigate (Google Maps)" shortcut to load paths directly in external tabs.

### 🤖 3.9. Gemini AI Copilot (`DashboardLayout.jsx`)
- **Fleet-Context Grounding:** Injecting fleet summary summaries (active trips, driver counts, vehicle statuses) directly into the AI's system prompt ensures answers are grounded in real-time database metrics.
- **Rich Output UI:** Uses `react-markdown` to format lists, bold text, and code blocks inside the chat drawer.

---

## 🚀 4. Local Quick Start

### Backend:
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8000
```
*Configure `backend/.env` with your `GEMINI_API_KEY`.*

### Frontend:
```bash
cd frontend
npm install
npm run dev
```
*Accessible at **http://localhost:5173***
