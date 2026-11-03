# 🏓 Topshot — Inventory & Order Management Web Application

Topshot is an enterprise-grade Inventory and Order Management Web Application architected for a retail business selling high-performance pickleball rackets. It enforces strict **1:1 physical racket-to-order mapping**, handles barcode sticker life-cycles, mobile phone camera scanning, discount authorization controls, and seamless Delhivery logistics integration.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology | Key Responsibility |
|---|---|---|
| **Frontend** | **Next.js 13 (React 18)** + **Tailwind CSS** | Mobile-responsive worker scanner station & CEO analytics dashboard |
| **Backend** | **Next.js App Router (Node.js)** | RESTful Route Handlers, MongoDB Transactions, Business Logic |
| **Database** | **MongoDB / MongoDB Atlas** | Document collections (`skus`, `items`, `orders`) with strict compound indexes |
| **Logistics** | **Delhivery Integration** | Live Delhivery Tracking API client with deterministic mock fallback |
| **Scanning** | **`html5-qrcode`** | Mobile browser rear-camera 1D barcode scanner (Code 128, QR) |
| **Label Generation** | **`jspdf` + `jsbarcode`** | Client & server printable barcode sticker sheets (A4 & thermal 50x35mm) |
| **Financial Exports**| **`xlsx`** | CSV and Excel workbook generation for auditing |

---

## 🗄️ Database Schemas (MongoDB Atlas)

### 1. `SKU` Collection (`skus`)
- `sku_id` *(String, Unique, Index)*: E.g., `SKU-TOP-AERO-01`
- `name` *(String)*: E.g., "Topshot Aero Carbon 16mm Pro Racket"
- `preset_selling_cost` *(Number)*: Base retail price before discount (MSRP)
- `total_quantity` *(Number)*: Live count of available "In-Stock" rackets
- `category` *(String)*: Default "Pickleball Racket"
- `weight_grams` *(Number)*: Average racket weight (e.g. 230g)

### 2. `Item` Collection (`items`)
- `pickle_racket_id` *(String UUID, Unique, Index)*: Unique ID for the physical racket
- `sku_id` *(String, Index, Ref: SKU)*: Associated SKU
- `barcode_value` *(String, Unique, Index)*: Barcode format `TS-{SKU}-{TIMESTAMP}-{RANDOM}`
- `status` *(Enum)*: `['In-Stock', 'Sold', 'Returned']`
- `order_id` *(String, Optional)*: Order ID if sold
- `batch_id` *(String, Optional)*: Acquisition batch reference
- `history` *(Array)*: Audit logs (`ACQUIRED`, `SOLD`, `RETURNED`, `RELABELED`)

### 3. `Order` Collection (`orders`)
- `order_id` *(String, Unique, Index)*: Format `ORD-XXXX-XXXX`
- `pickle_racket_id` *(String, Unique, Index)*: **Strict 1:1 mapping** to physical item
- `barcode_value` *(String)*: Barcode at time of sale
- `sku_id` *(String)*: SKU reference
- `delivery_id` *(String, Unique, Index)*: Delhivery tracking number / waybill
- `preset_selling_cost` *(Number)*: Base price
- `discount_percentage` *(Number)*: Applied discount %
- `admin_override` *(Boolean)*: `true` if discount > 20%
- `admin_override_by` *(String)*: Identifier of PIN authorization
- `final_selling_price` *(Number)*: Calculated sale price
- `shipping_cost` *(Number)*: Delhivery logistics cost
- `buyer_name` *(String)*: Auto-fetched from Delhivery
- `buyer_address` *(String)*: Auto-fetched from Delhivery
- `status` *(Enum)*: `['Dispatched', 'Delivered', 'Returned', 'Cancelled']`

---

## 🔄 Core Workflows

### Phase 1: Inbound Inventory Acquisition
1. Admin inputs SKU and Quantity received (e.g. 10 pcs).
2. System auto-generates unique barcode strings (`TS-xxxx`) and unique UUIDs (`pickle_racket_id`).
3. Records are persisted as `In-Stock` items, and the SKU's `total_quantity` increments atomically.
4. Generates an instant printable **PDF barcode sticker sheet** (available in 50x35mm thermal sticker rolls or standard A4 24-label sheets) to affix to each racket.

### Phase 2: Selling & Order Dispatch
1. Worker clicks **"Scan Racket"** on their mobile phone, triggering the rear camera via `html5-qrcode`.
2. UI looks up the barcode and prepopulates the racket model name and preset cost.
3. Worker inputs manual discount:
   - **Hard Rule**: If discount **> 20%**, the system blocks submission and prompts for **CEO / Admin PIN** (Default: `9876`).
4. Worker inputs or scans Delhivery `delivery_id`.
5. System verifies Delhivery waybill, fetches buyer details and shipping cost.
6. Enforces **strict 1:1 mapping** (ensuring neither the racket nor the tracking ID is reused).
7. Transitions item status to `Sold` and records the Order.

### Phase 3: Return & Re-Labeling (Edge Case)
- **Problem**: Returned pickleball racket parcels often have torn, scuffed, or removed stickers.
- **Solution**:
  1. Worker enters `order_id` or `delivery_id` in the Return view.
  2. Original order is marked as `Returned`.
  3. Original item record is retired as `Returned`.
  4. System automatically provisions a **brand new `pickle_racket_id` (UUID)** and a **brand new unique barcode**.
  5. The new item is placed into `In-Stock` and the SKU count increases by 1.
  6. The UI generates a fresh printable barcode label so the worker can stick it on the racket and return it to the shelf.

### Phase 4: CEO Business Metrics & SKU Management
- Real-time KPI summaries: Gross Revenue, Net Revenue, Units Sold, Live Inventory, and Return Rate.
- Interactive Weekly and Monthly revenue breakdown charts.
- SKU table with live stock indicators and inline price editing.
- 1-click **Excel (.xlsx)** and **CSV** export containing complete financial and customer transaction fields.

---

## 🚀 Setup & Execution

### 1. Environment Configuration
Create or edit `.env.local`:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/topshot_db?retryWrites=true&w=majority
ADMIN_PIN=9876
DELHIVERY_API_KEY=mock_delhivery_api_key_topshot
DELHIVERY_ENV=mock
```

### 2. Seed Sample Data
```bash
npm run seed
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) on your desktop or mobile browser.
