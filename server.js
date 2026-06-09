require("dotenv").config();
const express = require("express");
const cookieParser = require("cookie-parser");
const db = require("./config/db");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/", (req, res) => {
  res.json({ message: "Payment API is running" });
});

app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/posts", require("./routes/postRoutes"));
app.use("/api/messages", require("./routes/messageRoutes"));

app.listen(PORT, async () => {
  try {
    await db.getConnection();
    console.log("✅ MySQL Connected to payment_db");
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
  }
  console.log(`Server running on http://localhost:${PORT}`);
});