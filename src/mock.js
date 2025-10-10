// src/mock.js
//This is mock code to Fill in WHile the DB is being made

const K_USERS = "mp_users";
const K_PAYS  = "mp_payments";
const K_AUTH  = "mp_currentUserId";

function read(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function write(key, val) { localStorage.setItem(key, JSON.stringify(val)); }

export function isAuthed() {
  return !!localStorage.getItem(K_AUTH);
}
export function currentUser() {
  const id = localStorage.getItem(K_AUTH);
  if (!id) return null;
  const users = read(K_USERS, []);
  return users.find(u => u.id === id) || null;
}
export function logout() { localStorage.removeItem(K_AUTH); }

export function register({ fullName, idNumber, accountNumber, email, password }) {
  const users = read(K_USERS, []);
  if (users.find(u => u.email === email)) return { ok:false, errors:["Email already registered"] };
  const id = crypto.randomUUID();
  users.push({ id, fullName, idNumber, accountNumber, email, password }); // NOTE: plain text for demo only
  write(K_USERS, users);
  return { ok:true };
}

export function login({ username, accountNumber, password }) {
  const users = read(K_USERS, []);
  const u = users.find(u =>
    (u.email === username || u.idNumber === username) &&
    u.accountNumber === accountNumber
  );
  if (!u) return { ok:false, errors:["User not found"] };
  if (u.password !== password) return { ok:false, errors:["Invalid password"] };
  localStorage.setItem(K_AUTH, u.id);
  return { ok:true };
}

export function updateProfile({ email, password }) {
  const id = localStorage.getItem(K_AUTH);
  if (!id) return { ok:false, errors:["Not authenticated"] };
  const users = read(K_USERS, []);
  const idx = users.findIndex(u => u.id === id);
  if (idx < 0) return { ok:false, errors:["User missing"] };
  if (email) users[idx].email = email;
  if (password) users[idx].password = password;
  write(K_USERS, users);
  return { ok:true };
}

export function createPayment({ amount, currency, provider, payeeName, payeeAccountNumber, swiftBic, reference }) {
  const id = localStorage.getItem(K_AUTH);
  if (!id) return { ok:false, errors:["Not authenticated"] };
  const pays = read(K_PAYS, []);
  const item = {
    id: crypto.randomUUID(),
    userId: id,
    date: new Date().toISOString(),
    amount: Number(amount),
    currency, provider, payeeName, payeeAccountNumber, swiftBic, reference,
    status: "Pending" // later: Verified / SentToSWIFT / Failed by server
  };
  pays.unshift(item);
  write(K_PAYS, pays);
  return { ok:true, data:item };
}

export function listPayments() {
  const id = localStorage.getItem(K_AUTH);
  if (!id) return [];
  const pays = read(K_PAYS, []);
  return pays.filter(p => p.userId === id);
}

export function getPaymentById(pid) {
  const pays = read(K_PAYS, []);
  return pays.find(p => p.id === pid) || null;
}
