// src/pages/Details.jsx
import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getPaymentById } from "../mock";

function Safe(val) {
  // simple renderer for possibly undefined fields
  if (val === null || val === undefined) return <span className="muted">—</span>;
  if (typeof val === "number") return val;
  return String(val);
}

function StatusBadge({ s }) {
  const st = (s || "").toLowerCase();
  const cls =
    st === "pending" ? "pending" :
    st === "verified" ? "verified" :
    st === "senttoswift" || st === "sent" ? "sent" :
    st === "failed" ? "failed" :
    "pending";
  return <span className={`badge ${cls}`}>{s || "Pending"}</span>;
}

export default function Details() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [payment, setPayment] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      setError("");
      try {
        // getPaymentById should handle token use; it returns payment or null
        const p = await getPaymentById(id);
        if (!mounted) return;
        if (!p) {
          setError("Payment not found.");
          setPayment(null);
        } else {
          // normalize id field
          const normalized = { ...(p || {}), id: p._id || p.id || id };
          setPayment(normalized);
        }
      } catch (err) {
        console.error("Details: error fetching payment:", err);
        setError(err?.message || "Failed to load payment.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [id]);

  if (loading) return <div className="card">Loading payment…</div>;
  if (error) return (
    <div className="card">
      <div className="banner error">{error}</div>
      <div style={{marginTop:12}}><Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link></div>
    </div>
  );
  if (!payment) return (
    <div className="card">
      <div className="banner error">Payment not found.</div>
      <div style={{marginTop:12}}><Link to="/dashboard" className="btn btn-ghost">Back to dashboard</Link></div>
    </div>
  );

  // safe getters with defaults
  const date = payment.date || payment.createdAt || payment.timestamp || null;
  const amount = payment.amount ?? payment.value ?? null;
  const currency = (payment.currency || "").toUpperCase() || "ZAR";
  const provider = payment.provider || "SWIFT";
  const payeeName = payment.payeeName || payment.payee || "";
  const payeeAccountNumber = payment.payeeAccountNumber || payment.payeeAccount || payment.account || "";
  const swiftBic = payment.swiftBic || payment.swift || "";
  const reference = payment.reference || "";
  const status = payment.status || "Pending";

  return (
    <>
      <div className="h1">Payment Details</div>

      <div className="card">
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
          <div>
            <div style={{fontSize:14, color:"#555"}}>Payment ID</div>
            <div style={{fontWeight:700}}>{payment.id}</div>
          </div>
          <div>
            <StatusBadge s={status} />
          </div>
        </div>

        <hr style={{margin:"12px 0"}} />

        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
          <div>
            <div className="label">Amount</div>
            <div className="value">{amount !== null ? Number(amount).toFixed(2) : <span className="muted">—</span>}</div>
          </div>

          <div>
            <div className="label">Currency</div>
            <div className="value">{currency}</div>
          </div>

          <div>
            <div className="label">Provider</div>
            <div className="value">{Safe(provider)}</div>
          </div>

          <div>
            <div className="label">Date</div>
            <div className="value">{date ? new Date(date).toLocaleString() : <span className="muted">—</span>}</div>
          </div>

          <div style={{gridColumn:"1 / -1"}}>
            <div className="label">Payee</div>
            <div style={{display:"flex", gap:10, alignItems:"baseline"}}>
              <div style={{minWidth:220}}>
                <div className="muted">Name</div>
                <div>{Safe(payeeName)}</div>
              </div>
              <div>
                <div className="muted">Account</div>
                <div>{Safe(payeeAccountNumber)}</div>
              </div>
              <div>
                <div className="muted">SWIFT/BIC</div>
                <div>{Safe(swiftBic)}</div>
              </div>
            </div>
          </div>

          <div style={{gridColumn:"1 / -1"}}>
            <div className="label">Reference</div>
            <div>{Safe(reference)}</div>
          </div>
        </div>

        <div style={{marginTop:12}}>
          <Link className="btn btn-ghost" to="/dashboard">Back to dashboard</Link>
        </div>
      </div>
    </>
  );
}
