const API_BASE = typeof window !== 'undefined' ? `${window.location.origin}/api` : '/api';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function setAuth(token, user) {
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json', ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const api = {
  // Auth
  login: (username, password) =>
    request('/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  verify: () => request('/auth/verify'),

  // Patients
  getPatients: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/patients${qs ? '?' + qs : ''}`);
  },
  getPatient: (id) => request(`/patients/${id}`),
  getEncounters: (id) => request(`/patients/${id}/encounters`),
  getLabs: (id) => request(`/patients/${id}/labs`),
  getMedications: (id) => request(`/patients/${id}/medications`),
  getVitals: (id) => request(`/patients/${id}/vitals`),

  // AI
  summarize: (patientId) =>
    request(`/ai/summarize/${patientId}`, { method: 'POST' }),
  getRisks: (patientId) => request(`/ai/risks/${patientId}`),
  getMedSafety: (patientId) => request(`/ai/medications/${patientId}`),
  getTreatment: (patientId) => request(`/ai/treatment/${patientId}`),
  chat: (patientId, question) =>
    request('/ai/chat', { method: 'POST', body: JSON.stringify({ patientId, question }) }),
};
