const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());
app.use(express.json());

// Load credentials
const credentials = JSON.parse(
  Buffer.from(process.env.GOOGLE_SERVICE_ACCOUNT_JSON, "base64").toString()
);

const SHEET_ID = process.env.SHEET_ID;
const SHEET_NAME = "sheet1";

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ["https://www.googleapis.com/auth/spreadsheets"]
});

const sheets = google.sheets({ version: "v4", auth });

async function readSheet() {
  const resp = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_NAME}!A2:B`
  });
  return resp.data.values || [];
}

function findBalance(rows, name) {
  const target = name.toLowerCase().trim();
  for (let row of rows) {
    if (!row[0]) continue;
    if (row[0].toLowerCase().trim() === target) {
      return row[1];
    }
  }
  return null;
}

// Default health check
app.get("/", (req, res) => {
  res.send("TechVTU Autoreply Server Running");
});

// MAIN ENDPOINT
app.post("/reply", async (req, res) => {
  try {
    const message = (req.body.message || "").toLowerCase().trim();
    const sender = req.body.sender || "";

    if (!message) return res.json({ reply: "" });  // ignore blank msg

    console.log("Incoming:", sender, message);

    // 💬 Greeting support
    if (message === "hi" || message === "hello") {
      return res.json({ reply: "Hello! How can I assist you today?" });
    }

    // 💰 Balance lookup
    if (message.startsWith("balance")) {
      const parts = message.split(" ");
      if (parts.length < 2) {
        return res.json({ reply: "Usage: balance <name>" });
      }

      const name = parts[1];
      const rows = await readSheet();
      const bal = findBalance(rows, name);

      if (bal) {
        return res.json({ reply: `${name}'s balance is ₦${bal}` });
      } else {
        return res.json({ reply: "Name not found" });
      }
    }

    // ❌ Default reply: return NOTHING
    // This prevents infinite loops
    return res.json({ reply: "" });

  } catch (err) {
    console.error("Server error:", err);
    return res.status(500).json({ reply: "" });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));
