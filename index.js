const express = require("express");
const { google } = require("googleapis");
const fs = require("fs");

const app = express();
app.use(express.json()); // ⭐ REQUIRED to parse JSON body

// Load credentials
const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString()
);

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

// Sheet details
const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "sheet1";

// Health endpoint
app.get("/", (req, res) => {
  res.send("TechVTU Autoreply Server Running");
});

// Main reply endpoint
app.post("/reply", async (req, res) => {
  try {
    console.log("Raw body received:", req.body);

    const { sender, message } = req.body;

    if (!sender || !message) {
      return res.status(400).json({ error: "Missing sender or message" });
    }

    const text = message.toLowerCase().trim();
    let reply = "";

    if (text.startsWith("balance")) {
      reply = await checkBalance(text);
    } else {
      reply = "Message received ✔️";
    }

    res.json({ reply });
  } catch (err) {
    console.error("Server error:", err);
    res.status(500).json({ error: err.toString() });
  }
});

// Balance Lookup
async function checkBalance(message) {
  const parts = message.split(" ");
  if (parts.length < 2) return "Usage: balance <name>";

  const userName = parts[1].toLowerCase();

  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:B`
  });

  const rows = resp.data.values || [];
  for (let row of rows) {
    if (!row[0]) continue;
    if (row[0].toLowerCase() === userName) {
      return `${row[0]}'s balance is ₦${row[1]}`;
    }
  }

  return "Name not found in database.";
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
