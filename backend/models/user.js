import pool from "../db/index.js";
import bcrypt from "bcryptjs";

// User helpers using Postgres
export async function createUser({ name, email, password, role = "user" }) {
  const salt = bcrypt.genSaltSync(10);
  const password_hash = bcrypt.hashSync(password, salt);
  const sql = `INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING user_id, name, email, role, created_at`;
  const values = [name, email, password_hash, role];
  const { rows } = await pool.query(sql, values);
  return rows[0];
}

export async function getUserByEmail(email) {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
}

export async function getUserById(user_id) {
  const { rows } = await pool.query("SELECT user_id, name, email, role, created_at FROM users WHERE user_id = $1", [user_id]);
  return rows[0];
}

export function comparePassword(candidate, password_hash) {
  return bcrypt.compareSync(candidate, password_hash);
}
