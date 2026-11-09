const webhookQueue = require("../src/queues/webhookQueue");
const crypto = require("crypto");
exports.verifyWebhook = (req, res, next) => {
  if (
    process.env.NODE_ENV === "development" &&
    req.headers["x-bypass-sig"] === "true" // Only for testing purposes, bypass signature verification in development mode if the header is set to true
  ) {
    return next();
  }
  const secret = process.env.WEBHOOK_SECRET;
  const payload = req.rawBody; // rawBody is the raw buffer request body as a string
  // signature in hmac format and sha256= as prefix in the request headers
  const signature = req.headers["x-hub-signature-256"]; // Signature= mathematical HMAC calculation of webhook_secret+rawBody. Both should match.
  if (!signature) {
    return res.status(400).json({
      status: "fail",
      message: "Missing signature header",
    });
  }
  if (!payload) {
    return res.status(400).json({
      status: "fail",
      message: "Missing payload",
    });
  }
  // create a function using our secret key using the in build crypto module sha256 algorithm to create a hash of the payload and compare it with the signature.
  const hmac = crypto.createHmac("sha256", secret);
  hmac.update(payload);
  const digest = `sha256=${hmac.digest("hex")}`; //append sha256= to the calculated signature to match the signature format sent by GitHub.

  // convert to buffer form(0s and 1s) to compare the two signatures in a timing safe manner to avoid timing attacks.
  const signatureBuffer = Buffer.from(signature, "utf8");
  const digestBuffer = Buffer.from(digest, "utf8");
  if (
    signatureBuffer.length !== digestBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, digestBuffer)
  ) {
    return res.status(401).json({
      status: "fail",
      message: "Invalid signature",
    });
  } //info about timingSafeEqual is in readme file.
  next();
};

exports.handleWebhook = async (req, res) => {
  try {
    // HMAC verification passed in previous stage, now we can safely add the webhook payload to the queue for processing.
    const githubPayload = req.body; // The parsed JSON payload from GitHub
    await webhookQueue.add(
      "process-ai-review",
      githubPayload, // The payload to be processed by the worker
      {
        attempts: 3, // Try a maximum of 3 times before giving up completely
        backoff: {
          type: "exponential", // Use exponential backoff strategy
          delay: 2000, // Initial delay of 2 seconds before retrying
        },
      },
    ); // Add the payload to the BullMQ queue for processing
    res
      .status(200)
      .json({ status: "success", message: "Webhook queued for processing" });
  } catch (error) {
    console.error("Error handling webhook:", error);
    res.status(500).json({ status: "fail", message: "Internal server error" });
  }
};
