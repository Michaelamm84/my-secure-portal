// src/App.js
import { Routes, Route, NavLink, Navigate, useNavigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Payment from "./pages/Payment";
import Details from "./pages/Details";
import Account from "./pages/Account";
import { isAuthed, logout } from "./mock";

// Tiny top nav
function TopNav() {
  const nav = useNavigate();
  const authed = isAuthed();
  return (
    <div className="container">
      <div className="nav">
        <NavLink to="/dashboard" className={({isActive}) => isActive ? "active" : ""}>Dashboard</NavLink>
        <NavLink to="/payment" className={({isActive}) => isActive ? "active" : ""}>Make Payment</NavLink>
        <NavLink to="/account" className={({isActive}) => isActive ? "active" : ""}>Account</NavLink>
        <div style={{ marginLeft:"auto", display:"flex", gap:"8px" }}>
          {!authed ? (
            <>
              <NavLink to="/login" className={({isActive}) => isActive ? "active" : ""}>Login</NavLink>
              <NavLink to="/register" className={({isActive}) => isActive ? "active" : ""}>Register</NavLink>
            </>
          ) : (
            <button className="btn btn-ghost" onClick={()=>{ logout(); nav("/login"); }}>Logout</button>
          )}
        </div>
      </div>
    </div>
  );
}

// Simple route guard
function Protected({ children }) {
  return isAuthed() ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <>
      <TopNav />
      <div className="container">
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login/>} />
          <Route path="/register" element={<Register/>} />
          <Route path="/dashboard" element={<Protected><Dashboard/></Protected>} />
          <Route path="/payment" element={<Protected><Payment/></Protected>} />
          <Route path="/details/:id" element={<Protected><Details/></Protected>} />
          <Route path="/account" element={<Protected><Account/></Protected>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}
