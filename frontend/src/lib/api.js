// Talks to the real backend in /backend (FastAPI wrapping the tested lift_analyzer.py
// pipeline). No mock data here — if the backend isn't running, this throws and the
// UI shows that honestly rather than faking a result.

import { getToken } from './authApi.js';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

export async function analyzeLift(file, lift, { annotate = false, onProgress } = {}) {
  const form = new FormData();
  form.append('video', file);
  form.append('lift', lift);
  form.append('annotate', annotate ? 'true' : 'false');

  let res;
  try {
    res = await fetch(`${API_BASE}/analyze`, {
      method: 'POST',
      body: form,
      headers: { Authorization: `Bearer ${getToken()}` },
    });
  } catch (err) {
    throw new Error(
      `Could not reach the analysis backend at ${API_BASE}. Is it running? ` +
      `(cd backend && uvicorn main:app --reload --port 8000)`
    );
  }

  if (res.status === 401 || res.status === 403) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail || 'You need to be logged in and approved to analyze a lift.');
  }
  if (!res.ok) {
    throw new Error(`Backend returned an error (${res.status}). Check the backend terminal for details.`);
  }
  return res.json();
}

export function annotatedVideoUrl(videoId) {
  return `${API_BASE}/annotated/${videoId}`;
}

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}
