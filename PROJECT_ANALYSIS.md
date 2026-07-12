# TransitOps: Smart Transport Operations Platform
## System Architecture & Technical Specifications (Project Analysis)

This document outlines the architectural blueprint, database design, API contract, and UI/UX design specifications for **TransitOps**, a premium enterprise SaaS platform designed to optimize fleet operations, trip dispatching, driver management, and maintenance workflows.

---

## 1. Executive Summary & Product Vision
TransitOps is a centralized fleet and transport operations platform that solves manual dispatch inefficiencies, unoptimized maintenance tracking, and fragmented operational analytics. 
*   **Target Audience**: Fleet owners, transport operations managers, dispatchers, drivers, and maintenance engineers.
*   **Design Inspiration**: Fleetio, Motive, Stripe Dashboard, and Linear.
*   **Tech Stack**: 
    *   **Frontend**: React (Vite) + Tailwind CSS + shadcn/ui + Recharts + Framer Motion + Axios + React Hook Form + Zod
    *   **Backend**: Django + Django REST Framework (DRF) + Simple JWT (Authentication)
    *   **Database**: PostgreSQL / SQLite (Development)

---

## 2. User Roles & Role-Based Access Control (RBAC)
The system utilizes role-based authorization to secure views and API endpoints:

| Role | Responsibilities | Access Level |
| :--- | :--- | :--- |
| **System Administrator (Admin)** | User provisioning, role assignment, fleet registry, billing, global analytics | Full Read/Write (Superuser) |
| **Dispatcher / Operations Manager** | Fleet CRUD, driver CRUD, trip scheduling, cargo validation, live dispatching | Read/Write on Fleet, Drivers, Trips |
| **Maintenance Manager** | Scheduling maintenance, logging repairs, fuel tracking, updating vehicle status | Read/Write on Maintenance & Fuel |
| **Driver** | View assigned trips, update trip status, submit fuel logs and expense receipts | Read-Only on Trips; Write-Only on Fuel/Expenses |

---

## 3. Database Schema Design (ERD)
The database structure enforces domain constraints and references between entities:

### Entities & Attributes

#### `User` (Extends Django AbstractUser)
*   `id`: UUID (Primary Key)
*   `email`: String (Unique, EmailField)
*   `role`: Choice (Admin, Dispatcher, Driver, Maintenance)
*   `phone`: String (Optional)
*   `date_joined`: DateTime

#### `Vehicle`
*   `id`: UUID (Primary Key)
*   `make`: String
*   `model`: String
*   `year`: Integer
*   `license_plate`: String (Unique, Indexed)
*   `vin`: String (Unique, 17-character limit)
*   `status`: Choice (Available, On Trip, Maintenance, Out of Service)
*   `payload_capacity_kg`: Decimal (Max weight validation)
*   `fuel_type`: Choice (Diesel, Petrol, Electric, CNG)
*   `odometer`: Decimal (Current mileage, positive only)
*   `created_at`: DateTime

#### `Driver`
*   `id`: UUID (Primary Key)
*   `user`: ForeignKey(User, on_delete=CASCADE, unique=True)
*   `license_number`: String (Unique)
*   `license_class`: Choice (Class A, Class B, Class C)
*   `license_expiry`: Date
*   `status`: Choice (Available, On Trip, Suspended)
*   `created_at`: DateTime

#### `Trip`
*   `id`: UUID (Primary Key)
*   `trip_number`: String (Unique, Auto-generated, e.g., TRP-YYYYMMDD-XXXX)
*   `vehicle`: ForeignKey(Vehicle, on_delete=PROTECT)
*   `driver`: ForeignKey(Driver, on_delete=PROTECT)
*   `route_origin`: String
*   `route_destination`: String
*   `estimated_distance_km`: Decimal
*   `actual_distance_km`: Decimal (Nullable)
*   `cargo_type`: String
*   `cargo_weight_kg`: Decimal
*   `status`: Choice (Scheduled, In Progress, Completed, Cancelled)
*   `dispatched_at`: DateTime (Nullable)
*   `completed_at`: DateTime (Nullable)
*   `created_at`: DateTime

#### `MaintenanceLog`
*   `id`: UUID (Primary Key)
*   `vehicle`: ForeignKey(Vehicle, on_delete=CASCADE)
*   `description`: Text
*   `cost`: Decimal
*   `start_date`: Date
*   `end_date`: Date (Nullable)
*   `status`: Choice (Scheduled, In Progress, Completed)
*   `created_at`: DateTime

#### `FuelLog`
*   `id`: UUID (Primary Key)
*   `vehicle`: ForeignKey(Vehicle, on_delete=CASCADE)
*   `driver`: ForeignKey(Driver, on_delete=PROTECT)
*   `liters`: Decimal
*   `cost_per_liter`: Decimal
*   `total_cost`: Decimal (Auto-calculated: liters * cost_per_liter)
*   `odometer_reading`: Decimal (Must be higher than the vehicle's last recorded odometer)
*   `logged_at`: DateTime

#### `ExpenseLog`
*   `id`: UUID (Primary Key)
*   `trip`: ForeignKey(Trip, on_delete=CASCADE)
*   `category`: Choice (Toll, Food, Lodging, Maintenance, Fuel, Miscellaneous)
*   `amount`: Decimal
*   `receipt_image`: String (Image/Document URL, Nullable)
*   `date`: Date

---

## 4. Key Workflows & Mandatory Business Rules
To ensure data integrity and real-time synchronization, the backend enforces the following business logic:

### A. Dispatch Workflow & Capacity Checks
1.  When creating/assigning a Trip, the backend checks:
    *   `cargo_weight_kg` must be <= vehicle's `payload_capacity_kg`.
    *   Assigned `Vehicle` status must be `Available` (not in `Maintenance`, `Out of Service`, or `On Trip`).
    *   Assigned `Driver` status must be `Available` (not `Suspended` or `On Trip`).
    *   Assigned `Driver` license expiry date must be in the future (`license_expiry > today`).
2.  On Dispatch (Trip transition to `In Progress`):
    *   Vehicle status auto-updates to `On Trip`.
    *   Driver status auto-updates to `On Trip`.
    *   Sets `dispatched_at` timestamp.
3.  On Completion (Trip transition to `Completed`):
    *   Vehicle status auto-updates to `Available`.
    *   Driver status auto-updates to `Available`.
    *   Update Vehicle `odometer` using trip's `actual_distance_km`.
    *   Sets `completed_at` timestamp.

### B. Maintenance Lifecycle
*   When a `MaintenanceLog` status changes to `In Progress`, the associated `Vehicle` status must auto-transition to `Maintenance`.
*   When the `MaintenanceLog` is marked `Completed`, the `Vehicle` status auto-transitions back to `Available`.

### C. Fuel & Expenses Calculations
*   **Fuel Efficiency**: Automatically calculated for reports using consecutive `FuelLog` entries:
    Fuel Efficiency = (Odometer_current - Odometer_previous) / Liters_current
*   **Odometer Sequence**: A new `FuelLog` or trip completion odometer entry must be strictly greater than the vehicle's current odometer.
*   **Total Cost Tracking**: Operational cost per vehicle is calculated dynamically:
    Total Cost = Sum(Maintenance Costs) + Sum(Fuel Costs) + Sum(Expenses)

---

## 5. API Design & Endpoint Contracts
All request/response payloads use JSON format. Private routes require `Authorization: Bearer <JWT_TOKEN>`.

### Authentication Endpoints
*   `POST /api/auth/register/` - Create a user account (Admins only for Driver/Dispatcher creation).
*   `POST /api/auth/login/` - Authenticate user, return Access & Refresh tokens + user role profile.
*   `POST /api/auth/refresh/` - Refresh expired access token.
*   `POST /api/auth/logout/` - Blacklist refresh token.

### Vehicle Endpoints
*   `GET /api/vehicles/` - List vehicles with pagination, search (make, model, license_plate), and filter (status, fuel_type).
*   `POST /api/vehicles/` - Create a vehicle.
*   `GET /api/vehicles/<id>/` - Retrieve vehicle details.
*   `PUT /api/vehicles/<id>/` - Full update.
*   `DELETE /api/vehicles/<id>/` - Delete vehicle record.

### Driver Endpoints
*   `GET /api/drivers/` - List drivers with search (name, license_number) and filters (status, license_class).
*   `POST /api/drivers/` - Register driver.
*   `PUT /api/drivers/<id>/` - Update driver details.

### Trip Endpoints
*   `GET /api/trips/` - List trips with filters (status, vehicle_id, driver_id).
*   `POST /api/trips/` - Schedule a trip (triggers cargo, status, and license validations).
*   `PATCH /api/trips/<id>/status/` - Transition trip status (e.g., dispatch, complete, cancel).

### Maintenance, Fuel & Expenses Endpoints
*   `POST /api/maintenance/` - Create maintenance log (transitions vehicle status if `In Progress`).
*   `POST /api/fuel-logs/` - Log fuel purchase (validates odometer sequence, updates vehicle odometer).
*   `POST /api/expenses/` - Log a trip expense.

### Analytics Endpoints
*   `GET /api/analytics/dashboard/` - Return summary cards (Active Trips, Active Vehicles, Under Maintenance, Low Fuel Alerts) and recent activities.
*   `GET /api/analytics/utilization/` - Time-series metrics showing fleet utilization rates.
*   `GET /api/analytics/roi/` - Cost breakdown by vehicle (maintenance vs. fuel vs. expenses).

---

## 6. Frontend Architecture & UI/UX Specifications

### UI Flow & Page Routing
1.  **Auth Guard Layer**: 
    *   `/login`: Seamless glassmorphic credentials portal.
    *   `/register`: Admin restricted user management.
2.  **SaaS Dashboard Portal**:
    *   `/dashboard`: Fleet overview, KPI widgets, interactive charts.
    *   `/vehicles`: Grid/Table view of all assets with status badges and actions.
    *   `/drivers`: Driver roster with license expiry warnings.
    *   `/trips`: Interactive dispatch timeline, status workflow panel.
    *   `/maintenance`: Maintenance scheduling, fuel logging history.
    *   `/reports`: Performance breakdown, PDF/CSV report exports.

### Theme, Typography & Design Tokens
Designed to emulate high-end SaaS applications, adopting a dark-mode first design palette:

*   **Primary Font**: `Inter` / `Outfit` from Google Fonts.
*   **Palette Tokens**:
    *   `Background`: Sleek Slate Dark (`#0B0F19`)
    *   `Card/Panel Background`: Glassmorphic Dark Gray (`#161D30` with `backdrop-filter: blur`)
    *   `Primary accent`: Vibrant Indigo / Electric Blue (`#4F46E5` / `#3B82F6`)
    *   `Success (Available/Completed)`: Emerald Green (`#10B981`)
    *   `Warning (Maintenance/Scheduled)`: Amber Orange (`#F59E0B`)
    *   `Danger (Out of Service/Cancelled)`: Rose Red (`#F43F5E`)
*   **Micro-Animations**: Smooth hover-scaling, routing fades, and card slide-ins driven by Framer Motion.

---

## 7. Implementation Roadmap & Milestones

### Phase 1: Planning & Project Scaffold (Milestone 1-2)
*   Setup React (Vite) structure, Tailwind CSS, shadcn/ui.
*   Setup Django, DRF, configure PostgreSQL/SQLite.
*   Establish directory schemas and environment configurations.

### Phase 2: Auth, Core Registry & Dashboards (Milestone 3-5)
*   JWT authentication implementation, role-based route guarding.
*   Vehicles Registry and Driver Registry CRUD.
*   Executive KPIs dashboard with Recharts visualization.

### Phase 3: Trips, Expenses & Business Workflows (Milestone 6-7)
*   Trip management, capacity checkers, status transition flows.
*   Fuel and Maintenance tracking modules.
*   Automatic status listeners (e.g., auto-transition vehicle/driver states).

### Phase 4: Reports, Integration & Polish (Milestone 8-10)
*   Hooking frontend and backend APIs.
*   CSV/PDF exporter services.
*   Framer motion layout polish, dark mode toggle, global test suite, bug fixing.

---

## 8. Assumptions & Design Decisions
1.  **Driver-User Linkage**: Each `Driver` maps to a distinct `User` account, enabling drivers to log in, view only their assigned trips, and log expenses.
2.  **Odometer Sequence Verification**: If a fuel log is submitted, the odometer reading must be strictly increasing compared to the vehicle's last recorded odometer.
3.  **Soft Deletions**: Deleting vehicles or drivers will trigger soft-deletions on the database to prevent losing historical trip data.
