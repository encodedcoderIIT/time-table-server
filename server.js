require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const webpush = require("web-push");
const cors = require("cors");
const cron = require("node-cron");
const path = require("path");
const fs = require("fs");

// const serverUrl = "https://time-table-server-ixc6.onrender.com";
const port = 3000;
const serverUrl = `http://localhost:${port}`;

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

// Load timetable
const timetable = require("./timetable.json");

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

// Schedule a job to run every minute
cron.schedule("* * * * *", () => {
  const now = new Date();
  const currentDay = now.toLocaleString("en-US", { weekday: "long" });
  const currentTime = now.toTimeString().slice(0, 5); // Format HH:MM
  const tenMinutesLater = new Date(now.getTime() + 10 * 60000);
  const tenMinutesLaterTime = tenMinutesLater.toTimeString().slice(0, 5); // Format HH:MM

  console.log("Current Time:", currentTime);
  console.log("Current Day:", currentDay);
  console.log("10 Minutes Later:", tenMinutesLaterTime);

  timetable.forEach((daySchedule) => {
    if (daySchedule.day === currentDay) {
      daySchedule.classes.forEach((classInfo) => {
        if (classInfo.time <= tenMinutesLaterTime) {
          const payload = JSON.stringify({
            title: "Class Reminder",
            body: `You have ${classInfo.subject} class in the next 10 minutes.`,
            icon: `${serverUrl}/images/encodedcoder.png`, // Absolute URL to the icon
            badge: `${serverUrl}/images/encodedcoder.png`, // Absolute URL to the badge
          });

          subscriptions.forEach((subscription) => {
            webpush.sendNotification(subscription, payload).catch((error) => {
              console.error("Error sending notification:", error);
            });
          });
        }
      });
    }
  });
});

// const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server started: ${serverUrl}`);
});
