# Internship Management — Usage & Deployment Guide

This document explains how to run and use the Internship Management MVP, how to create users, what each role can do, and details of the API and frontend flows.

## Overview
The project contains a Node.js/Express backend and a React frontend. The backend exposes REST endpoints for authentication, user management, internship programs, activities (checklist), file/document handling, certificate generation, and weekly monitoring. PostgreSQL is used as the database and uploaded documents are stored in the `docs/` folder.

Repository layout (important paths):
- `backend/API/` — Express API server (routes, db, auth helpers)
- `frontend/` — React SPA (src, components)
- `docs/` — uploaded/generated PDFs and documents

## Tech stack (short)
- Backend: Node.js, Express, pg / pg-promise, bcrypt, jsonwebtoken, multer, pdfkit, nodemailer
- Database: PostgreSQL (managed/hosted, connection configured in `backend/API/db.js`)
- Frontend: React (create-react-app), Axios

## Environment & configuration
Important environment variables used by the backend (place in `backend/API/.env` or system env):
- `PORT` — backend port (default 3000)
- `JWT_SECRET` — secret used to sign JWT tokens (required)
- `EMAIL_USER` — email account used to send certificate emails (optional but recommended)
- `EMAIL_APP_PASSWORD` — app password for the email account (if using Gmail)

Note: `backend/API/db.js` currently constructs a `pg` Pool. In your deployment you should move DB credentials to environment variables (host, user, database, password, port, ssl options) rather than editing source.

Frontend configuration:
- API base URL is defined in `frontend/src/Config/api.js` as `API_URL`. Update it to point to your backend (for local dev: `http://localhost:3000`).

## Quick start — running locally
Prerequisites:
- Node.js (v16+ recommended)
- npm
- PostgreSQL and the application database with required tables (see `docs/database_doc.md` if present)

Backend (from repo root):

```bash
cd backend/API
npm install
# configure environment variables (JWT_SECRET, DB credentials, etc.)
npm start
```

By default the backend listens on `0.0.0.0:3000`.

Frontend:

```bash
cd frontend
npm install
# ensure API_URL in `frontend/src/Config/api.js` points to backend
npm start
```

If `react-scripts` cannot be found, run `npm install` in the frontend folder to restore dependencies.

## Authentication
Login endpoint:
- POST `/API/login` (body JSON `{ email, password }`) — responds with JSON `{ token, id, role }`.
- Token expiry: 1 hour.

Use the returned JWT for protected endpoints in the `Authorization: Bearer <token>` header.

Server-side token verification is implemented in `backend/API/auth.js` (middleware `authenticateToken`), which sets `req.userId` and `req.role` from the token payload.

## Roles and permissions (what each role can do)
The app has three role types: `HR`, `Supervisor`, `Intern`.

HR
- Create interns: `POST /API/hr/createIntern` (protected)
  - Body: `{ full_name, email, password, training_sector }`
  - Passwords are hashed with bcrypt.
- Create supervisors: `POST /API/hr/createSupervisor` (protected)
  - Body: `{ full_name, email, password }`
- Create internship programs: `POST /API/hr/createInternship` (protected)
  - Body: `{ program_name, start_date, end_date, supervisor_id }`
- Assign/unassign interns to a program: `PATCH /API/hr/assignIntern`, `PATCH /API/hr/unassignIntern` (protected)
  - Assigning an intern automatically creates activity assignments (based on the intern's `training_sector`).
- View internship programs for their host organisation: `GET /API/hr/internships` (protected)

Supervisor
- View own profile: `GET /API/supervisor/fullName` (protected)
- List interns assigned to them: `GET /API/supervisor/interns` (protected)
- Get details for a specific intern: `GET /API/supervisor/intern/:internId` (protected)
- Get intern checklist: `GET /API/supervisor/checklist/:internId` (protected)
- Approve an intern's final approval: `PATCH /API/supervisor/interns/approve` (protected)
  - Body: `{ participantId }` — will set `tutor_final_approval = true` if the intern belongs to the supervisor and (by default) all tasks are completed.
- Submit weekly monitoring report for an intern: `POST /API/supervisor/intern/weekly` (protected)
  - Body: `{ participantId, evaluation }` — the route computes week number automatically and upserts the report.

Intern
- View profile: `GET /API/intern/:internId/profile` (protected)
- View progress summary: `GET /API/intern/:internId/progress` (protected)
- View weekly monitoring reports: `GET /API/intern/:internId/monitoring` (protected)
- View up to 5 recent documents: `GET /API/intern/:internId/documents` (protected)
- Download final certificate (authenticated interns only): `GET /API/certificate/download` (protected — role must be `Intern`)

Public / unauthenticated endpoints
- Some routes are intentionally public (e.g., GET checklist route under `/API/checklist/:participantId` and some document endpoints) — check API routes for exact auth requirements.

## API endpoints (summary)
Base path in code: routes are mounted under various subpaths in `backend/API/app.js`. The deployed API base path earlier documentation uses `/API/*` — but the server code mounts route files under their folder names (e.g., `/checklist`, `/login`, `/hr`, `/supervisor`, `/intern`, `/documents`, `/certificate`). When calling the API from the frontend, the `API_URL` should reflect the server root (e.g., `http://localhost:3000`).

Key endpoints (full behaviors documented in `backend/API/API_DOC.md`):
- Auth: `POST /login` — authenticate and receive JWT
- All users: `/getAll` routes (interns, supervisors, unassigned interns)
- Checklist: `GET /checklist/:participantId`, `POST /checklist/update/:task_id` (update requires auth)
- Documents: `POST /documents/upload/:internId` (multipart/form-data with field `document` and `documentType`), `GET /documents/:internId`, `GET /documents/download/:documentId`
- Certificate generation: `POST /certificate/:internId` (generates PDF and saves to `docs/`, attempts to email), `GET /certificate/download` (intern role)
- HR: `POST /hr/createIntern`, `POST /hr/createSupervisor`, `POST /hr/createInternship`, `PATCH /hr/assignIntern`, `PATCH /hr/unassignIntern`, `GET /hr/internships`
- Supervisor: `GET /supervisor/interns`, `GET /supervisor/intern/:internId`, `POST /supervisor/intern/weekly`, `PATCH /supervisor/interns/approve`
- Intern: profile/progress/monitoring/documents endpoints as described above

Refer to `backend/API/API_DOC.md` for example request/response shapes and error codes.

## How to create users (practical notes)
- HR accounts are considered the highest admin in this app. The login route searches HR table first, then Supervisor, then Intern — therefore HR accounts should be created via direct DB insert or an initial seed script.
- To create an intern or supervisor via API you must be an authenticated HR user (send `Authorization: Bearer <token>`):
  - Create intern: `POST /hr/createIntern` with `{ full_name, email, password, training_sector }`
  - Create supervisor: `POST /hr/createSupervisor` with `{ full_name, email, password }`
- If you do not have an HR account, create one directly in the database (insert into "HR" table) or ask the developer/maintainer to seed an admin account.

## File uploads and documents
- Upload: `POST /documents/upload/:internId` — use multipart/form-data with the `document` file field and `documentType` text field.
- Accepted types: .pdf, .doc, .docx, .txt. Limit: 20MB (configured in multer).
- Uploaded files are stored in `docs/` and a record is saved to the `Documents` table with a `file_path` relative to the repo (e.g., `docs/filename-<timestamp>.pdf`).
- Download: `GET /documents/download/:documentId` — sends the file using `res.download`.

## Certificate generation
- `POST /certificate/:internId` will:
  - Query intern, program and supervisor details
  - Generate a landscape A4 PDF certificate with pdfkit and save it to `docs/`
  - Insert a record into the `Documents` table with `doc_type = 'Final Certificate'`
  - Try to send the certificate to the intern's email using `nodemailer` (Gmail config used by default)
- To allow emailing, set `EMAIL_USER` and `EMAIL_APP_PASSWORD` in environment variables.
- Interns can retrieve their most recent final certificate via `GET /certificate/download` (must be authenticated as an Intern).

## Frontend usage notes
- Login UI located in `frontend/src/Components/Auth/Login.jsx`.
- Authentication state is managed with React Context in `frontend/src/context/AuthContext.jsx` and used by `ProtectedRoute.jsx` to block unauthorized pages.
- Configure the backend base address in `frontend/src/Config/api.js` (change `API_URL`).
- The frontend expects the backend to expose the REST routes on the configured `API_URL` and uses Axios for requests.

## Troubleshooting
- `react-scripts: command not found` — run `npm install` inside the `frontend` folder and retry.
- Token errors: verify `JWT_SECRET` is set and consistent between token creation and `auth.js` verification.
- Email fails: confirm `EMAIL_USER` and `EMAIL_APP_PASSWORD` are correct and SMTP settings allow sending; consider using a transactional email service for production.

## Where to find more
- API reference: `backend/API/API_DOC.md` — per-endpoint details and example responses
- Backend routes and logic: `backend/API/routes/*.js`
- Frontend components and auth flows: `frontend/src/Components/*`, `frontend/src/context/AuthContext.jsx`

---



