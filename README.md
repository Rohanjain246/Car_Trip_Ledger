# DriveLog Car Tracker

A car-tracking portal for recording daily trips, payments, and fuel fills. It includes MongoDB-backed accounts, secure sessions, and role-based admin access.

## Run locally

1. Install Node.js and run `npm install`.
2. Start MongoDB locally or create a MongoDB Atlas database.
3. Copy `.env.example` to `.env`. Set `MONGODB_URI` to your database, replace `JWT_SECRET` with a random secret of at least 32 characters, and set `GROQ_API_KEY` for the trip assistant. `APP_SCRIPT_URL` should point to your deployed tracker Apps Script web app. Keep `.env` private and never commit it.
4. In one terminal run `npm run server`.
5. In another terminal run `npm run dev`, then open the Vite URL shown in the terminal.

Vite proxies `/api` to the backend on port 4000 during local development. The Netlify deployment proxies `/api/*` to the Render API through `netlify.toml`; leave `VITE_API_URL` unset or empty for Netlify so browser requests stay same-origin and the session cookie works without third-party-cookie support. For other separately deployed frontend and API hosts, set the frontend build variable `VITE_API_URL` to the API origin and set the API's `FRONTEND_ORIGIN` to the exact frontend origin (scheme and host, no trailing slash). The API allows credentialed CORS only from configured frontend origins. Production session cookies use `Secure` and `SameSite=None` so cross-origin frontend/API deployments can send the HTTP-only session cookie.

For Netlify, use the repository root as the base directory, `npm run build` as the build command, and `dist` as the publish directory; do not set `VITE_API_URL` because Netlify forwards `/api/*` through the same-origin proxy. For Render, set `FRONTEND_ORIGIN=https://cartripledger.netlify.app`, `APP_SCRIPT_URL`, and `GROQ_API_KEY` on the API service. Redeploy both services after changing these settings. Keep `MONGODB_URI`, `JWT_SECRET`, and `GROQ_API_KEY` configured only on the API service.

## Create the first administrator

Public sign-up always creates a regular user. Users can view their profile and read monthly tracker totals. Provision an administrator from a trusted machine using:

```sh
ADMIN_PASSWORD='use-a-unique-password-of-at-least-12-characters' npm run create-admin -- admin@example.com "Admin Name"
```

The admin password is read from the environment and only its bcrypt hash is stored. Avoid saving real passwords in shell history. The command creates or promotes the specified account; run it only for an identity you have verified.

Admins can enter and edit trips and fuel fills, choose a month or date range to load matching previous records, and open the People & access directory to view registered accounts and their roles. No historical records load in the admin view until a month or complete date range is selected. The overview includes a month-by-month chart of trip income and CNG costs, plus a current-month Yellanka-trip donut split into escort (₹870), non-escort (₹580), and other non-Yellanka trip amounts. Regular users have a read-only tracker summary, can choose the current or any previous month for its totals, and can open that month's previous-record details. They do not see trip/CNG entry controls or admin-wide history filters. Registration cannot grant admin privileges.

## Data and access

Names and email addresses are stored as ordinary readable MongoDB fields. Passwords are never stored in readable or decryptable form; they are hashed with bcrypt. Roles are assigned by the server, and admin API requests verify the current database role on every request. User sessions expire after eight hours.

The tracker reads and writes its configured Google Apps Script sheet. It loads monthly tabs ending in `Tracker` or `Tracking` (for example, `June_Tracker` or `October Tracking`). That sheet is shared by all signed-in users and admins; portal sign-in does not partition tracker records by account or make them private to an individual user. The role-based tracker views are a portal display rule, not a data-access boundary for anyone with direct access to the Apps Script sheet or endpoint.

Signed-in users can open the floating DriveLog assistant to ask questions about tracker trips and CNG. The backend reads the Apps Script data and calls Groq; configure `GROQ_API_KEY` and `APP_SCRIPT_URL` on the API service. Each answer displays prompt, response, and total tokens; the chat also shows a running total for the open conversation. Chat requests are limited to 20 per 15 minutes per client.
