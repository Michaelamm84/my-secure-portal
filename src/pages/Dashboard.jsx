import React, { useEffect, useState } from "react";
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
  const [tx, setTx] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      const list = await listPayments();
      if (!mounted) return;
      setTx(Array.isArray(list) ? list : (list.payments || []));
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  return (
    <>
      <div className="h1">Customer Dashboard</div>
      <div className="card">
        <div className="h2">Recent Payments</div>

        {loading ? <div>Loading…</div> :
          tx.length === 0 ? (
            <div>No payments yet. <Link to="/payment">Create your first payment</Link>.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Date</th><th>Amount</th><th>Currency</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {tx.map(t=>(
                  <tr key={t._id || t.id}>
                    <td>{new Date(t.date || t.createdAt || t.date).toLocaleString()}</td>
                    <td>{Number(t.amount).toFixed(2)}</td>
                    <td>{t.currency || "ZAR"}</td>
                    <td><StatusBadge s={t.status || "Pending"}/></td>
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
