
const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator"); // ✅ import

const app = express();
app.use(cors());
app.use(express.json());
app.use(helmet());

// Rate limiting
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests, try again later.",
});
app.use(globalLimiter);

const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: "Too many login attempts, try again later.",
});

// Temporary user store
let users = [];

// ✅ Middleware for validation/sanitization
const validateUser = [
  body("username")
    .trim()                // remove spaces before/after
    .escape()              // escape HTML (no <script>)
    .isLength({ min: 3 })  // must be at least 3 chars
    .withMessage("Username must be at least 3 characters long"),

  body("password")
    .isLength({ min: 6 })  // at least 6 chars
    .withMessage("Password must be at least 6 characters long")
    .escape(),             // escape special chars
];

// Register
app.post("/register", validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  users.push({ username, password: hashedPassword });
  res.json({ message: "User registered successfully!" });
});

// Login
app.post("/login", loginLimiter, validateUser, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

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

app.listen(5000, () => {
  console.log("Server running at http://localhost:5000");
});
