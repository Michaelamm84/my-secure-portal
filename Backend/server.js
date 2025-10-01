const express = require("express");
const bcrypt = require("bcrypt");
const bodyParser = require("body-parser");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(bodyParser.json());

let users = []; // temporary in-memory user store

// Register route
app.post("/register", async (req, res) => {
  const { username, password } = req.body;

  // Hash password with salt
  const hashedPassword = await bcrypt.hash(password, 10);

  users.push({ username, password: hashedPassword });
  res.json({ message: "User registered successfully!" });
});

// Login route
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  const user = users.find((u) => u.username === username);
  if (!user) return res.status(400).json({ message: "User not found" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (isMatch) {
    res.json({ message: "Login successful!" });
  } else {
    res.status(401).json({ message: "Invalid password" });
  }
});

// Start server
app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});
