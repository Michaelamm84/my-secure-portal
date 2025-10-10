import React, { useState, useEffect } from "react";
import { currentUser, updateProfile } from "../mock";

export default function Account() {
  const [u, setU] = useState(null);
  const [form, setForm] = useState({ email:"", password:"" });
  const [errors, setErrors] = useState([]);
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(()=>{
    let mounted = true;
    (async () => {
      setLoading(true);
      const user = await currentUser();
      if (!mounted) return;
      setU(user);
      setForm({ email: user?.email ?? "", password:"" });
      setLoading(false);
    })();
    return ()=> { mounted = false; };
  },[]);

  const onChange = e => setForm(s=>({...s,[e.target.name]: e.target.value}));

  async function onSubmit(e) {
    e.preventDefault(); setErrors([]); setOk(""); setSaving(true);
    try {
      const res = await updateProfile({ email: form.email, password: form.password || undefined });
      if (res.ok) setOk("Profile updated.");
      else setErrors(res.errors ?? [res.message ?? "Update failed"]);
    } catch (err) {
      setErrors([err.message || "Update error"]);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="card">Loading…</div>;
  if (!u) return <div className="card">Not authenticated</div>;

  return (
    <>
      <div className="h1">Account</div>
      <div className="card">
        {errors.length>0 && <div className="banner error">{errors.join(", ")}</div>}
        {ok && <div className="banner ok">{ok}</div>}

        <form onSubmit={onSubmit} className="row">
          <label className="label">Full Name</label>
          <input className="input" value={u.fullName || u.username || ""} readOnly />

          <label className="label">ID Number</label>
          <input className="input" value={u.idNumber || ""} readOnly />

          <label className="label">Account Number</label>
          <input className="input" value={u.accountNumber || ""} readOnly />

          <label className="label">Email</label>
          <input className="input" name="email" value={form.email} onChange={onChange} required />

          <label className="label">Change Password (optional)</label>
          <input className="input" type="password" name="password" value={form.password} onChange={onChange} />

          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
        </form>
      </div>
    </>
  );
}
