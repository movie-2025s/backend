import jwt from "jsonwebtoken";
import { getUserById } from "../models/user.js";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    // attach minimal payload (use user_id)
    req.user = { user_id: payload.user_id, email: payload.email, role: payload.role };
    // fetch full user without password
    try {
      const user = await getUserById(payload.user_id);
      if (user) req.user = user;
    } catch (e) {
      // ignore fetch error
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
