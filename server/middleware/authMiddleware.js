const jwt = require("jsonwebtoken");

/** Admin authentication — verifies JWT, attaches req.user */
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: "Unauthorized"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      message: "Invalid token"
    });
  }
};

/** Farmer authentication — verifies JWT with role:"farmer", attaches req.farmer */
const authenticateFarmer = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.replace("Bearer ", "")
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      message: "Farmer authentication required"
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "farmer") {
      return res.status(403).json({
        success: false,
        data: null,
        message: "Farmer access only"
      });
    }
    req.farmer = decoded;
    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      data: null,
      message: "Invalid or expired token"
    });
  }
};

module.exports = { authenticate, authenticateFarmer };
