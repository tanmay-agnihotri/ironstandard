const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
const TOKEN_KEY = 'iron_auth_token';
const ROLE_KEY = 'iron_auth_role';
export const REVIEW_FEE_INR = 199; // must match backend's REVIEW_FEE_INR in main.py

export function getToken() { return localStorage.getItem(TOKEN_KEY); }
export function getRole() { return localStorage.getItem(ROLE_KEY); }
export function setAuth(token, role) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, role);
}
export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
}

async function request(path, options = {}) {
  const token = getToken();
  const headers = { ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  let data;
  try { data = await res.json(); } catch { data = null; }
  if (!res.ok) {
    const err = new Error(data?.detail || `Request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export function signup(name, password) {
  return request('/auth/signup', { method: 'POST', body: JSON.stringify({ name, password }) });
}
export function login(name, password) {
  return request('/auth/login', { method: 'POST', body: JSON.stringify({ name, password }) });
}
export function coachLogin(name, password) {
  return request('/auth/coach-login', { method: 'POST', body: JSON.stringify({ name, password }) });
}
export function me() {
  return request('/auth/me');
}
export function logActivity(type, date, summary) {
  return request('/activity/log', { method: 'POST', body: JSON.stringify({ type, date, summary }) }).catch((e) => {
    // Activity logging is best-effort — never break the user's save flow if this fails
    // (e.g. backend briefly down). Log to console, don't throw.
    console.warn('Could not log activity for coach dashboard:', e.message);
  });
}
export function coachListUsers() {
  return request('/coach/users');
}
export function coachUserActivities(userId) {
  return request(`/coach/users/${userId}/activities`);
}
export function coachApprove(userId) {
  return request(`/coach/approve/${userId}`, { method: 'POST' });
}
export function coachReject(userId) {
  return request(`/coach/reject/${userId}`, { method: 'POST' });
}

// ---- Human review requests (nominal-fee coach review, addresses CV's known blind spots) ----
export async function requestHumanReview(file, lift, cvScore, cvSummary) {
  const form = new FormData();
  form.append('video', file);
  form.append('lift', lift);
  form.append('cv_score', String(cvScore));
  form.append('cv_summary', cvSummary);
  const token = getToken();
  const res = await fetch(`${API_BASE}/review/request`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
  return data;
}
export function myReviews() {
  return request('/review/mine');
}
export function coachListReviews() {
  return request('/coach/reviews');
}
export function coachReviewVideoUrl(requestId) {
  const token = getToken();
  return `${API_BASE}/coach/reviews/${requestId}/video?token=${encodeURIComponent(token)}`;
}
export async function coachSubmitVerdict(requestId, verdict, notes) {
  const form = new FormData();
  form.append('verdict', verdict);
  form.append('notes', notes || '');
  const token = getToken();
  const res = await fetch(`${API_BASE}/coach/reviews/${requestId}/verdict`, {
    method: 'POST',
    body: form,
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail || `Request failed (${res.status})`);
  return data;
}
