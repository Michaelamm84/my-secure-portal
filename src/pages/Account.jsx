import React, { useState, useEffect } from "react";
import { currentUser, updateProfile } from "../mock";

export default function Account() {
  const [u, setU] = useState(null);
  const [form, setForm] = useState({ email:"", password:"" });
  const [errors, setErrors] = useState([]);
  const [ok, setOk] = useState("");

  useEffect(()=>{
    const c = currentUser();
    setU(c);
    setForm({ email: c?.email ?? "", password:"" });
  },[]);

  const onChange = e => setForm(s=>({...s,[e.target.name]: e.target.value}));

  function onSubmit(e) {
    e.preventDefault(); setErrors([]); setOk("");
    // TODO(DB): replace updateProfile with real secured API
    const res = updateProfile({ email: form.email, password: form.password || undefined });
    if (res.ok) setOk("Profile updated.");
    else setErrors(res.errors ?? ["Update failed"]);
  }

  if (!u) return <div className="card">Loading…</div>;

  return (
    <>
      <div className="h1">Account</div>
      <div className="card">
        {errors.length>0 && <div className="banner error">{errors.join(", ")}</div>}
        {ok && <div className="banner ok">{ok}</div>}

        <form onSubmit={onSubmit} className="row">
          <label className="label">Full Name</label>
          <input className="input" value={u.fullName} readOnly />

          <label className="label">ID Number</label>
          <input className="input" value={u.idNumber} readOnly />

          <label className="label">Account Number</label>
          <input className="input" value={u.accountNumber} readOnly />

          <label className="label">Email</label>
          <input className="input" name="email" value={form.email} onChange={onChange} required />

          <label className="label">Change Password (optional)</label>
          <input className="input" type="password" name="password" value={form.password} onChange={onChange} />

          <button className="btn btn-primary" type="submit">Save Changes</button>
        </form>
      </div>
    </>
  );
}
