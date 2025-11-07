/* eslint-disable */
///////// App.js - Secure Banking Portal Frontend (Customer Registration Enabled)
import React, { useState, useEffect } from "react";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

function App() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    accountNumber: "",
    password: "",
    amount: "",
    currency: "ZAR",
    swiftCode: "",
    description: "",
  });

  const [errors, setErrors] = useState({});

  // RegEx Whitelist Patterns (Optimized to prevent ReDoS attacks)
const patterns = {
  username: /^[a-zA-Z0-9_]{3,20}$/,
  email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  accountNumber: /^[A-Z0-9]{4,20}$/,
  password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$/,
  amount: /^\d{1,10}(?:\.\d{1,2})?$/,
  swiftCode: /^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/,
};

  // Simple sanitization (removes HTML tags and special chars)
  const sanitizeInput = (name, value) => {
    // Remove HTML tags
    let sanitized = value.replace(/<[^>]*>/g, '');
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Validate against pattern if exists
    if (patterns[name]) {
      if (!patterns[name].test(sanitized)) {
        setErrors(prev => ({
          ...prev,
          [name]: `Invalid ${name} format`
        }));
        return sanitized;
      }
      // Clear error if valid
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
    
    return sanitized;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(name, value);
    setFormData({ ...formData, [name]: sanitized });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: formData.email || formData.username,
          username: formData.username,
          accountNumber: formData.accountNumber,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setToken(data.token);
        setUser(data);
        setIsLoggedIn(true);
        localStorage.setItem("token", data.token);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("userRole", data.role);
        
        // Fetch payments based on role
        if (data.role === 'employee') {
          setIsEmployee(true);
          fetchAllPayments(data.token);
        } else {
          fetchPayments(data.token);
        }
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (isEmployee) {
      alert("Employees cannot self-register. Contact system administrator.");
      return;
    }

    // Validate all fields
    const hasErrors = Object.keys(errors).length > 0;
    if (hasErrors) {
      alert("Please fix form errors before submitting");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: formData.username,
          email: formData.email,
          password: formData.password,
          accountNumber: formData.accountNumber,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        alert("Registration successful! Please login.");
        setFormData({
          ...formData,
          password: "",
        });
      } else {
        alert(data.message || "Registration failed");
      }
    } catch (error) {
      console.error("Registration error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/payments`, {
        headers: {
          Authorization: `Bearer ${authToken || token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setPayments(data.payments);
      }
    } catch (error) {
      console.error("Fetch payments error:", error);
    }
  };

  const fetchAllPayments = async (authToken) => {
    try {
      const response = await fetch(`${API_URL}/admin/all-payments`, {
        headers: {
          Authorization: `Bearer ${authToken || token}`,
        },
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        setPayments(data.payments);
      }
    } catch (error) {
      console.error("Fetch all payments error:", error);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();

    // Validate amount and SWIFT code
    if (!patterns.amount.test(formData.amount)) {
      alert("Invalid amount format");
      return;
    }

    if (!patterns.swiftCode.test(formData.swiftCode)) {
      alert("Invalid SWIFT code format (e.g., ABCDEF2A)");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          description: formData.description || `${formData.currency} payment to ${formData.swiftCode}`,
          swiftCode: formData.swiftCode,
          currency: formData.currency,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        alert("Payment submitted successfully! Awaiting employee verification.");
        fetchPayments();
        setFormData({
          ...formData,
          amount: "",
          swiftCode: "",
          description: "",
        });
      } else {
        alert(data.message || "Payment failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPayment = async (paymentId, status) => {
    if (!window.confirm(`Are you sure you want to ${status} this payment?`)) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/payments/${paymentId}/verify`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        alert(data.message || `Payment ${status} successfully`);
        fetchAllPayments();
      } else {
        alert(data.message || `Failed to ${status} payment`);
      }
    } catch (error) {
      console.error("Verify payment error:", error);
      alert("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setPayments([]);
    setIsEmployee(false);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("userRole");
  };

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem("token");
    const savedRole = localStorage.getItem("userRole");
    
    if (savedToken) {
      setToken(savedToken);
      fetch(`${API_URL}/me`, {
        headers: {
          Authorization: `Bearer ${savedToken}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.ok) {
            setUser(data.user);
            setIsLoggedIn(true);
            
            if (savedRole === 'employee') {
              setIsEmployee(true);
              fetchAllPayments(savedToken);
            } else {
              fetchPayments(savedToken);
            }
          } else {
            localStorage.removeItem("token");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("userRole");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("userRole");
        });
    }
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      pending: "🟡 Pending",
      verified: "🟢 Verified",
      rejected: "🔴 Rejected",
      submitted: "✅ Submitted to SWIFT"
    };
    return badges[status] || status;
  };

  return (
    <div className="app-container">
      <header>
        <h1>🏦 Secure International Banking Portal</h1>
        {!isLoggedIn && (
          <div className="portal-toggle">
            <button
              className={!isEmployee ? "active" : ""}
              onClick={() => {
                setIsEmployee(false);
                setFormData({
                  username: "",
                  email: "",
                  accountNumber: "",
                  password: "",
                  amount: "",
                  currency: "ZAR",
                  swiftCode: "",
                  description: "",
                });
                setErrors({});
              }}
            >
              Customer Portal
            </button>
            <button
              className={isEmployee ? "active" : ""}
              onClick={() => {
                setIsEmployee(true);
                setFormData({
                  username: "",
                  email: "",
                  accountNumber: "",
                  password: "",
                  amount: "",
                  currency: "ZAR",
                  swiftCode: "",
                  description: "",
                });
                setErrors({});
              }}
            >
              Employee Portal
            </button>
          </div>
        )}
      </header>

      {!isLoggedIn ? (
        <div className="login-container">
          <h2>{isEmployee ? "Employee" : "Customer"} Login</h2>
          
          {!isEmployee && (
            <div className="info-box">
              <p>👋 Welcome! Please login or register below.</p>
            </div>
          )}

          {isEmployee && (
            <div className="info-box warning">
              <p>⚠️ <strong>Employee Access Only</strong></p>
              <p>Pre-registered employees only. No self-registration available.</p>
              <p className="small-text">Test credentials: employee1 / SecurePass123! / EMP001</p>
            </div>
          )}

          <form onSubmit={handleLogin}>
            {!isEmployee && (
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="email"
                  placeholder="customer@email.com"
                  value={formData.email}
                  onChange={handleChange}
                  required={!isEmployee}
                  disabled={loading}
                />
                {errors.email && <span className="error">{errors.email}</span>}
              </div>
            )}

            {isEmployee && (
              <div className="form-group">
                <label>Username</label>
                <input
                  type="text"
                  name="username"
                  placeholder="employee_username"
                  value={formData.username}
                  onChange={handleChange}
                  required={isEmployee}
                  disabled={loading}
                />
                {errors.username && <span className="error">{errors.username}</span>}
              </div>
            )}

            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                name="accountNumber"
                placeholder="ACC12345 or EMP001"
                value={formData.accountNumber}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.accountNumber && (
                <span className="error">{errors.accountNumber}</span>
              )}
            </div>

            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                placeholder="Min 8 characters"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          {/* CUSTOMER REGISTRATION - Only show for customers */}
          {!isEmployee && (
            <>
              <div className="divider">OR</div>
              <form onSubmit={handleRegister}>
                <h3>Register New Customer Account</h3>
                
                <div className="form-group">
                  <label>Username (3-20 alphanumeric)</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  {errors.username && <span className="error">{errors.username}</span>}
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  {errors.email && <span className="error">{errors.email}</span>}
                </div>

                <div className="form-group">
                  <label>Account Number (4-20 alphanumeric)</label>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="ACC12345"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  {errors.accountNumber && (
                    <span className="error">{errors.accountNumber}</span>
                  )}
                </div>

                <div className="form-group">
                  <label>Password</label>
                  <input
                    type="password"
                    name="password"
                    placeholder="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    disabled={loading}
                  />
                  {errors.password && <span className="error">{errors.password}</span>}
                  <small className="password-hint">
                    Must contain: uppercase, lowercase, number, and special character (@$!%*?&)
                  </small>
                </div>

                <button type="submit" className="btn-secondary" disabled={loading}>
                  {loading ? "Registering..." : "Register"}
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="dashboard-container">
          <div className="dashboard-header">
            <div>
              <h2>Welcome, {user?.username || user?.email}</h2>
              <p className="role-badge">
                {isEmployee ? "👔 Employee" : "👤 Customer"} • Account: {user?.accountNumber}
              </p>
            </div>
            <button onClick={handleLogout} className="btn-logout">
              Logout
            </button>
          </div>

          {!isEmployee ? (
            <>
              <div className="payment-form">
                <h3>Make International Payment</h3>
                <form onSubmit={handlePayment}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Amount</label>
                      <input
                        type="number"
                        name="amount"
                        step="0.01"
                        placeholder="1000.00"
                        value={formData.amount}
                        onChange={handleChange}
                        required
                        disabled={loading}
                      />
                      {errors.amount && <span className="error">{errors.amount}</span>}
                    </div>

                    <div className="form-group">
                      <label>Currency</label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                        disabled={loading}
                      >
                        <option value="ZAR">ZAR - South African Rand</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>SWIFT Code (e.g., ABCDEF2A)</label>
                    <input
                      type="text"
                      name="swiftCode"
                      placeholder="ABCDEF2A"
                      value={formData.swiftCode}
                      onChange={handleChange}
                      required
                      disabled={loading}
                    />
                    {errors.swiftCode && (
                      <span className="error">{errors.swiftCode}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Description (Optional)</label>
                    <input
                      type="text"
                      name="description"
                      placeholder="Payment description"
                      value={formData.description}
                      onChange={handleChange}
                      disabled={loading}
                    />
                  </div>

                  <button type="submit" className="btn-primary" disabled={loading}>
                    {loading ? "Processing..." : "Pay Now"}
                  </button>
                </form>
              </div>

              <div className="payments-list">
                <h3>Your Payment History</h3>
                {payments.length === 0 ? (
                  <p className="empty-state">No payments yet</p>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{new Date(payment.date).toLocaleDateString()}</td>
                          <td>{payment.description}</td>
                          <td>{payment.currency || '$'} {payment.amount.toFixed(2)}</td>
                          <td className={`status-${payment.status}`}>
                            {getStatusBadge(payment.status)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="employee-dashboard">
              <h3>Employee Portal - Payment Verification</h3>
              <div className="info-box">
                <p>
                  <strong>📋 Review and verify customer payment transactions</strong>
                </p>
                <p>
                  Verify payment details and account information before forwarding to SWIFT.
                </p>
              </div>
              
              {payments.length === 0 ? (
                <p className="empty-state">No pending transactions</p>
              ) : (
                <div className="transactions-grid">
                  {payments.map((payment) => (
                    <div key={payment._id} className={`transaction-card status-${payment.status}`}>
                      <div className="transaction-header">
                        <h4>Transaction #{payment._id.slice(-6)}</h4>
                        <span className={`badge badge-${payment.status}`}>
                          {getStatusBadge(payment.status)}
                        </span>
                      </div>
                      
                      <div className="transaction-details">
                        <div className="detail-row">
                          <span className="label">Customer:</span>
                          <span className="value">
                            {payment.userId?.username || 'N/A'} ({payment.userId?.email})
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Account:</span>
                          <span className="value">{payment.userId?.accountNumber}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Amount:</span>
                          <span className="value amount">
                            {payment.currency || 'USD'} {payment.amount.toFixed(2)}
                          </span>
                        </div>
                        <div className="detail-row">
                          <span className="label">SWIFT Code:</span>
                          <span className="value">{payment.swiftCode || 'N/A'}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Description:</span>
                          <span className="value">{payment.description}</span>
                        </div>
                        <div className="detail-row">
                          <span className="label">Date:</span>
                          <span className="value">
                            {new Date(payment.date).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {payment.status === 'pending' && (
                        <div className="transaction-actions">
                          <button 
                            className="btn-success" 
                            onClick={() => handleVerifyPayment(payment._id, 'verified')}
                            disabled={loading}
                          >
                            ✓ Verify & Submit to SWIFT
                          </button>
                          <button 
                            className="btn-danger" 
                            onClick={() => handleVerifyPayment(payment._id, 'rejected')}
                            disabled={loading}
                          >
                            ✗ Reject Payment
                          </button>
                        </div>
                      )}

                      {payment.status === 'submitted' && (
                        <div className="verification-info">
                          <p>✅ Verified and submitted to SWIFT</p>
                          {payment.verifiedAt && (
                            <p className="small-text">
                              Verified on {new Date(payment.verifiedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}

                      {payment.status === 'rejected' && (
                        <div className="verification-info rejected">
                          <p>❌ Payment rejected</p>
                          {payment.verifiedAt && (
                            <p className="small-text">
                              Rejected on {new Date(payment.verifiedAt).toLocaleString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <footer>
        <p>🔒 Secured with SSL/TLS encryption</p>
        <p className="small-text">Protected by RegEx input validation, bcrypt password hashing, and JWT authentication</p>
      </footer>
    </div>
  );
}

export default App;