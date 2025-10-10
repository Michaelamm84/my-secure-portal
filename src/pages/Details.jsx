import React from "react";
import { useParams, Link } from "react-router-dom";
import { getPaymentById } from "../mock";

export default function Details() {
  const { id } = useParams();
  const t = getPaymentById(id);

  if (!t) return <div className="card"><div className="h1">Payment Details</div>Not found.</div>;

  return (
    <>
      <div className="h1">Payment Details</div>
      <div className="card">
        <table className="table">
          <tbody>
            <tr><th>Transaction ID</th><td>{t.id}</td></tr>
            <tr><th>Date</th><td>{new Date(t.date).toLocaleString()}</td></tr>
            <tr><th>Status</th><td><span className={`badge ${t.status.toLowerCase()}`}>{t.status}</span></td></tr>
            <tr><th>Amount</th><td>{t.amount.toFixed(2)} {t.currency}</td></tr>
            <tr><th>Provider</th><td>{t.provider}</td></tr>
            <tr><th>Payee Name</th><td>{t.payeeName}</td></tr>
            <tr><th>Payee Account #</th><td>{t.payeeAccountNumber}</td></tr>
            <tr><th>SWIFT/BIC</th><td>{t.swiftBic}</td></tr>
            <tr><th>Reference</th><td>{t.reference || "-"}</td></tr>
          </tbody>
        </table>
      </div>
      <div style={{marginTop:10}}>
        <Link className="btn btn-ghost" to="/dashboard">Back to Dashboard</Link>
      </div>
    </>
  );
}
