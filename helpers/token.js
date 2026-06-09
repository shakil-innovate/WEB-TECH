const jwt = require("jsonwebtoken");

const generateAccessToken = (payload) =>
  jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "15m" });

const generateRefreshToken = (payload) =>
  jwt.sign({ id: payload.id }, process.env.REFRESH_SECRET, { expiresIn: "7d" });

module.exports = { generateAccessToken, generateRefreshToken }; 