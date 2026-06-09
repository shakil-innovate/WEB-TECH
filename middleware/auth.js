const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
  const token = req.cookies?.accessToken;

  if (!token) {
    return res.status(401).json({ message: "Access denied. No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ message: "Invalid or expired token." });
  }
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.status !== "admin") {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    next();
  });
};

const verifyUser = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.status !== "user") {
      return res.status(403).json({ message: "Access denied. Users only." });
    }
    next();
  });
};

module.exports = { verifyToken, verifyAdmin, verifyUser };