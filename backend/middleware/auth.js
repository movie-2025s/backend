import jwt from "jsonwebtoken";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Missing or invalid Authorization header" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    
    // Check if user is admin
    if (payload.role !== 'admin') {
      return res.status(403).json({ message: "Admin access required" });
    }
    
    // Set user info from token payload directly
    req.user = { 
      user_id: payload.user_id, 
      email: payload.email, 
      role: payload.role,
      name: payload.name 
    };
    
    next();
  } catch (err) {
    console.error('JWT verification error:', err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};

// Optional: Public auth for customer bookings (no login required)
export const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    req.user = null;
    return next();
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    req.user = { 
      user_id: payload.user_id, 
      email: payload.email, 
      role: payload.role,
      name: payload.name 
    };
    next();
  } catch (err) {
    console.error('JWT optional auth error:', err.message);
    req.user = null;
    next();
  }
};

// Simple auth for any valid token (not just admin)
export const requireAuth = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers["Authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    req.user = { 
      user_id: payload.user_id, 
      email: payload.email, 
      role: payload.role,
      name: payload.name 
    };
    next();
  } catch (err) {
    console.error('JWT auth error:', err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};