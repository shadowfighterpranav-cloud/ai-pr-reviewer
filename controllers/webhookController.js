const crypto = require("crypto");
exports.verifyWebhook = (req, res, next) => {
  const secret = process.env.WEBHOOK_SECRET;
  const payload = req.rawBody; // rawBody is the raw buffer request body as a string
  // signature in hmac format and sha256= as prefix in the request headers
  const signature = req.headers["x-hub-signature-256"]; // Signature= mathematical HMAC calculation of webhook_secret+rawBody. both should match.
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

exports.handleWebhook = (req, res) => {
  // Handle the webhook event here
  console.log("Webhook event received:", req.body);
  res.status(200).json({ status: "success", message: "Webhook received" });
};
