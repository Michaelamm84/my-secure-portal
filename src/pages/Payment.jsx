import React, { useState } from "react";
import { createPayment } from "../mock";
import { useNavigate } from "react-router-dom";

const CURRENCIES = ["ZAR","USD","EUR","GBP"];

export default function Payment() {
  const nav = useNavigate();
  const [form, setForm] = useState({
    amount:"", currency:"ZAR", provider:"SWIFT",
    payeeName:"", payeeAccountNumber:"", swiftBic:"", reference:""
  });
  const [errors, setErrors] = useState([]);
  const [ok, setOk] = useState("");

  const onChange = e => setForm(s=>({...s,[e.target.name]: e.target.value}));

  function onSubmit(e) {
    e.preventDefault();
    setErrors([]); setOk("");
    // Basic client checks (server will validate later)
    if (Number(form.amount) <= 0) return setErrors(["Amount must be positive"]);
    if (!/^[A-Za-z0-9 ,.'-]{2,100}$/.test(form.payeeName)) return setErrors(["Invalid payee name"]);
    if (!/^[A-Za-z0-9]{6,34}$/.test(form.payeeAccountNumber)) return setErrors(["Invalid account number"]);
    if (!/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(form.swiftBic)) return setErrors(["Invalid SWIFT/BIC"]);
    if (form.reference && !/^[A-Za-z0-9 ,.'-]{0,35}$/.test(form.reference)) return setErrors(["Invalid reference"]);


    // TODO(DB): replace createPayment with real POST /payments
    const res = createPayment({ ...form, amount:Number(form.amount) });
    if (res.ok) { setOk(`Created. ID: ${res.data.id}`); setTimeout(()=> nav(`/details/${res.data.id}`), 500); }
    else setErrors(res.errors ?? ["Failed"]);
  }

  return (
    <div className="card">
      <div className="h1">Create International Payment</div>
      {errors.length>0 && <div className="banner error">{errors.join(", ")}</div>}
      {ok && <div className="banner ok">{ok}</div>}

      <form onSubmit={onSubmit} className="row">
        <div className="grid">
          <div className="col-6">
            <label className="label">Amount</label>
            <input className="input" type="number" step="0.01" name="amount" value={form.amount} onChange={onChange} required />
          </div>
          <div className="col-6">
            <label className="label">Currency</label>
            <select className="select" name="currency" value={form.currency} onChange={onChange}>
              {CURRENCIES.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <label className="label">Provider</label>
        <input className="input" name="provider" value={form.provider} onChange={onChange} readOnly />

        <label className="label">Payee Name</label>
        <input className="input" name="payeeName" value={form.payeeName} onChange={onChange} required />

        <div className="grid">
          <div className="col-6">
            <label className="label">Payee Account Number</label>
            <input className="input" name="payeeAccountNumber" value={form.payeeAccountNumber} onChange={onChange} required />
          </div>
          <div className="col-6">
            <label className="label">SWIFT/BIC</label>
            <input className="input" name="swiftBic" value={form.swiftBic} onChange={onChange} required />
          </div>
        </div>

        <label className="label">Reference (optional)</label>
        <input className="input" name="reference" value={form.reference} onChange={onChange} placeholder="Up to 35 chars" />

        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-primary" type="submit">Confirm & Pay Now</button>
          <button className="btn btn-ghost" type="button" onClick={()=>window.history.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
