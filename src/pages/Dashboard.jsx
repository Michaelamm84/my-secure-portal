import React from "react";
import { listPayments } from "../mock";
import { Link } from "react-router-dom";

function StatusBadge({ s }) {
  const cls =
    s==="Pending" ? "pending" :
    s==="Verified" ? "verified" :
    s==="SentToSWIFT" ? "sent" : "failed";
  return <span className={`badge ${cls}`}>{s}</span>;
}

export default function Dashboard() {
  const tx = listPayments();

  return (
    <>
      <div className="h1">Customer Dashboard</div>
      <div className="card">
        <div className="h2">Recent Payments</div>
        {tx.length === 0 ? (
          <div>No payments yet. <Link to="/payment">Create your first payment</Link>.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Amount</th><th>Currency</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {tx.map(t=>(
                <tr key={t.id}>
                  <td>{new Date(t.date).toLocaleString()}</td>
                  <td>{t.amount.toFixed(2)}</td>
                  <td>{t.currency}</td>
                  <td><StatusBadge s={t.status}/></td>
                  <td><Link to={`/details/${t.id}`}>View details</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div style={{marginTop:12}}>
        <Link className="btn btn-primary" to="/payment">Create Payment</Link>
      </div>
    </>
  );
}
