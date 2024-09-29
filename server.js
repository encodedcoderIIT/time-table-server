const express = require("express");
const webpush = require("web-push");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const schedule = require("node-schedule");

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Set static path
app.use(express.static(path.join(__dirname, "client")));
app.use("/images", express.static(path.join(__dirname, "images"))); // Serve images directory

// Body Parser Middleware
app.use(bodyParser.json());

// VAPID keys should be generated only once.
const vapidKeys = webpush.generateVAPIDKeys();

webpush.setVapidDetails(
  "mailto:example@yourdomain.org",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

console.log("Public Key:", vapidKeys.publicKey);
console.log("Private Key:", vapidKeys.privateKey);

// Store subscriptions
let subscriptions = [];

// Subscribe Route
app.post("/subscribe", (req, res) => {
  const subscription = req.body;
  subscriptions.push(subscription);
  res.status(201).json({ success: true });

  // Send a welcome notification
  const payload = JSON.stringify({
    title: "Welcome!",
    body: "You are subscribed | ~encodedcoder",
    icon: "http://localhost:3000/images/encodedcoder.png", // Absolute URL to the icon
    badge: "http://localhost:3000/images/encodedcoder.png", // Absolute URL to the badge
  });

  webpush.sendNotification(subscription, payload).catch((error) => {
    console.error(error.stack);
  });
});

// Function to schedule notifications
function scheduleNotifications() {
  const timetable = parseTimetable();
  timetable.forEach((daySchedule) => {
    daySchedule.classes.forEach((classInfo) => {
      const [startHour, startMinute] = classInfo.time.split(":").map(Number);
      const notificationTime = new Date();
      notificationTime.setHours(startHour);
      notificationTime.setMinutes(startMinute - 10);
      notificationTime.setSeconds(0);

      schedule.scheduleJob(notificationTime, () => {
        const payload = JSON.stringify({
          title: `Upcoming Class`,
          body: `You have ${classInfo.subject} class in the next 10 minutes at ${classInfo.time}.`,
          icon: "http://localhost:3000/images/encodedcoder.png", // Absolute URL to the icon
          badge: "http://localhost:3000/images/encodedcoder.png", // Absolute URL to the badge
        });

        subscriptions.forEach((subscription) => {
          webpush.sendNotification(subscription, payload).catch((error) => {
            console.error(error.stack);
          });
        });
      });
    });
  });
}

// Function to parse timetable from timetable.json
function parseTimetable() {
  const filePath = path.join(__dirname, "timetable.json");
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    return [];
  }
  const json = fs.readFileSync(filePath, "utf8");
  return JSON.parse(json);
}

// Schedule notifications on server start
scheduleNotifications();

app.listen(port, () =>
  console.log(`Server is running at http://localhost:${port}`)
);
