// app.js
require("dotenv").config();
const path = require("path");
const express = require("express");
const connectDB = require("./config/db");
const morgan = require("morgan");
const passport = require("passport");
const errorHandler = require("./middleware/errorMiddleware");

// Passport (Google OAuth) config
require("./config/passport")(passport);
// const morgan = require("morgan");
// Connect to MongoDB
connectDB();

const app = express();

app.use(morgan("dev"));

// Body parsers
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

// Initialize Passport (no sessions)
app.use(passport.initialize());

// HTTP request logger
app.use(morgan("dev"));


app.use((req, res, next) => {
  // Block access to .env, .git, or any other dotfiles
  if (req.path.includes('/.env') || req.path.includes('/.git')) {
    console.log(`Blocked attempt to access system file: ${req.path}`);
    return res.status(403).send('Forbidden');
  }
  next();
});


// Base route
app.get("/api", (req, res) => {
  res.send("Welcome to the Copy-Check API");
});

// Mount feature routers
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/examiner", require("./routes/examiner.routes"));
app.use("/api/student", require("./routes/student.routes"));
app.use("/api/drive", require("./routes/drive.routes"));

// Serve React build in production
if (process.env.NODE_ENV === "production") {
  const clientBuildPath = path.join(__dirname, "client/build");
  app.use(express.static(clientBuildPath));

  app.get("*", (req, res) => {
    if (req.path.startsWith("/api/")) {
      return res.status(404).end();
    }
    res.sendFile(path.join(clientBuildPath, "index.html"));
  });
}

// Global error handler
app.use(errorHandler);

module.exports = app;
