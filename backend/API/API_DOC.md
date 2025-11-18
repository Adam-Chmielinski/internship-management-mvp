# Internship Management API Reference

Base: `/API`

Auth: For protected endpoints include header `Authorization: Bearer <token>` where required.

---

## Auth / Login

### POST /API/login
- Description: Authenticate a user (HR / Supervisor / Intern). Issues JWT (1h).
- Auth: none
- Body (JSON):
  - `email`: string
  - `password`: string
- Success (200):

```json
{
  "token": "<jwt>",
  "id": 123,
  "role": "HR" // or "Supervisor" or "Intern"
}
```
- Errors:
  - 401 Invalid credentials
  - 500 Login failed

---

## All users / lookup
Mounted from `all_users.js` as `/API/all_users`

### GET /API/all_users/interns
- Description: List all interns.
- Auth: none
- Response: Array of interns

### GET /API/all_users/unassignedInterns
- Description: Interns with no program assigned (program_id is NULL).
- Auth: none

### GET /API/all_users/supervisors
- Description: List supervisors.
- Auth: none

---

## Checklist
Mounted as `/API/checklist`

### GET /API/checklist/:participantId
- Description: Return assigned tasks for a participant (intern).
- Auth: none
- Path params:
  - `participantId` (number)
- Response: array of assignment objects

### POST /API/checklist/update/:task_id
- Description: Update activity status (protected).
- Auth: required (authenticateToken)
- Path params:
  - `task_id` (number)
- Body:
  - `status`: "Pending" | "In progress" | "Completed"
- Response: `{ message: 'Activity updated successfully', activity: <updated row> }`

---

## Documents
Mounted as `/API/documents`.

### POST /API/documents/upload/:internId
- Description: Upload a document for intern. multipart/form-data with file field `document`.
- Auth: none
- Path params:
  - `internId`
- Body/form:
  - `document` (file)
  - `documentType` (string)
- Success (201):

```json
{ "message": "File uploaded successfully", "document": { /* inserted row */ } }
```

### GET /API/documents/:internId
- Description: List all documents for a given intern.
- Auth: none
- Response:

```json
{ "documents": [ { "id": 1, "doc_type": "...", "file_path": "docs/xxx.pdf", "upload_date": "..." } ] }
```

### GET /API/documents/download/:documentId
- Description: Download a document (sends file).
- Auth: none
- Path params:
  - `documentId`
- Responses:
  - 200: triggers file download
  - 404: Document not found
  - 500: File download failed

Notes:
- Upload accepts .pdf .doc .docx .txt and stores files under `/docs` folder; `file_path` saved as relative `docs/filename`.

---

## Certificate generation
Mounted as `/API/certificate`.

### POST /API/certificate/:internId
- Description: Generate a PDF certificate for the intern, save to `docs/`, record in `Documents` table and try to email it.
- Auth: none
- Path params:
  - `internId`
- Success: responds "success" (string)
- Errors:
  - 404 intern not found
  - 500 server error

### GET /API/certificate/download
- Description: Download the latest final certificate for the authenticated intern.
- Auth: required (authenticateToken) and role must be "Intern"
- Response: file download or 404 if not found

Notes:
- Uses `nodemailer` with env `EMAIL_USER` and `EMAIL_APP_PASSWORD` for sending email.

---

## HR endpoints
Mounted as `/API/hr`.

All HR endpoints require `authenticateToken`.

### GET /API/hr/fullName
- Description: Return full name of HR user (from `req.userId`)
- Auth: required

### GET /API/hr/internships
- Description: Return internship programs for HR's host org (req.userId), including interns with completion percentage.
- Auth: required

### POST /API/hr/createIntern
- Description: Create an intern (password hashed).
- Auth: required
- Body: `{ full_name, email, password, training_sector }`
- Responses:
  - 201 Created
  - 500 Email already in use or creation failed

### POST /API/hr/createSupervisor
- Description: Create supervisor (password hashed)
- Body: `{ full_name, email, password }`

### POST /API/hr/createInternship
- Description: Create internship program for HR host org.
- Body: `{ program_name, start_date, end_date, supervisor_id }`
- Response 201

### PATCH /API/hr/assignIntern
- Description: Assign an intern to a program and create tasks based on training sector.
- Body: `{ program_id, intern_id }`
- Response 201

### PATCH /API/hr/unassignIntern
- Description: Remove intern from program and delete their Intern_Activities.
- Body: `{ intern_id }`
- Response 201

---

## Supervisor endpoints
Mounted as `/API/supervisor`.

All require `authenticateToken`.

### GET /API/supervisor/fullName
- Response: supervisor's `full_name`

### GET /API/supervisor/interns
- Description: List interns assigned to the supervisor (based on programs supervised by `req.userId`)
- Response: array of intern objects

### GET /API/supervisor/intern/:internId
- Description: Get intern details (full_name, training_sector, program_name)
- Path param: `internId`

### GET /API/supervisor/checklist/:internId
- Description: Get checklist for intern (same as checklist)

### PATCH /API/supervisor/interns/approve
- Description: Supervisor approves intern final approval. Validates intern exists, belongs to supervisor, optionally enforces all tasks completed.
- Body: `{ participantId }` (intern id)
- Responses:
  - 200 success
  - 403 unauthorized
  - 404 intern not found
  - 400 not all tasks completed (with `remainingTasks`)

### POST /API/supervisor/intern/weekly
- Description: Create or update weekly monitoring report for an intern (upserts by participant_id + week_num).
- Auth: required
- Body:
  - `participantId` (intern id)
  - `evaluation` (string)
- Response: 201 `{ message: 'Weekly report saved', report: { ... } }`
- Notes: Determines next `week_num` automatically from last saved; validates intern belongs to supervisor and `weekNum` within program duration.

---

## Intern endpoints
Mounted as `/API/intern`.

### GET /API/intern/:internId/profile
- Auth: required
- Path param: `internId` (integer)
- Response:
```json
{
  "id": 1,
  "full_name": "John Doe",
  "email": "...",
  "training_sector": "...",
  "tutor_final_approval": true,
  "is_enrolled": true,
  "program": { "id": 1, "name": "...", "start_date":"...", "end_date":"..." },
  "supervisor": { "id": 2, "name":"...", "email":"..." }
}
```

### GET /API/intern/:internId/progress
- Auth: required
- Returns `total_tasks`, `completed_tasks`, `percent`

### GET /API/intern/:internId/monitoring
- Auth: required
- Returns recent monitoring rows: `{ monitoring: [ { id, week_num, tutor_evaluation, tutor_id } ] }`

### GET /API/intern/:internId/documents
- Auth: required
- Returns up to 5 recent documents for the intern: `{ documents: [...] }`

### GET /API/intern/checklist/:internId
- Auth: none (route currently public)
- Returns assigned tasks (same schema as checklist above)

---

