// src/mock.js
// Network-backed API helpers with robust non-JSON response handling (debug-friendly)

const API_BASE = 'http://localhost:5000'; // absolute backend URL
const K_TOKEN = "mp_token";
const K_USERID = "mp_currentUserId";

function readLocal(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function writeLocal(key, val) { try { localStorage.setItem(key, val); } catch {} }
function removeLocal(key) { try { localStorage.removeItem(key); } catch {} }

// Helper to fetch and parse JSON but safely handle HTML/text responses
async function fetchAndParse(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();

  // Try parse JSON first
  try {
    const json = JSON.parse(text);
    return { ok: res.ok, status: res.status, body: json, raw: text };
  } catch (err) {
    // Not JSON — return raw text for debug (likely HTML or error page)
    return { ok: res.ok, status: res.status, body: null, raw: text };
  }
}

// --- Auth helpers ---
export function isAuthed() {
  return !!readLocal(K_TOKEN);
}

export function logout() {
  removeLocal(K_TOKEN);
  removeLocal(K_USERID);
}

// --- Register (already robust; kept for completeness) ---
export async function register({ fullName, idNumber, accountNumber, email, password }) {
  try {
    const url = `${API_BASE}/register`;
    const result = await fetchAndParse(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username: email, password, fullName, idNumber, accountNumber, email })
    });

    if (!result.body) {
      // backend returned non-JSON (HTML, etc.)
      console.error("Register: server returned non-JSON response:", result.raw);
      return { ok:false, errors: ["Server returned non-JSON response (see console)"], debug: result.raw, status: result.status };
    }

    if (!result.ok) {
      return { ok:false, errors: result.body.errors || [result.body.message || 'Register failed'], status: result.status };
    }

    return { ok:true, data: result.body };
  } catch (err) {
    return { ok:false, errors: [err.message || 'Network error'] };
  }
}

// --- Login (robust) ---
export async function login({ username, accountNumber, password }) {
  try {
    const url = `${API_BASE}/login`;
    const result = await fetchAndParse(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ username, accountNumber, password })
    });

    if (!result.body) {
      console.error("Login: server returned non-JSON response:", result.raw);
      return { ok:false, errors: ["Server returned non-JSON response (see console)"], debug: result.raw, status: result.status };
    }

    if (!result.ok) {
      return { ok:false, errors: result.body.errors || [result.body.message || 'Login failed'], status: result.status };
    }

    // store token + userId if returned
    if (result.body.token) writeLocal(K_TOKEN, result.body.token);
    if (result.body.userId) writeLocal(K_USERID, result.body.userId);

    return { ok:true, data: result.body };
  } catch (err) {
    return { ok:false, errors: [err.message || 'Network error'] };
  }
}

// --- currentUser (GET /me) ---
export async function currentUser() {
  try {
    const token = readLocal(K_TOKEN);
    if (!token) return null;

    const url = `${API_BASE}/me`;
    const result = await fetchAndParse(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', Authorization: `Bearer ${token}` }
    });

    if (!result.body) {
      console.error("/me: server returned non-JSON response:", result.raw);
      return null;
    }
    if (!result.ok) {
      console.warn("/me returned non-OK:", result.status, result.body);
      return null;
    }
    return result.body.user || result.body;
  } catch (err) {
    console.error("/me error:", err);
    return null;
  }
}

// --- updateProfile (PATCH /me) ---
export async function updateProfile({ email, password }) {
  try {
    const token = readLocal(K_TOKEN);
    if (!token) return { ok:false, errors:["Not authenticated"] };

    const url = `${API_BASE}/me`;
    const result = await fetchAndParse(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ email, password })
    });

    if (!result.body) {
      console.error("PATCH /me returned non-JSON:", result.raw);
      return { ok:false, errors: ["Server returned non-JSON response (see console)"], debug: result.raw, status: result.status };
    }
    if (!result.ok) {
      return { ok:false, errors: result.body.errors || [result.body.message || 'Update failed'], status: result.status };
    }
    return { ok:true, data: result.body };
  } catch (err) {
    return { ok:false, errors: [err.message || 'Network error'] };
  }
}

// --- Payments ---
export async function createPayment(payload) {
  try {
    const token = readLocal(K_TOKEN);
    const url = `${API_BASE}/payments`;
    const result = await fetchAndParse(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify(payload)
    });

    if (!result.body) {
      console.error("/payments POST returned non-JSON:", result.raw);
      return { ok:false, errors: ["Server returned non-JSON response (see console)"], debug: result.raw, status: result.status };
    }
    if (!result.ok) return { ok:false, errors: result.body.errors || [result.body.message || 'Create payment failed'], status: result.status };
    return { ok:true, data: result.body };
  } catch (err) {
    return { ok:false, errors: [err.message || 'Network error'] };
  }
}

export async function listPayments() {
  try {
    const token = readLocal(K_TOKEN);
    const url = `${API_BASE}/payments`;
    const result = await fetchAndParse(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });

    if (!result.body) {
      console.error("/payments GET returned non-JSON:", result.raw);
      return [];
    }
    if (!result.ok) {
      console.warn("/payments GET error:", result.status, result.body);
      return [];
    }
    return result.body.payments || result.body || [];
  } catch (err) {
    console.error("listPayments error:", err);
    return [];
  }
}

export async function getPaymentById(pid) {
  try {
    const token = readLocal(K_TOKEN);
    const url = `${API_BASE}/payments/${encodeURIComponent(pid)}`;
    const result = await fetchAndParse(url, {
      method: 'GET',
      headers: { 'Accept': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }
    });

    if (!result.body) {
      console.error(`/payments/${pid} returned non-JSON:`, result.raw);
      return null;
    }
    if (!result.ok) return null;
    return result.body.payment || result.body;
  } catch (err) {
    console.error("getPaymentById error:", err);
    return null;
  }
}
