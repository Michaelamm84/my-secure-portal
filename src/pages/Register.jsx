import React, { useState } from "react";
import { register } from "../mock";
import { useNavigate, Link } from "react-router-dom";

export default function Register() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    fullName: "",
    idNumber: "",
    accountNumber: "",
    email: "",
    password: "",
    confirmPassword: "",
    consent: false,
  });
  const [errors, setErrors] = useState([]);
  const [ok, setOk] = useState("");

  const onChange = (e) => {
    const { name, type, checked, value } = e.target;
    setForm((s) => ({ ...s, [name]: type === "checkbox" ? checked : value }));
  };

  function onSubmit(e) {
    e.preventDefault();
    setErrors([]);
    setOk("");

    // Basic client checks (server will validate later)
    if (form.password !== form.confirmPassword) {
      setErrors(["Passwords do not match"]);
      return;
    }
    if (!form.consent) {
      setErrors(["Please accept consent"]);
      return;
    }

    // TODO(DB): replace register(form) with real POST /register
    const res = register(form);
    if (res.ok) {
      setOk("Registered. Redirecting to login…");
      setTimeout(() => nav("/login"), 700);
    } else {
      setErrors(res.errors ?? ["Registration failed"]);
    }
  }

  return (
    <div className="card">
      <div className="h1">Register</div>

      {errors.length > 0 && <div className="banner error">{errors.join(", ")}</div>}
      {ok && <div className="banner ok">{ok}</div>}

      <form onSubmit={onSubmit} className="row">
        <label className="label">Full Name</label>
        <input className="input" name="fullName" value={form.fullName} onChange={onChange} required />

        <label className="label">ID Number</label>
        <input className="input" name="idNumber" value={form.idNumber} onChange={onChange} required />

        <label className="label">Account Number</label>
        <input className="input" name="accountNumber" value={form.accountNumber} onChange={onChange} required />

        <label className="label">Email</label>
        <input className="input" type="email" name="email" value={form.email} onChange={onChange} required />

        <div className="grid">
          <div className="col-6">
            <label className="label">Password</label>
            <input className="input" type="password" name="password" value={form.password} onChange={onChange} required />
          </div>
          <div className="col-6">
            <label className="label">Confirm Password</label>
            <input className="input" type="password" name="confirmPassword" value={form.confirmPassword} onChange={onChange} required />
          </div>
        </div>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" name="consent" checked={form.consent} onChange={onChange} />
          I consent to processing for international payments.
        </label>

        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-primary" type="submit">Create Account</button>
          <Link className="btn btn-ghost" to="/login">Back to Login</Link>
        </div>
      </form>
    </div>
  );
}
