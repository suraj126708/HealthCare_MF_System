const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const { clean } = require("xss-clean/lib/xss");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const errorHandler = require("./middleware/errorHandler");
const { defaultLimiter } = require("./middleware/rateLimiter");

const authRoutes = require("./routes/auth.routes");
const adminRoutes = require("./routes/admin.routes");
const patientRoutes = require("./routes/patient.routes");
const doctorRoutes = require("./routes/doctor.routes");

const app = express();
const ALLOWED_ORIGIN = "http://localhost:5173";
const ALLOWED_METHODS = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
const ALLOWED_HEADERS = "Content-Type,Authorization";

app.use(helmet());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin === ALLOWED_ORIGIN) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", ALLOWED_METHODS);
  res.header("Access-Control-Allow-Headers", ALLOWED_HEADERS);

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});
app.use(
  cors({
    origin: ALLOWED_ORIGIN,
    credentials: true,
    methods: ALLOWED_METHODS.split(","),
    allowedHeaders: ALLOWED_HEADERS.split(","),
  }),
);

app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => {
  if (req.body) req.body = clean(req.body);
  if (req.params) req.params = clean(req.params);
  next();
});
app.use(defaultLimiter);

app.get("/api/health", (req, res) => {
  res.json({ success: true, data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/doctor", doctorRoutes);
app.use("/api/patients", patientRoutes);

app.use(errorHandler);

module.exports = app;
