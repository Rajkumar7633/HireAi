// middleware/auth.js
const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ msg: "No token, authorization denied" });
  }

  const tokenString = token.split(" ")[1];

  if (!tokenString) {
    return res.status(401).json({ msg: "Invalid token format" });
  }

  try {
    const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);

    // Normalize both token shapes: { userId, role, email, name } or { user: { id, role, email } }
    req.user = {
      id: decoded.userId || decoded.user?.id,
      userId: decoded.userId || decoded.user?.id,
      role: decoded.role || decoded.user?.role,
      email: decoded.email || decoded.user?.email,
      name: decoded.name,
    };

    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token has expired" });
    }
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Invalid token" });
    }
    res.status(401).json({ msg: "Token is not valid" });
  }
};

// Role-based access helper
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "Authentication required" });
    }
    const allowed = Array.isArray(roles) ? roles : [roles];
    if (!allowed.includes(req.user.role)) {
      return res.status(403).json({
        msg: `Access denied. Required: ${allowed.join(", ")}. Your role: ${req.user.role}`,
      });
    }
    next();
  };
};

module.exports.requireRole = requireRole;

