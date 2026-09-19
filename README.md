# stocker

## Quick Start
The active application uses the MongoDB/Express API under `server/` and the vanilla HTML/CSS/JavaScript client.

1. Copy `server/.env.example` to `server/.env` and provide a MongoDB Atlas URI and long JWT secret.
2. Run `npm install` inside `server/`.
3. Start the API with `npm start` inside `server/`.
4. Serve this directory from a static server such as VS Code Live Server and open `home.html`.
5. Create a business from `login.html`; registration creates the owner, roles, membership, and default branch atomically.

## Files
| File | Purpose |
|------|---------|
| `home.html` | Public product page |
| `login.html` | JWT sign-in and business registration |
| `index.html` | Authenticated operational dashboard |
| `inventory.html` | Tenant-scoped products and stock adjustments |
| `sales.html` | Barcode/search POS, atomic sales, receipts, and history |
| `server/` | Express, Mongoose, JWT, RBAC, inventory, sales, and analytics API |
| `admin.html` | Tenant owner/admin workspace for branches and activity |
| `staff.html` | Tenant staff and role management |
| `invoices.html` | Tenant invoice creation and history |
| `feedback.html` | Tenant support and feedback conversations |
| `ambassador.html` | Field marketer referral and commission dashboard |
| `platform-admin.html` | Separate internal platform operations dashboard |

`admin.html`, `setup-business.html`, `script.js`, and `firebase-rules.json` are legacy Firebase files. They are isolated from the active Mongo/JWT flow and must not be used for production administration.

## Current Status
The core V1 backend is implemented for authentication, tenant isolation, RBAC, branches, products, inventory movements, atomic POS sales, refunds, and dashboard analytics. Staff, attendance, invoices, subscriptions/Paystack, ambassadors, platform administration, feedback, and full frontend migration remain the next product layers.

Never commit real secrets. Rotate any credentials previously present in legacy files or local environment files before deployment.

## Accessing Internal Dashboards

- **Tenant admin:** sign in as a business Owner or a role with
	`settings.manage`, then open `admin.html`. The link appears in the normal
	workspace navigation for those users.
- **Ambassador:** sign in with a normal STOCKER account and open
	`ambassador.html`. The first visit creates a pending ambassador profile;
	activate it in MongoDB by setting `status` to `ACTIVE` after approval.
	The dashboard generates the referral link and displays server-recorded
	referrals and 10% commission records.
- **Platform admin:** use a dedicated internal user account, set its
	`platformRole` to `SUPER_ADMIN`, `ADMIN`, `SUPPORT`, or `FINANCE` in
	MongoDB, then sign in normally and open `platform-admin.html`. Platform
	admins do not need a tenant membership, and tenant Owners are not platform
	admins automatically.

The platform dashboard currently tracks businesses, users, active ambassadors,
commission obligations, and feedback replies. Paystack subscription
verification must be added before recurring commissions are generated
automatically.
"# stocker" 
