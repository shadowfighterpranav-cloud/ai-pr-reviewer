const express = require("express");
const webhookRouter = require("./routes/webhookRoutes");

const app = express();
app.use(
  express.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use("/api/v1/webhook", webhookRouter);

module.exports = app;
