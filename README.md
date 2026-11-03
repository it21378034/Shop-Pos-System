# GroceryPro POS & Inventory Management System

**GroceryPro** is an enterprise-grade Grocery Point of Sale (POS) and Inventory Management System designed for modern retail and grocery supermarkets. It is engineered with Clean Architecture (.NET 8 Web API + EF Core) on the backend and React 18 + TypeScript + Vite + Bootstrap 5 on the frontend.

---

## Key Features

1. **High-Speed Point of Sale (POS)**
   - Continuous scanner barcode detection with auto-focus.
   - Real-time scale barcode parsing (EAN-13 price & weight encoded formats).
   - Fast catalog browsing with visual categories and instant search.
   - Cart adjustments, line discounts, bill-level discounts, and tax computation.
   - Multi-payment support: Cash, Card, LankaQR, and Store Credit.
   - Bill suspension (Hold & Retrieve orders).
   - Thermal receipt modal with ESC/POS printable format.

2. **Bilingual UI (English & Sinhala / සිංහල)**
   - Instant language switcher in the top navigation bar.
   - Dual-language product names, categories, units, and receipt headers.

3. **Scale Barcode Engine & Simulator**
   - Built-in tool to generate and simulate weighing scale EAN-13 barcodes (`21` prefix + 5-digit PLU + 5-digit weight + check digit).
   - Direct barcode SVG generator for Code-128, EAN-13, and UPC.

4. **Inventory & Stock Control**
   - Real-time stock on hand and location-based ledger tracking.
   - Low stock warnings and reorder levels.
   - Stock adjustments (damage, shrinkage, count correction, expiry).

5. **Purchasing & GRN**
   - Purchase orders (PO) and Goods Receiving Notes (GRN).
   - Batch and expiry date tracking (FEFO ready).
   - Supplier ledger and balance tracking.

6. **Cash Drawer Management**
   - Shift opening float declaration.
   - Cash-In and Cash-Out tracking (expenses, petty cash, bank drops).
   - End-of-shift reconciliation (expected vs declared cash with variance calculations).

7. **Reports & Analytics**
   - Sales revenue and gross profit metrics.
   - Product-level sales breakdown.
   - Cashier shift performance.
   - CSV export for sales reports.

---

## Default Login Credentials

The database is pre-seeded with sample data and test user accounts:

| Role | Username | Password | Access Level |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `Admin@123` | Full backoffice, POS, inventory, reports, settings |
| **Cashier** | `cashier1` | `Cashier@123` | Fast POS terminal, cash drawer shift operations |

---

## Running Locally

### Prerequisites
- [.NET 8 SDK](https://dotnet.microsoft.com/download/dotnet/8.0)
- [Node.js 18+](https://nodejs.org/)
- SQL Server (LocalDB or SQL Server Express / Developer)

### 1. Start the Backend API
```powershell
cd backend/src/GroceryPro.API
dotnet run
```
- API will start at: `http://localhost:5000`
- Swagger UI will be available at: `http://localhost:5000/swagger`
- The database is auto-created and populated with rich grocery items, categories, and users on initial start.

### 2. Start the Frontend App
```powershell
cd frontend
npm install
npm run dev
```
- Frontend will run at: `http://localhost:5173`
- Log in using `admin` / `Admin@123` or `cashier1` / `Cashier@123`.

---

## Running with Docker Compose

To launch the full stack (SQL Server 2022 + Backend API + Frontend Nginx) in one command:
```powershell
docker-compose up --build
```
- Frontend UI: `http://localhost:3000`
- Backend API: `http://localhost:5000/swagger`
- SQL Server: `localhost:1433`

---

## Running Automated Tests

```powershell
cd backend
dotnet test
```
All unit and integration tests (stock math, weighing scale barcode parser, cart calculations, security) run and pass.

---

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── GroceryPro.Domain/         # Core entities, enums, value objects
│   │   ├── GroceryPro.Application/    # DTOs, interfaces, validation
│   │   ├── GroceryPro.Infrastructure/ # EF Core, DbContext, Migrations, Seed data
│   │   └── GroceryPro.API/            # Controllers, Swagger, Auth middleware
│   └── tests/
│       └── GroceryPro.Tests/          # Unit & integration tests
│
├── frontend/
│   ├── src/
│   │   ├── components/                # Layout, Navbar, modals
│   │   ├── features/
│   │   │   ├── auth/                  # Authentication & Protected routes
│   │   │   ├── pos/                   # High-speed POS terminal & Receipts
│   │   │   ├── dashboard/             # Charts & Key business metrics
│   │   │   ├── products/              # Product catalog & Barcode label modal
│   │   │   ├── inventory/             # Stock ledger & Stock adjustments
│   │   │   ├── purchases/             # Supplier orders & Goods receiving
│   │   │   ├── suppliers/             # Vendor management
│   │   │   ├── expenses/              # Cash drawer sessions & reconciliation
│   │   │   ├── barcodes/              # Scale simulator & Barcode generator
│   │   │   ├── reports/               # Sales & profit reporting with CSV export
│   │   │   └── settings/              # Store branding, currency & scale settings
│   │   ├── i18n/                      # English & Sinhala dictionary translations
│   │   └── services/                  # Axios API client & interceptors
│   └── package.json
│
├── docker-compose.yml                 # Multi-container orchestration
└── README.md
```
