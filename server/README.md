# STOCKER Backend (V1 core)

## What's implemented and working
- MongoDB/Mongoose models: User, Business, Role, TenantMembership, Branch,
  Department, Category, Product, Supplier, ProductBatch, Inventory,
  InventoryMovement, Customer, Counter, Sale, Refund, Invoice, Feedback,
  Notification, Ambassador, Referral, Commission, AuditLog
- JWT + bcrypt auth: register (atomic: User + Business + default Roles +
  Owner TenantMembership in one transaction), login, /me, change password
- Tenant isolation middleware: authenticate -> resolveTenant -> requirePermission,
  tenant context is ALWAYS derived from the authenticated user's membership,
  never from a client-supplied businessId
- Centralized server-side RBAC (server/config/permissions.js) — 7 default
  roles with permission sets, fails loudly on a typo'd permission key
- Products CRUD + barcode lookup + text search, all business-scoped
- Inventory: concurrency-safe atomic stock adjustment (no read-then-write),
  append-only InventoryMovement audit trail, low-stock query
- Branches CRUD
- POS sale transaction: fully atomic (validate -> create sale -> deduct
  inventory per line -> movement -> audit log), server-trusted pricing,
  split payments, tenant-safe sequential sale numbering (STK-YYYYMMDD-0001)
- Refunds: validated against original sale, per-line and total refundable
  caps enforced, inventory restored, audited

## Verified so far
- Every file passes `node --check` (syntax)
- The full app module graph loads cleanly with no import/wiring errors
  (`node -e "require('./app.js')"`)
- NOT yet tested against a live MongoDB Atlas cluster — this sandbox has no
  network path to Atlas, so the actual transaction behavior (session.withTransaction,
  concurrent-sale stock guards, etc.) needs to be run against your real
  cluster before you trust it in production. Test the "Testing checklist"
  below first.

## Product layers still to build
Attendance (clock in/out + duplicate-session guard), PDF/thermal receipt
templates, invoice printing, business-type modules (pharmacy expiry alerts/
FEFO, wholesale pricing tiers, supermarket departments), expanded analytics,
Subscriptions + Paystack webhooks, automatic commission creation/payouts,
and richer platform administration.

The current slice includes staff management, branch creation, invoices,
feedback and notifications, a separate platform-admin dashboard, and an
ambassador dashboard with server-side referral attribution. Commission
records use a fixed 10% rate and must be created from a verified subscription
payment hook when billing is implemented.
The active frontend now uses this API for authentication, the dashboard,
inventory, POS, sales history, and the tenant admin workspace. The public
product page is `home.html`. Firebase files remain legacy and are not part
of the active application path.

## Setup
1. `cp .env.example .env` and fill in a real MongoDB Atlas URI (must be a
   replica set — any Atlas cluster, including the free M0 tier, qualifies)
   and a long random JWT_SECRET.
2. `npm install`
3. `npm start` (or `npm run dev` for auto-restart)
4. `GET /api/health` should return `{"success":true,"status":"ok"}`

## Testing checklist before you trust this with real data
- [ ] Register a business, confirm User+Business+Roles+Membership all exist
      atomically (kill the connection mid-request once to confirm partial
      writes don't survive)
- [ ] Login with wrong password -> 401, correct password -> token
- [ ] Hit a protected route with no token -> 401, expired/garbage token -> 401
- [ ] Create two businesses, confirm Business A's token cannot read/write
      Business B's products/sales/inventory even by guessing an ObjectId
- [ ] Create a product with stock 5, fire two concurrent sales for 3 units
      each — exactly one should succeed, the other should get INSUFFICIENT_STOCK
- [ ] Complete a sale, confirm Inventory decremented and an InventoryMovement
      row was created with correct previous/new quantity
- [ ] Refund part of a sale, then try to refund more than what's left —
      should be rejected
- [ ] Confirm a role without `sales.refund` gets 403 on the refund endpoint
