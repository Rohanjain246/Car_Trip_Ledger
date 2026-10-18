# DriveLog Car Tracker

A car-tracking portal for recording daily trips, payments, and fuel fills. It includes MongoDB-backed accounts, secure sessions, and role-based admin access.

## Run locally

1. Install Node.js and run `npm install`.
2. Start MongoDB locally or create a MongoDB Atlas database.
3. Copy `.env.example` to `.env`. Set `MONGODB_URI` to your database and replace `JWT_SECRET` with a random secret of at least 32 characters. Keep `.env` private and never commit it.
4. In one terminal run `npm run server`.
5. In another terminal run `npm run dev`, then open the Vite URL shown in the terminal.

Vite proxies `/api` to the backend on port 4000. For production, serve the frontend and API on the same origin (or configure a same-site reverse proxy); the session cookie is HTTP-only and SameSite strict.

## Create the first administrator

Public sign-up always creates a regular user. Users can view their profile and read monthly tracker totals. Provision an administrator from a trusted machine using:

```sh
ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters' npm run create-admin -- admin@example.com "Admin Name"
```

The admin password is read from the environment and only its bcrypt hash is stored. Avoid saving real passwords in shell history. The command creates or promotes the specified account; run it only for an identity you have verified.

Admins can enter and edit trips and fuel fills, choose a month or date range to load matching previous records, and open the People & access directory to view registered accounts and their roles. No historical records load in the admin view until a month or complete date range is selected. The overview includes a current-month Yellanka-trip donut split into escort (₹870), non-escort (₹580), and other non-Yellanka trip amounts. Regular users have a read-only tracker summary, can choose the current or any previous month for its totals, and can open that month's previous-record details. They do not see trip/CNG entry controls or admin-wide history filters. Registration cannot grant admin privileges.

## Data and access

Names and email addresses are stored as ordinary readable MongoDB fields. Passwords are never stored in readable or decryptable form; they are hashed with bcrypt. Roles are assigned by the server, and admin API requests verify the current database role on every request. User sessions expire after eight hours.

The tracker reads and writes its configured Google Apps Script sheet. It loads monthly tabs ending in `Tracker` or `Tracking` (for example, `June_Tracker` or `October Tracking`). That sheet is shared by all signed-in users and admins; portal sign-in does not partition tracker records by account or make them private to an individual user. The role-based tracker views are a portal display rule, not a data-access boundary for anyone with direct access to the Apps Script sheet or endpoint.
