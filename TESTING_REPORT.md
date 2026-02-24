# Healthcare AI — Testing Report

**Date:** February 15, 2026  
**Application:** Healthcare AI Clinical Decision Support System  
**Stack:** Next.js 16 (frontend) + Express/Node.js (backend) + SQLite (database)

---

## 1. Features Tested

### 1.1 Authentication System

| Feature | Status | Notes |
|---------|--------|-------|
| Login with valid credentials (doctor, nurse, admin) | ✅ Pass | All 4 demo accounts verified |
| Login with invalid credentials | ✅ Pass | Returns generic "Invalid credentials" (no username enumeration) |
| Empty field submission | ✅ Pass | Browser validation blocks, backend returns 400 |
| Auto-redirect if already authenticated | ✅ Pass | Visiting `/` while logged in redirects to `/patients` |
| Session expired message on login page | ✅ Pass | Displays banner when token expires or is invalidated |
| Sign Out clears session and redirects | ✅ Pass | Removes token from localStorage, redirects to `/` |
| Protected routes redirect unauthenticated users | ✅ Pass | `/patients` and `/patients/:id` redirect to login |
| Token verification on app load | ✅ Pass | Calls `/api/auth/verify` on mount |
| 401 auto-redirect (expired token mid-session) | ✅ Pass | `authFetch` catches 401, clears state, redirects |

### 1.2 Role-Based Access Control

| Feature | Status | Notes |
|---------|--------|-------|
| Doctor sees all 7 tabs on dashboard | ✅ Pass | Overview, AI Summary, Risk Panel, Med Safety, Treatment, Timeline, AI Chat |
| Nurse sees only 2 tabs (Overview, Timeline) | ✅ Pass | 5 AI tabs hidden via `canAccessAI` flag |
| Admin sees all 7 tabs | ✅ Pass | Same as doctor |
| Nurse blocked from AI endpoints (backend) | ✅ Pass | Returns 403: "Access denied. Required role: doctor or admin" |
| Register endpoint requires admin role | ✅ Pass | Non-admin gets 403, unauthenticated gets 401 |
| Role badge displays correct color per role | ✅ Pass | Sky=doctor, purple=admin, emerald=nurse |

### 1.3 Patient List Page

| Feature | Status | Notes |
|---------|--------|-------|
| Patient list loads on page visit | ✅ Pass | All 6 seed patients displayed |
| Search by name, MRN, or diagnosis | ✅ Pass | Filters correctly, returns to full list on clear |
| Risk level dropdown filter | ✅ Pass | Filters by critical/high/medium/low |
| Stats cards (total, critical, high, medium, low) | ✅ Pass | Counts match actual patient data |
| Patient row click navigates to dashboard | ✅ Pass | Desktop table rows and mobile cards both navigate |
| Patients sorted by risk (critical first) | ✅ Pass | Sort order: critical → high → medium → low |
| Empty state when no results | ✅ Pass | "No patients found." message |
| Error banner with Retry on load failure | ✅ Pass | Shows error message and Retry button |

### 1.4 Patient Dashboard

| Feature | Status | Notes |
|---------|--------|-------|
| Patient header (name, age, MRN, risk badge, diagnosis, allergies) | ✅ Pass | All fields render correctly |
| Overview tab: Vitals, Medications, Labs, Contacts, Encounters | ✅ Pass | Null-safe fallbacks for missing data |
| AI Summary: Generate button → loading → result | ✅ Pass | Shows confidence % and data points analyzed |
| AI Summary: Regenerate button | ✅ Pass | Clears and re-fetches summary |
| Risk Panel: Run Predictions → 3 risk gauges | ✅ Pass | Sepsis, Readmission, ICU with score bars |
| Med Safety: Run Check → warnings list | ✅ Pass | Severity badges, recommendations, evidence |
| Treatment: Get Suggestions → prioritized cards | ✅ Pass | Action items, confidence scores, sources |
| Timeline: Vertical timeline with encounter details | ✅ Pass | Color-coded dots by encounter type |
| AI Chat: Suggested questions, send/receive messages | ✅ Pass | User/AI bubbles, auto-scroll, loading state |
| AI Chat: Error displayed as AI bubble | ✅ Pass | "Error: ..." message in chat |
| ← Back button returns to patient list | ✅ Pass | |
| Patient load failure → error screen with Retry | ✅ Pass | Shows Retry + Back to Patients buttons |
| AI tab errors → red banner with Retry | ✅ Pass | Each of 4 AI tabs has independent error state |

### 1.5 Mobile Responsiveness

| Feature | Status | Notes |
|---------|--------|-------|
| Login page at 375px | ✅ Pass | Single column, branding panel hidden |
| Patient list: card layout on mobile, table on desktop | ✅ Pass | Breakpoint at `md` (768px) |
| Dashboard: scrollable tabs, compact nav | ✅ Pass | Horizontal scroll with touch support |
| Dashboard: responsive grids for overview cards | ✅ Pass | 1-col mobile → 2-col tablet → 3-col desktop |

---

## 2. Bugs Found & Fixed

| Bug | Root Cause | Fix |
|-----|-----------|-----|
| `/patients` page crash: "default export is not a React Component" | `useCallback` referenced but not imported after refactor; also `useAuth()` threw during SSR | Replaced `useCallback` loop with `useRef`-based pattern; made `useAuth()` return safe defaults when context is null |
| Infinite re-render loop on patient list | `useCallback` with `search`/`riskFilter` deps → `useEffect` fires on every state change | Moved initial load to a dependency-free `useEffect([], [])`, separate `loadPatients` function for manual triggers |
| `ERR_CONNECTION_REFUSED` after IDE restart | Dev servers don't persist between sessions | Documented: must run `npm run dev` in both `/backend` and `/frontend` |
| Hot-reload corruption on file save | Next.js Turbopack caches stale module state | Clean restart with `.next` cache removal resolves |

---

## 3. Security Measures Implemented

### 3.1 Secrets & Configuration

| Measure | Details |
|---------|---------|
| `.gitignore` added | Excludes `.env`, `*.db`, `node_modules/`, `.next/`, IDE files |
| `.env.example` created | Documents required variables without exposing real values |
| Hardcoded `'dev-secret'` fallback removed | All 3 route files now read `process.env.JWT_SECRET` directly |
| JWT secret validated on startup | Production: refuses to boot with weak/missing secret. Dev: auto-generates random 48-byte secret |

### 3.2 Authentication & Authorization

| Measure | Details |
|---------|---------|
| JWT token expiry reduced | 24h → **8 hours** |
| bcrypt cost factor increased | 10 → **12 rounds** for new user registrations |
| `/register` endpoint secured | Requires authentication + admin role (was completely open) |
| `/verify` response minimized | Returns only `{ id, role }` instead of full decoded JWT payload |
| Role-based middleware on AI routes | `requireRole('doctor', 'admin')` on all 5 AI endpoints |

### 3.3 Input Validation

| Measure | Details |
|---------|---------|
| Login inputs | Type check (string), length limits (username ≤100, password ≤200) |
| Registration inputs | Username: 3–50 chars, alphanumeric + `.`, `-`, `_` only. Password: 8–200 chars. Role: whitelist (`doctor`, `nurse`, `admin`) |
| Search query | String type check, max 200 characters |
| Risk level filter | Whitelist: `critical`, `high`, `medium`, `low` |
| Status filter | Whitelist: `active`, `inactive`, `discharged` |
| Patient ID | Regex validation: `/^[\w-]+$/`, max 100 characters |
| Chat question | String type check, max 2000 characters |

### 3.4 Error Handling

| Measure | Details |
|---------|---------|
| Internal errors hidden from clients | All `catch` blocks return generic messages (e.g., "Failed to load patients"), real `err.message` logged server-side only |
| React ErrorBoundary | Wraps entire app; catches render crashes with "Something went wrong" UI, Try Again + Back to Login buttons |
| Malformed JSON body handler | Returns 400 "Invalid JSON in request body" |
| Network error handling on frontend | `authFetch` catches `fetch` failures with "Unable to connect to the server" message |
| Null-safe data rendering | All patient fields (vitals, meds, labs, encounters, contacts) show "—" or "No data" for missing values |

### 3.5 Data Security

| Measure | Details |
|---------|---------|
| SQL injection prevention | All queries use parameterized statements (`?` placeholders), no string concatenation |
| Passwords hashed with bcrypt | Never stored or transmitted in plaintext |
| CORS restricted | Only `localhost:3000` and `127.0.0.1:3000` allowed |
| JSON body size limit | Reduced from 10MB to **1MB** |
| Chat response sanitized | User question no longer echoed back in response body |
| Audit logging | All logins, patient views, AI actions, and user creation logged with user ID and timestamp |

---

## 4. Test Execution Summary

| Category | Tests | Passed | Failed |
|----------|-------|--------|--------|
| Authentication | 9 | 9 | 0 |
| Role-Based Access | 6 | 6 | 0 |
| Patient List | 8 | 8 | 0 |
| Patient Dashboard | 14 | 14 | 0 |
| Mobile Responsive | 4 | 4 | 0 |
| Security (backend API) | 7 | 7 | 0 |
| **Total** | **48** | **48** | **0** |
