import React, { useState } from "react";

function App() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    amount: "",
  });
  const [isRegistered, setIsRegistered] = useState(false); // Toggle between register/login
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login status

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const endpoint = isRegistered ? "/login" : "/register"; // Choose endpoint based on mode

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
        }),
      });

      const data = await response.json();
      alert(data.message);

      if (response.ok) {
        if (endpoint === "/register") {
          // After register, switch to login mode
          setIsRegistered(true);
        } else if (endpoint === "/login") {
          // After login, show payment section
          setIsLoggedIn(true);
        }
      }
    } catch (error) {
      alert("Error connecting to backend: " + error.message);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    alert(`Payment submitted for $${formData.amount}`);
    // Here you could add more logic later, like sending to backend or storing in a DB
  };

  return (
    <div style={{ textAlign: "center", marginTop: "50px" }}>
      <h1>Secure Portal</h1>

      {!isLoggedIn ? (
        <form onSubmit={handleSubmit} style={{ display: "inline-block" }}>
          <div style={{ marginBottom: "10px" }}>
            <input
              type="text"
              name="username"
              placeholder="Username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>

          <div style={{ marginBottom: "10px" }}>
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit">{isRegistered ? "Login" : "Register"}</button>
          <button
            type="button"
            onClick={() => setIsRegistered(!isRegistered)}
            style={{ marginLeft: "10px" }}
          >
            Switch to {isRegistered ? "Register" : "Login"}
          </button>
        </form>
      ) : (
        <form onSubmit={handlePaymentSubmit} style={{ display: "inline-block" }}>
          <div style={{ marginBottom: "10px" }}>
            <input
              type="number"
              name="amount"
              placeholder="Payment Amount"
              value={formData.amount}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit">Submit Payment</button>
        </form>
      )}
    </div>
  );
}

export default App;