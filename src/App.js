import React, { useState } from "react";

function App() {
  const [formData, setFormData] = useState({ username: "", password: "", amount: "" });
  const [isRegistered, setIsRegistered] = useState(false); // Toggle between register/login
  const [isLoggedIn, setIsLoggedIn] = useState(false); // Track login status
  const [errors, setErrors] = useState([]); // Store validation or server errors

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear errors when user starts typing
    setErrors([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isRegistered ? "/login" : "/register";

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

      if (!response.ok) {
        if (data.errors) {
          // Handle validation errors from backend
          setErrors(data.errors.map((err) => err.msg));
        } else {
          // Handle other errors (e.g., rate limiting, user not found)
          setErrors([data.message || "An error occurred"]);
        }
        return;
      }

      alert(data.message);
      if (endpoint === "/register") {
        setIsRegistered(true); // Switch to login mode after registration
        setFormData({ ...formData, username: "", password: "" }); // Clear form
      } else if (endpoint === "/login") {
        setIsLoggedIn(true); // Show payment form after login
        setFormData({ ...formData, username: "", password: "" }); // Clear form
      }
    } catch (error) {
      setErrors(["Error connecting to backend: " + error.message]);
    }
  };

  const handlePaymentSubmit = (e) => {
    e.preventDefault();
    if (formData.amount <= 0) {
      setErrors(["Payment amount must be greater than 0"]);
      return;
    }
    alert(`Payment submitted for $${formData.amount}`);
    setFormData({ ...formData, amount: "" }); // Clear amount after submission
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-center mb-6">Secure Portal</h1>
        
        {errors.length > 0 && (
          <div className="mb-4 text-red-600">
            {errors.map((error, index) => (
              <p key={index} className="text-sm">{error}</p>
            ))}
          </div>
        )}

        {!isLoggedIn ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="text"
                name="username"
                placeholder="Username (min 3 characters)"
                value={formData.username}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={3}
              />
            </div>
            <div>
              <input
                type="password"
                name="password"
                placeholder="Password (min 6 characters)"
                value={formData.password}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={6}
              />
            </div>
            <div className="flex justify-between">
              <button
                type="submit"
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              >
                {isRegistered ? "Login" : "Register"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRegistered(!isRegistered);
                  setErrors([]);
                  setFormData({ ...formData, username: "", password: "" });
                }}
                className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
              >
                Switch to {isRegistered ? "Register" : "Login"}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handlePaymentSubmit} className="space-y-4">
            <div>
              <input
                type="number"
                name="amount"
                placeholder="Payment Amount"
                value={formData.amount}
                onChange={handleChange}
                className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                min="0.01"
                step="0.01"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Submit Payment
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default App;