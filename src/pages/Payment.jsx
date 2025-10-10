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
  const [loading, setLoading] = useState(false);

  const onChange = e => setForm(s=>({...s,[e.target.name]: e.target.value}));

  async function onSubmit(e) {
    e.preventDefault();
    setErrors([]); setOk(""); setLoading(true);

    if (Number(form.amount) <= 0) { setErrors(["Amount must be positive"]); setLoading(false); return; }
    if (!/^[A-Za-z0-9 ,.'-]{2,100}$/.test(form.payeeName)) { setErrors(["Invalid payee name"]); setLoading(false); return; }
    if (!/^[A-Za-z0-9]{6,34}$/.test(form.payeeAccountNumber)) { setErrors(["Invalid account number"]); setLoading(false); return; }
    if (!/^[A-Za-z]{6}[A-Za-z0-9]{2}([A-Za-z0-9]{3})?$/.test(form.swiftBic)) { setErrors(["Invalid SWIFT/BIC"]); setLoading(false); return; }
    if (form.reference && !/^[A-Za-z0-9 ,.'-]{0,35}$/.test(form.reference)) { setErrors(["Invalid reference"]); setLoading(false); return; }

    try {
      const res = await createPayment({ ...form, amount: Number(form.amount) });
      if (res.ok) {
        const payment = res.data.payment || res.data;
        const id = payment._id || payment.id;
        setOk(`Created. ID: ${id}`);
        setTimeout(()=> nav(`/details/${id}`), 500);
      } else {
        setErrors(res.errors ?? [res.message ?? "Failed"]);
      }
    } catch (err) {
      setErrors([err.message || "Create payment error"]);
    } finally {
      setLoading(false);
    }
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
            <small className="hint">
              Must be 6–34 characters long, using only letters and numbers (no spaces or symbols).
            </small>
            <input className="input" name="payeeAccountNumber" value={form.payeeAccountNumber} onChange={onChange} required />
          </div>
          <div className="col-6">
            <label className="label">SWIFT/BIC</label>
            <small className="hint">
              Format: 6 letters (bank code), followed by 2 alphanumeric characters (country/location), optionally 3 more (branch).
            </small>
            <input className="input" name="swiftBic" value={form.swiftBic} onChange={onChange} required />
          </div>
        </div>

        <label className="label">Reference (optional)</label>
        <input className="input" name="reference" value={form.reference} onChange={onChange} placeholder="Up to 35 chars" />

        <div style={{display:"flex", gap:8}}>
          <button className="btn btn-primary" type="submit" disabled={loading}>{loading ? "Processing..." : "Confirm & Pay Now"}</button>
          <button className="btn btn-ghost" type="button" onClick={()=>window.history.back()}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
