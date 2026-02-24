# Healthcare AI — Security Checklist

**Date:** February 15, 2026  
**Last Audited By:** Cascade  
**Application:** Healthcare AI Clinical Decision Support System

---

## ✅ Secrets & Configuration

- [x] `.gitignore` excludes `.env`, `*.db`, `node_modules/`, `.next/`, IDE files
- [x] `.env.example` provides template without real values
- [x] No hardcoded secrets in source code (all `'dev-secret'` fallbacks removed)
- [x] `JWT_SECRET` validated on server startup — production refuses to boot with weak/missing secret
- [x] Dev mode auto-generates a random 48-byte secret per session if `.env` secret is missing
- [x] No API keys or credentials committed to version control
- [x] Database file (`.db`) excluded from version control

---

## ✅ Authentication

- [x] Passwords hashed with **bcrypt** (cost factor 12) — never stored in plaintext
- [x] JWT tokens signed with strong secret from environment variable
- [x] Token expiry set to **8 hours** (reduced from 24h)
- [x] Token verified on app load via `/api/auth/verify`
- [x] 401 responses trigger automatic logout + redirect to login
- [x] Session state cleared from `localStorage` on logout
- [x] Login returns identical error for wrong username vs wrong password (no user enumeration)

---

## ✅ Authorization

- [x] All patient data routes require JWT authentication (`authenticate` middleware)
- [x] All AI routes require `doctor` or `admin` role (`requireRole` middleware)
- [x] `/register` endpoint requires authentication + `admin` role
- [x] Frontend hides AI tabs for unauthorized roles (`canAccessAI` flag)
- [x] Backend enforces role checks independently of frontend (defense in depth)
- [x] `ProtectedRoute` component redirects unauthenticated users on frontend

---

## ✅ Input Validation

- [x] **Login:** username (string, ≤100 chars), password (string, ≤200 chars)
- [x] **Registration:** username (3–50 chars, alphanumeric + `._-` only), password (8–200 chars), role (whitelist: `doctor`/`nurse`/`admin`)
- [x] **Patient search:** string type check, max 200 characters
- [x] **Risk level filter:** whitelist (`critical`, `high`, `medium`, `low`)
- [x] **Status filter:** whitelist (`active`, `inactive`, `discharged`)
- [x] **Patient ID (all routes):** regex `/^[\w-]+$/`, max 100 characters
- [x] **Chat question:** string type check, max 2000 characters
- [x] **JSON body size:** limited to 1MB (reduced from 10MB)
- [x] **Malformed JSON:** middleware returns 400 with generic error

---

## ✅ SQL Injection Prevention

- [x] All SQL queries use **parameterized statements** (`?` placeholders)
- [x] No string concatenation of user input into SQL
- [x] Dynamic query building (patient search) uses `params.push()` with `?` — safe
- [x] Query parameter values (risk_level, status) validated against whitelists before reaching SQL
- [x] Patient IDs validated with regex before database lookup

---

## ✅ Error Handling & Information Disclosure

- [x] Internal `err.message` **never sent to clients** — all catch blocks return generic messages
- [x] Real error details logged server-side with `console.error('[CATEGORY]', err.message)`
- [x] Global Express error handler hides details in production (`NODE_ENV !== 'development'`)
- [x] `/verify` returns only `{ id, role }` — no longer leaks full JWT payload (username, timestamps, etc.)
- [x] Chat endpoint no longer echoes user question in response body
- [x] React `ErrorBoundary` catches render crashes with user-friendly fallback UI
- [x] Frontend shows contextual error banners with Retry buttons (not raw error strings)

---

## ✅ Transport & Network Security

- [x] CORS restricted to `localhost:3000` and `127.0.0.1:3000` only
- [x] `credentials: true` enabled in CORS for cookie/auth header support
- [x] JSON body parser limited to 1MB to prevent payload-based DoS
- [ ] **HTTPS** — not configured (acceptable for local development; **required for production**)
- [ ] **Helmet.js** — not installed (recommended for production HTTP security headers)
- [ ] **Rate limiting** — not installed (recommended for `/login` and `/register` to prevent brute-force)

---

## ✅ Audit & Logging

- [x] All logins logged with user ID and timestamp
- [x] All patient record views logged with user ID and patient ID
- [x] All AI actions logged (summarize, risks, meds, treatment, chat)
- [x] User creation logged with admin ID and new user details
- [x] Chat questions truncated to 200 chars in audit log (no full PII dump)
- [x] Request logging middleware logs method, path, status code, and duration

---

## ✅ Frontend Security

- [x] Auth state managed via React Context — no global variables
- [x] `authFetch` wrapper auto-injects token + handles 401/403/network errors
- [x] `useAuth()` returns safe defaults during SSR (no crash on server render)
- [x] Null-safe rendering for all patient data fields (no crash on missing data)
- [x] No `dangerouslySetInnerHTML` used anywhere — React auto-escapes output

---

## ⚠️ Recommended for Production (Not Yet Implemented)

| Priority | Measure | Why |
|----------|---------|-----|
| **High** | Enable HTTPS (TLS) | Tokens sent over HTTP are interceptable on the network |
| **High** | Add rate limiting (`express-rate-limit`) on `/login`, `/register` | Prevents brute-force password attacks |
| **High** | Move JWT to HttpOnly cookies instead of localStorage | localStorage is vulnerable to XSS; HttpOnly cookies are not accessible via JavaScript |
| **Medium** | Add `helmet` middleware | Sets security headers (X-Frame-Options, X-Content-Type-Options, CSP, etc.) |
| **Medium** | Add CSRF protection | Required if switching to cookie-based auth |
| **Medium** | Add password complexity rules | Require uppercase, lowercase, number, special character |
| **Low** | Add account lockout after N failed login attempts | Mitigates brute-force even further |
| **Low** | Add token refresh mechanism | Avoid full re-login when token nears expiry |
| **Low** | Encrypt sensitive database fields at rest | Additional protection for PII (patient phone, email, address) |
