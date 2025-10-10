
// my-secure-portal/server.js

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs"); 
const helmet = require("helmet");
const { body, validationResult } = require("express-validator");

// ===============================
// CONFIG
// ===============================

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const JWT_SECRET = process.env.JWT_SECRET;
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

// ===============================
// MIDDLEWARE
// ===============================

app.use(helmet()); // add security headers
app.use(express.json());
app.use(cors());
app.use(rateLimit({ windowMs: 60 * 1000, max: 20 }));

// Simple request logger (don't log sensitive info)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ===============================
// DATABASE CONNECTION
// ===============================

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================
// MODELS
// ===============================

const userSchema = new mongoose.Schema({
  username: { type: String, index: true },
  email: { type: String, index: true },
  password: String,
  accountNumber: String,
  createdAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  date: Date,
  description: String,
});

const refreshTokenSchema = new mongoose.Schema({
  token: String,
  userId: mongoose.Schema.Types.ObjectId,
  expiresAt: Date,
});

const User = mongoose.model("User", userSchema);
const Payment = mongoose.model("Payment", paymentSchema);
const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

// ===============================
// AUTH HELPERS
// ===============================

function signAccessToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      username: user.username,
      accountNumber: user.accountNumber,
    },
    JWT_SECRET,
    { expiresIn: "15m" }
  );
}

function signRefreshToken(user) {
  return jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: "30d" });
}

// Middleware for protected routes
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Missing Authorization header" });

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token)
    return res.status(401).json({ message: "Invalid Authorization format" });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

// ===============================
// ROUTES
// ===============================

// --- Root route ---
app.get("/", (req, res) => {
  res.send("🚀 My Secure Portal API running successfully!");
});

// --- Register ---
// validations:
//   username: required, min 3 chars
//   email: required, valid email
//   password: required, min 8 chars
//   accountNumber: optional, alphanumeric between 4-20
const registerValidators = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("username must be at least 3 characters"),
  body("email").trim().isEmail().withMessage("invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters"),
  body("accountNumber")
    .optional()
    .trim()
    .isAlphanumeric()
    .isLength({ min: 4, max: 20 })
    .withMessage("accountNumber must be 4-20 alphanumeric characters"),
];

app.post("/register", registerValidators, async (req, res) => {
  // Validation errors
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  try {
    const { username, email, password, accountNumber } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await User.create({
      username,
      email,
      password: hashed,
      accountNumber,
    });

    res.json({ ok: true, userId: user._id });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Login (accepts email OR username, optional accountNumber check) ---
// validations: password required, identifier presence checked in handler
const loginValidators = [body("password").exists().withMessage("password required")];

app.post("/login", loginValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  try {
    const { email, username, accountNumber, password } = req.body;

    // Minimal debug info (DO NOT log passwords)
    console.log("[/login] attempt:", {
      identifier: email ? email : username ? username : "<missing>",
      accountNumber: accountNumber ? accountNumber : "<not-provided>",
    });

    const identifier = email || username;
    if (!identifier || !password) {
      return res.status(400).json({ message: "Missing credentials" });
    }

    const user = await User.findOne({
      $or: [{ email: identifier }, { username: identifier }],
    });

    if (!user) {
      console.warn("[/login] user not found for identifier:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (accountNumber && user.accountNumber && user.accountNumber !== accountNumber) {
      console.warn("[/login] accountNumber mismatch for user:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.warn("[/login] invalid password for user:", identifier);
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const accessToken = signAccessToken(user);
    const refreshToken = signRefreshToken(user);

    await RefreshToken.create({
      token: refreshToken,
      userId: user._id,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    return res.json({
      ok: true,
      token: accessToken,
      refreshToken,
      userId: user._id,
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    console.error("Login error:", err && err.stack ? err.stack : err);
    return res.status(500).json({ message: "Server error" });
  }
});

// --- Refresh Token ---
app.post("/token/refresh", async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken)
    return res.status(400).json({ message: "Missing refreshToken" });

  const stored = await RefreshToken.findOne({ token: refreshToken });
  if (!stored) return res.status(401).json({ message: "Invalid refresh token" });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET);
    const user = await User.findById(payload.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const newAccessToken = signAccessToken(user);
    res.json({ token: newAccessToken });
  } catch (err) {
    console.error("Refresh error:", err);
    res.status(401).json({ message: "Invalid or expired refresh token" });
  }
});

// --- Logout ---
app.post("/logout", async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) await RefreshToken.deleteOne({ token: refreshToken });
  res.json({ ok: true });
});

// --- Protected Payments Route ---
app.get("/payments", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId;
    const payments = await Payment.find({ userId }).sort({ date: -1 });
    res.json({ ok: true, payments });
  } catch (err) {
    console.error("Payments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Create Payment (Protected) ---
// validate amount and optional description
const createPaymentValidators = [
  body("amount")
    .exists()
    .withMessage("amount is required")
    .isFloat({ gt: 0 })
    .withMessage("amount must be a number greater than 0"),
  body("description").optional().trim().isString(),
];

app.post("/payments", requireAuth, createPaymentValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

  try {
    const userId = req.user.userId;
    const { amount, description } = req.body;
    const payment = await Payment.create({
      userId,
      amount,
      description,
      date: new Date(),
    });
    res.json({ ok: true, payment });
  } catch (err) {
    console.error("Create payment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// GET /me - return the current user's profile
app.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = req.user.userId || req.user.id;
    const user = await User.findById(userId).select("-password -__v");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ ok: true, user });
  } catch (err) {
    console.error("/me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// PATCH /me - update basic profile fields (email, password)
// validate optional fields
const patchMeValidators = [
  body("email").optional().isEmail().normalizeEmail().withMessage("invalid email"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters"),
];

app.patch("/me", requireAuth, patchMeValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

  try {
    const userId = req.user.userId || req.user.id;
    const { email, password } = req.body;
    const update = {};
    if (email) update.email = email;
    if (password) update.password = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await User.findByIdAndUpdate(userId, update, { new: true }).select(
      "-password -__v"
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ ok: true, user });
  } catch (err) {
    console.error("PATCH /me error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// Global error handler: return JSON
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err && err.stack ? err.stack : err);
  res.status(err.status || 500).json({ message: err.message || "Internal server error" });
});

// ===============================
// SERVER START
// ===============================

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
