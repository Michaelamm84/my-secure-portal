// src/App.js
// App.js - Secure Banking Portal Frontend
import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "https://localhost:5000";

function App() {
  const [isEmployee, setIsEmployee] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [payments, setPayments] = useState([]);
  
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

  // RegEx Whitelist Patterns
  const patterns = {
    username: /^[a-zA-Z0-9_]{3,20}$/,
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    accountNumber: /^[A-Z0-9]{4,20}$/,
    password: /^.{8,}$/,
    amount: /^\d+(\.\d{1,2})?$/,
    swiftCode: /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/,
  };

  // Input sanitization and validation
  const sanitizeInput = (name, value) => {
    // Remove any HTML tags
    let sanitized = DOMPurify.sanitize(value, { ALLOWED_TAGS: [] });
    
    // Trim whitespace
    sanitized = sanitized.trim();
    
    // Validate against pattern
    if (patterns[name] && !patterns[name].test(sanitized)) {
      setErrors(prev => ({
        ...prev,
        [name]: `Invalid ${name} format`
      }));
      return "";
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[name];
      return newErrors;
    });
    
    return sanitized;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitized = sanitizeInput(name, value);
    setFormData({ ...formData, [name]: sanitized });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
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
        
        // Fetch payments if logged in
        if (!isEmployee) {
          fetchPayments(data.token);
        }
      } else {
        alert(data.message || "Login failed");
      }
    } catch (error) {
      console.error("Login error:", error);
      alert("Network error. Please try again.");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (isEmployee) {
      alert("Employees cannot register. Contact administrator.");
      return;
    }

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

  const handlePayment = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_URL}/payments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: parseFloat(formData.amount),
          description: `${formData.currency} payment to ${formData.swiftCode}`,
        }),
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        alert("Payment submitted successfully!");
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
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setToken(null);
    setUser(null);
    setPayments([]);
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
  };

  useEffect(() => {
    // Check for existing token on mount
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
      // Verify token is still valid
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
          } else {
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
        });
    }
  }, []);

  return (
    <div className="app-container">
      <header>
        <h1>🏦 Secure International Banking Portal</h1>
        <div className="portal-toggle">
          <button
            className={!isEmployee ? "active" : ""}
            onClick={() => setIsEmployee(false)}
          >
            Customer Portal
          </button>
          <button
            className={isEmployee ? "active" : ""}
            onClick={() => setIsEmployee(true)}
          >
            Employee Portal
          </button>
        </div>
      </header>

      {!isLoggedIn ? (
        <div className="login-container">
          <h2>{isEmployee ? "Employee" : "Customer"} Login</h2>
          
          {!isEmployee && (
            <div className="info-box">
              <p>New customers can register below</p>
            </div>
          )}

          {isEmployee && (
            <div className="info-box warning">
              <p>⚠️ Pre-registered employees only. No registration available.</p>
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
                />
                {errors.username && <span className="error">{errors.username}</span>}
              </div>
            )}

            <div className="form-group">
              <label>Account Number</label>
              <input
                type="text"
                name="accountNumber"
                placeholder="ACC12345"
                value={formData.accountNumber}
                onChange={handleChange}
                required
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
              />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <button type="submit" className="btn-primary">
              Login
            </button>
          </form>

          {!isEmployee && (
            <>
              <div className="divider">OR</div>
              <form onSubmit={handleRegister}>
                <h3>Register New Account</h3>
                
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    name="username"
                    placeholder="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                  />
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
                  />
                </div>

                <div className="form-group">
                  <label>Account Number</label>
                  <input
                    type="text"
                    name="accountNumber"
                    placeholder="ACC12345"
                    value={formData.accountNumber}
                    onChange={handleChange}
                    required
                  />
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
                  />
                </div>

                <button type="submit" className="btn-secondary">
                  Register
                </button>
              </form>
            </>
          )}
        </div>
      ) : (
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h2>Welcome, {user?.username || user?.email}</h2>
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
                      />
                    </div>

                    <div className="form-group">
                      <label>Currency</label>
                      <select
                        name="currency"
                        value={formData.currency}
                        onChange={handleChange}
                      >
                        <option value="ZAR">ZAR - South African Rand</option>
                        <option value="USD">USD - US Dollar</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label>SWIFT Code</label>
                    <input
                      type="text"
                      name="swiftCode"
                      placeholder="ABCDEF2A"
                      value={formData.swiftCode}
                      onChange={handleChange}
                      required
                    />
                    {errors.swiftCode && (
                      <span className="error">{errors.swiftCode}</span>
                    )}
                  </div>

                  <button type="submit" className="btn-primary">
                    Pay Now
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
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((payment) => (
                        <tr key={payment._id}>
                          <td>{new Date(payment.date).toLocaleDateString()}</td>
                          <td>{payment.description}</td>
                          <td>${payment.amount.toFixed(2)}</td>
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
                  Review and verify customer payment transactions before forwarding
                  to SWIFT.
                </p>
              </div>
              
              {payments.length === 0 ? (
                <p className="empty-state">No pending transactions</p>
              ) : (
                <div className="transactions-grid">
                  {payments.map((payment) => (
                    <div key={payment._id} className="transaction-card">
                      <h4>Transaction Details</h4>
                      <p><strong>Amount:</strong> ${payment.amount.toFixed(2)}</p>
                      <p><strong>Description:</strong> {payment.description}</p>
                      <p><strong>Date:</strong> {new Date(payment.date).toLocaleString()}</p>
                      <div className="transaction-actions">
                        <button className="btn-success">✓ Verify</button>
                        <button className="btn-danger">✗ Reject</button>
                      </div>
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
      </footer>
    </div>
  );
}

export default App;