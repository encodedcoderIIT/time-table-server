require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webpush = require("web-push");
const cors = require("cors"); // Import the cors middleware
const fs = require("fs");
const https = require("https");

const serverUrl = "https://time-table-server-ixc6.onrender.com";
const port = 3000;
// const serverUrl = `http://localhost:${port}`;

const app = express();
app.use(bodyParser.json());
app.use(cors()); // Enable CORS for all routes

// Load VAPID keys from environment variables
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
  throw new Error("VAPID keys are not set in environment variables");
}

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  vapidPublicKey,
  vapidPrivateKey
);

console.log("Public Key:", vapidPublicKey);

// Store subscriptions
let subscriptions = [];

// Endpoint to get the public key
app.get("/vapidPublicKey", (req, res) => {
  res.json({ publicKey: vapidPublicKey });
});

app.get("/", (req, res) => {
  res.send("This is your time table server! Up and running...");
});

// Subscribe Route
app.post("/subscribe", (req, res) => {
  try {
    const subscription = req.body;
    subscriptions.push(subscription);

    // Log the new subscription
    console.log("New subscription added:", subscription);

    res.status(201).json({ success: true });

    // Send a welcome notification
    const payload = JSON.stringify({
      title: "Welcome!",
      body: "You are subscribed | encodedcoder",
      icon: `${serverUrl}/images/encodedcoder.png`, // Absolute URL to the icon
      badge: `${serverUrl}/images/encodedcoder.png`, // Absolute URL to the badge
    });

    webpush.sendNotification(subscription, payload).catch((error) => {
      console.error("Error sending notification:", error);
      res.status(500).json({ error: "Failed to send notification" });
    });
  } catch (error) {
    console.error("Error in subscribe route:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started: ${serverUrl}`);
});
