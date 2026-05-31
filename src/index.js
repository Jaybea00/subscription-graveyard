require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const auditRouter = require("./api/server");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use("/api", auditRouter);

// Serve frontend in production
app.use(express.static(path.join(__dirname, "../frontend/dist")));

app.listen(PORT, () => {
  console.log(
    `Subscription Graveyard server running on http://localhost:${PORT}`,
  );
  console.log(`Audit endpoint: http://localhost:${PORT}/api/audit`);
});
