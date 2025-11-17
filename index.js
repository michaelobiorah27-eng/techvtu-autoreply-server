const express = require("express");
const bodyParser = require("body-parser");
const { google } = require("googleapis");

const app = express();
app.use(bodyParser.json());

const SERVICE_ACCOUNT_JSON = process.env.SERVICE_ACCOUNT_JSON;
const SHEET_ID = process.env.SHEET_ID || "";

let sheetsClient = null;

async function getSheetsClient() {
  if (sheetsClient) return sheetsClient;

  const creds = JSON.parse(SERVICE_ACCOUNT_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"]
  });

    sheetsClient = google.sheets({ version: "v4", auth });
  return sheetsClient;
}

async function readNameBalances() {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "sheet1!A2:B"
  });
  return res.data.values || [];
}

function findBalance(rows, name) {
  const target = name.toLowerCase().trim();
  for (let row of rows) {
    const n = (row[0] || "").toLowerCase().trim();
    if (n === target) return row[1];
  }
  return null;
}

app.get("/", (req, res) => res.json({ status: "ok" }));

app.post("/reply", async (req, res) => {
  try {
    const msg = (req.body.message || "").toLowerCase().trim();

    if (msg.startsWith("balance")) {
      const parts = msg.split(" ");
      if (parts.length < 2) {
        return res.json({ reply: "Please enter: balance <name>" });
      }

      const name = parts[1];
      const rows = await readNameBalances();
      const bal = findBalance(rows, name);

      if (bal !== null) {
        return res.json({ reply: `${name}'s balance is ₦${bal}` });
      }

      return res.json({ reply: "Name not found" });
    }

    if (msg.includes("hello") || msg.includes("hi")) {
      return res.json({ reply: "Hello! How can I help you today?" });
    }

    return res.json({ reply: "Message received ✔️" });

  } catch (err) {
    return res.json({ error: err.toString() });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server started on " + PORT));
