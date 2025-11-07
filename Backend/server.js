
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
  .then(() => {
    console.log("✅ Connected to MongoDB");
    // Seed employees after database connection
    seedEmployees();
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ===============================
// MODELS
// ===============================

const userSchema = new mongoose.Schema({
  username: { type: String, index: true },
  email: { type: String, index: true },
  password: String,
  accountNumber: String,
  role: { type: String, enum: ['customer', 'employee'], default: 'customer' },
  createdAt: { type: Date, default: Date.now },
});

const paymentSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  date: Date,
  description: String,
  status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected', 'submitted'], 
    default: 'pending' 
  },
  verifiedBy: mongoose.Schema.Types.ObjectId,
  verifiedAt: Date,
  swiftCode: String,
  currency: String,
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
// SEED EMPLOYEES (Pre-registered accounts)
// ===============================

const seedEmployees = async () => {
  try {
    const employees = [
      {
        username: "employee1",
        email: "employee1@bank.com",
        password: await bcrypt.hash("SecurePass123!", BCRYPT_SALT_ROUNDS),
        accountNumber: "EMP001",
        role: "employee"
      },
      {
        username: "employee2",
        email: "employee2@bank.com",
        password: await bcrypt.hash("SecurePass456!", BCRYPT_SALT_ROUNDS),
        accountNumber: "EMP002",
        role: "employee"
      },
      {
        username: "employee3",
        email: "employee3@bank.com",
        password: await bcrypt.hash("SecurePass789!", BCRYPT_SALT_ROUNDS),
        accountNumber: "EMP003",
        role: "employee"
      }
    ];

    for (const emp of employees) {
      const exists = await User.findOne({ email: emp.email });
      if (!exists) {
        await User.create(emp);
        console.log(`✅ Created employee: ${emp.username}`);
      }
    }
    console.log("✅ Employee seed complete");
  } catch (err) {
    console.error("❌ Error seeding employees:", err);
  }
};

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
      role: user.role,
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

// Middleware to check if user is an employee
function requireEmployee(req, res, next) {
  if (!req.user || req.user.role !== 'employee') {
    return res.status(403).json({ message: "Employee access required" });
  }
  next();
}

// ===============================
// ROUTES
// ===============================


app.get("/", (req, res) => {
  res.send("🚀 My Secure Portal API running successfully!");
});

// ===============================
// CUSTOMER REGISTRATION 
// ===============================

const registerValidators = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("username must be at least 3 characters"),
  body("email").trim().isEmail().withMessage("invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain uppercase, lowercase, number and special character"),
  body("accountNumber")
    .optional()
    .trim()
    .isAlphanumeric()
    .isLength({ min: 4, max: 20 })
    .withMessage("accountNumber must be 4-20 alphanumeric characters"),
];

app.post("/register", registerValidators, async (req, res) => {
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
    
    // Always set role as 'customer' for public registration
    const user = await User.create({
      username,
      email,
      password: hashed,
      accountNumber,
      role: 'customer',  // Force customer role
    });

    console.log(`✅ New customer registered: ${user.username}`);
    res.json({ ok: true, userId: user._id, message: "Registration successful" });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ===============================
// EMPLOYEE REGISTRATION 
// ===============================

const adminRegisterValidators = [
  body("username")
    .trim()
    .isLength({ min: 3 })
    .withMessage("username must be at least 3 characters"),
  body("email").trim().isEmail().withMessage("invalid email").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain uppercase, lowercase, number and special character"),
  body("accountNumber")
    .optional()
    .trim()
    .isAlphanumeric()
    .isLength({ min: 4, max: 20 })
    .withMessage("accountNumber must be 4-20 alphanumeric characters"),
  body("role")
    .optional()
    .isIn(['customer', 'employee'])
    .withMessage("role must be customer or employee"),
];

app.post("/admin/register", requireAuth, requireEmployee, adminRegisterValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  try {
    const { username, email, password, accountNumber, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ message: "User already exists" });

    const hashed = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
    const user = await User.create({
      username,
      email,
      password: hashed,
      accountNumber,
      role: role || 'customer',
    });

    console.log(`✅ Employee ${req.user.username} created new user: ${user.username} (${user.role})`);
    res.json({ ok: true, userId: user._id, message: "User created successfully" });
  } catch (err) {
    console.error("Admin register error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Login (accepts email OR username, optional accountNumber check) ---
const loginValidators = [body("password").exists().withMessage("password required")];

app.post("/login", loginValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ ok: false, errors: errors.array() });
  }

  try {
    const { email, username, accountNumber, password } = req.body;

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
      role: user.role,
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

// --- Protected Payments Route (for customers - their own payments) ---
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

// --- Employee Route: Get ALL payments for review ---
app.get("/admin/all-payments", requireAuth, requireEmployee, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate('userId', 'username email accountNumber')
      .sort({ date: -1 });
    
    console.log(`✅ Employee ${req.user.username} fetched ${payments.length} payments`);
    res.json({ ok: true, payments });
  } catch (err) {
    console.error("Admin payments error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Create Payment (Protected) ---
const createPaymentValidators = [
  body("amount")
    .exists()
    .withMessage("amount is required")
    .isFloat({ gt: 0 })
    .withMessage("amount must be a number greater than 0"),
  body("description").optional().trim().isString(),
  body("swiftCode")
    .optional()
    .trim()
    .matches(/^[A-Z]{6}[A-Z0-9]{2}(?:[A-Z0-9]{3})?$/)
    .withMessage("Invalid SWIFT code format"),
  body("currency")
    .optional()
    .isIn(['ZAR', 'USD', 'EUR', 'GBP'])
    .withMessage("Invalid currency"),
];

app.post("/payments", requireAuth, createPaymentValidators, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ ok: false, errors: errors.array() });

  try {
    const userId = req.user.userId;
    const { amount, description, swiftCode, currency } = req.body;
    
    const payment = await Payment.create({
      userId,
      amount,
      description,
      swiftCode,
      currency,
      date: new Date(),
      status: 'pending',
    });
    
    console.log(`✅ Payment created by user ${req.user.username}: $${amount}`);
    res.json({ ok: true, payment });
  } catch (err) {
    console.error("Create payment error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// --- Verify Payment (Employee Only) ---
app.patch("/payments/:id/verify", requireAuth, requireEmployee, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['verified', 'rejected'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'verified' or 'rejected'" });
    }

    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        status: status === 'verified' ? 'submitted' : 'rejected',
        verifiedBy: req.user.userId,
        verifiedAt: new Date(),
      },
      { new: true }
    ).populate('userId', 'username email accountNumber');

    if (!payment) {
      return res.status(404).json({ message: "Payment not found" });
    }

    console.log(`✅ Payment ${id} ${status} by employee ${req.user.username}`);
    
    // Simulate SWIFT submission
    if (status === 'verified') {
      console.log(`📤 SWIFT SUBMISSION SIMULATED for payment ${id}`);
      console.log(`   Amount: ${payment.amount} ${payment.currency}`);
      console.log(`   SWIFT Code: ${payment.swiftCode}`);
    }

    res.json({ 
      ok: true, 
      payment,
      message: status === 'verified' 
        ? "Payment verified and submitted to SWIFT" 
        : "Payment rejected"
    });
  } catch (err) {
    console.error("Verify payment error:", err);
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
const patchMeValidators = [
  body("email").optional().isEmail().normalizeEmail().withMessage("invalid email"),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("password must be at least 8 characters")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage("Password must contain uppercase, lowercase, number and special character"),
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
  console.log(`📋 Pre-registered employee accounts:`);
  console.log(`   - username: employee1, password: SecurePass123!, account: EMP001`);
  console.log(`   - username: employee2, password: SecurePass456!, account: EMP002`);
  console.log(`   - username: employee3, password: SecurePass789!, account: EMP003`);
  console.log(`✅ Customer registration: ENABLED at /register`);
});