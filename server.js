
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoStore = require("connect-mongo").default;
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./routes/auth");
const requireAuth = require("./middleware/auth");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

if (!process.env.MONGODB_URI || !process.env.SESSION_SECRET) {
  throw new Error("Please configure MONGODB_URI and SESSION_SECRET in .env");
}

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));

app.use(
  session({
    name: "auth.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60
    }),
    cookie: {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      maxAge: 60 * 60 * 1000
    }
  })
);

const publicDir = path.join(__dirname, "public");
app.use(express.static(publicDir, { index: false }));

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => res.redirect("/login.html"));

app.get("/dashboard", requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, "private", "dashboard.html"));
});

app.use((req, res) => {
  res.status(404).send("Page not found.");
});

async function startServer() {
  await mongoose.connect(process.env.MONGODB_URI);

  const port = process.env.PORT || 5000;

  app.listen(port, () => {
    console.log(`Authentication System running at http://localhost:${port}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error.message);
  process.exit(1);
});
