// const jwt = require("jsonwebtoken");

// module.exports = (req, res, next) => {
//   const token = req.header("Authorization");

//   if (!token) {
//     return res.status(401).json({ msg: "No token, authorization denied" });
//   }

//   const tokenString = token.split(" ")[1];

//   try {
//     const decoded = jwt.verify(tokenString, process.env.JWT_SECRET);

//     if (decoded.user) {
//       // Express backend token structure: { user: { id, role, email } }
//       req.user = decoded.user;
//     } else {
//       // Next.js API token structure: { userId, role, email, name }
//       req.user = {
//         id: decoded.userId,
//         role: decoded.role,
//         email: decoded.email,
//         name: decoded.name,
//       };
//     }

//     next();
//   } catch (err) {
//     res.status(401).json({ msg: "Token is not valid" });
//   }
// };
// middleware/auth.js
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

    console.log("✅ Token decoded successfully:", {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    });

    // Your Next.js API token structure: { userId, role, email, name }
    // Normalize to a consistent format for the backend
    req.user = {
      id: decoded.userId,
      userId: decoded.userId, // Keep both for compatibility
      role: decoded.role,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (err) {
    console.error("❌ Token verification failed:", err.message);

    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ msg: "Token has expired" });
    }

    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ msg: "Invalid token" });
    }

    res.status(401).json({ msg: "Token is not valid" });
  }
};

// Additional middleware for role-based access
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ msg: "Authentication required" });
    }

    const userRole = req.user.role;
    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({
        msg: `Access denied. Required role(s): ${allowedRoles.join(
          ", "
        )}. Your role: ${userRole}`,
      });
    }

    next();
  };
};

module.exports.requireRole = requireRole;
