import express from "express";
import jwt from "jsonwebtoken";
import { createUser, getUserByEmail } from "../models/user.js";
import { comparePassword } from "../models/user.js";

const router = express.Router();

// POST /auth/register
router.post("/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ message: "name, email and password are required" });

  try {
    const existing = await getUserByEmail(email);
    if (existing) return res.status(400).json({ message: "Email already in use" });

    const user = await createUser({ name, email, password });
    const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET || "change_this_secret", { expiresIn: "7d" });
    return res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error creating user" });
  }
});

// POST /auth/login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "email and password are required" });

  try {
    const user = await getUserByEmail(email);
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = comparePassword(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign({ user_id: user.user_id, email: user.email, role: user.role }, process.env.JWT_SECRET || "change_this_secret", { expiresIn: "7d" });
  const safeUser = { user_id: user.user_id, name: user.name, email: user.email, role: user.role, created_at: user.created_at };
  return res.json({ token, user: safeUser });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Error logging in" });
  }
});

// GET /auth/me
router.get("/me", async (req, res) => {
  // Expect authenticate middleware to attach req.user
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  res.json(req.user);
});

export default router;
