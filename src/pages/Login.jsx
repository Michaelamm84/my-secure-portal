import React, { useState } from "react";
import { login } from "../mock";
import { useNavigate, Link } from "react-router-dom";

export default function Login() {
  const nav = useNavigate();
  const [form, setForm] = useState({ username:"", accountNumber:"", password:"" });
  const [errors, setErrors] = useState([]);

  const onChange = e => setForm(s=>({...s,[e.target.name]: e.target.value}));

  async function onSubmit(e) {
    e.preventDefault();
    setErrors([]);

    // TODO(DB): replace login(form) with a real POST /login call
    const res = login(form);
    if (res.ok) {
      nav("/dashboard");
    } else {
      setErrors(res.errors ?? ["Login failed"]);
    }
  }

  return (
    <div className="card">
      <div className="h1">Login</div>

      {errors.length>0 && <div className="banner error">{errors.join(", ")}</div>}

      <form onSubmit={onSubmit} className="row">
        <label className="label">Username (Email or ID)</label>
        <input
          className="input"
          name="username"
          value={form.username}
          onChange={onChange}
          placeholder="email@example.com or ID number"
          required
        />

        <label className="label">Account Number</label>
        <input
          className="input"
          name="accountNumber"
          value={form.accountNumber}
          onChange={onChange}
          placeholder="e.g. 12345678"
          required
        />

        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          name="password"
          value={form.password}
          onChange={onChange}
          required
        />

        <div style={{display:"flex", gap:8, marginTop:6}}>
          <button className="btn btn-primary" type="submit">Log In</button>
          <Link className="btn btn-ghost" to="/register">Register</Link>
        </div>
      </form>
    </div>
  );
}
