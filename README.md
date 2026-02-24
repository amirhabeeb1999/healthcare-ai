# Healthcare AI — Clinical Decision Support System

AI-Assisted Clinical Decision Support & Patient Risk Prediction Portal.

## Architecture

```
Browser (Doctor Dashboard)  →  Frontend (Next.js + Tailwind)  →  Backend API (Node/Express)  →  SQLite DB + Mock AI Service
```

### Services

| Service | Tech | Port | Directory |
|---------|------|------|-----------|
| Frontend | Next.js 16 + Tailwind v4 | 3000 | `frontend/` |
| Backend API | Express.js + sql.js (SQLite) | 5000 | `backend/` |

## Quick Start

### 1. Install dependencies

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 2. Start the backend (Terminal 1)

```bash
cd backend
npm run dev
```

Backend: http://localhost:5000  
Health check: http://localhost:5000/api/health

### 3. Start the frontend (Terminal 2)

```bash
cd frontend
npm run dev
```

Frontend: http://localhost:3000

> **Windows PowerShell note:** If `npm` is blocked by execution policy, prefix commands with `cmd /c`, e.g. `cmd /c npm run dev`

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Doctor (Internal Med) | `dr.smith` | `password123` |
| Cardiologist | `dr.patel` | `password123` |
| Nurse (ICU) | `nurse.jones` | `password123` |
| Admin | `admin` | `password123` |

## Features

### Pages
- **Login** — JWT authentication with role-based access
- **Patient List** — Search, filter by risk level, stats dashboard
- **Patient Dashboard** — 7 tabs:
  - **Overview** — Vitals, active medications, recent labs, encounters, contact info
  - **AI Summary** — One-click clinical history summarization
  - **Risk Panel** — Sepsis, 30-day readmission, ICU probability predictions
  - **Med Safety** — Drug interaction warnings, contraindications, allergy checks
  - **Treatment** — Evidence-based suggestions with citations
  - **Timeline** — Chronological encounter history
  - **AI Chat** — Conversational chart assistant

### AI Endpoints (Backend)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/summarize/:id` | POST | Clinical summary generation |
| `/api/ai/risks/:id` | GET | Risk prediction (sepsis, readmission, ICU) |
| `/api/ai/medications/:id` | GET | Medication safety analysis |
| `/api/ai/treatment/:id` | GET | Evidence-based treatment suggestions |
| `/api/ai/chat` | POST | Conversational chart Q&A |

### Seed Data
- 4 users, 6 patients, 18 encounters, 34 lab results, 25 medications, 18 vitals
- Covers: diabetes/CKD, heart failure, COPD/sepsis, lupus, cirrhosis, asthma

## API Reference

### Auth
- `POST /api/auth/login` — `{ username, password }` → `{ token, user }`
- `GET /api/auth/verify` — Header: `Authorization: Bearer <token>`

### Patients (requires auth)
- `GET /api/patients` — List all (query: `search`, `risk_level`, `status`)
- `GET /api/patients/:id` — Full patient record with encounters/labs/meds/vitals

### AI (requires auth)
- `POST /api/ai/summarize/:patientId` — Generate clinical summary
- `GET /api/ai/risks/:patientId` — Risk predictions
- `GET /api/ai/medications/:patientId` — Medication safety check
- `GET /api/ai/treatment/:patientId` — Treatment suggestions
- `POST /api/ai/chat` — `{ patientId, question }` → `{ response }`

## Audit Logging
All actions are logged to the `audit_log` table (HIPAA compliance).
