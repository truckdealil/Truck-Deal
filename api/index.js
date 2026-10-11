// server.ts
import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
dotenv.config();
var app = express();
var PORT = 3e3;
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});
app.use((req, res, next) => {
  const matchedPath = req.headers["x-matched-path"] || "";
  if (matchedPath.startsWith("/api") && req.url === "/api") {
    req.url = matchedPath;
  } else if (req.url && !req.url.startsWith("/api") && req.url !== "/" && !req.url.startsWith("/index.html") && !req.url.startsWith("/sw.js") && !req.url.startsWith("/manifest.json")) {
    req.url = "/api" + (req.url.startsWith("/") ? req.url : "/" + req.url);
  }
  next();
});
app.get("/sw.js", (req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=UTF-8");
  res.setHeader("Service-Worker-Allowed", "/");
  const pubSw = path.join(process.cwd(), "public", "sw.js");
  const distSw = path.join(process.cwd(), "dist", "sw.js");
  if (fs.existsSync(pubSw)) {
    return res.sendFile(pubSw);
  } else if (fs.existsSync(distSw)) {
    return res.sendFile(distSw);
  }
  return res.status(404).send("// Service worker not found");
});
app.get("/manifest.json", (req, res) => {
  res.setHeader("Content-Type", "application/manifest+json; charset=UTF-8");
  const pubManifest = path.join(process.cwd(), "public", "manifest.json");
  const distManifest = path.join(process.cwd(), "dist", "manifest.json");
  if (fs.existsSync(pubManifest)) {
    return res.sendFile(pubManifest);
  } else if (fs.existsSync(distManifest)) {
    return res.sendFile(distManifest);
  }
  return res.status(404).json({ error: "Manifest not found" });
});
app.use(express.static(path.join(process.cwd(), "public")));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
var IS_VERCEL = Boolean(process.env.VERCEL);
var DATA_DIR = IS_VERCEL ? "/tmp" : path.join(process.cwd(), "data");
var SEED_DATA_DIR = path.join(process.cwd(), "data");
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err) {
  console.warn(`[Storage] Could not create directory ${DATA_DIR}:`, err?.message || err);
}
var MOVES_FILE = path.join(DATA_DIR, "moves.json");
var LEADS_FILE = path.join(DATA_DIR, "leads.json");
var DRIVERS_FILE = path.join(DATA_DIR, "drivers.json");
var SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
var TRUCKS_FILE = path.join(DATA_DIR, "trucks.json");
var SHIFTS_FILE = path.join(DATA_DIR, "shifts.json");
var CHATS_FILE = path.join(DATA_DIR, "chats.json");
var CONCIERGE_CHATS_FILE = path.join(DATA_DIR, "concierge_chats.json");
var inMemoryCache = {};
var movesCache = [];
var driversCache = [];
var leadsCache = [];
var settingsCache = [];
var chatsCache = [];
var conciergeChatsCache = [];
var syncGlobalCache = (fileName, data) => {
  if (fileName === "moves.json") movesCache = data;
  else if (fileName === "drivers.json") driversCache = data;
  else if (fileName === "leads.json") leadsCache = data;
  else if (fileName === "settings.json") settingsCache = data;
  else if (fileName === "chats.json") chatsCache = data;
  else if (fileName === "concierge_chats.json") conciergeChatsCache = data;
};
var readDatabase = (filePath, defaultValue = []) => {
  const fileName = path.basename(filePath);
  if (inMemoryCache[fileName] && inMemoryCache[fileName].length > 0) {
    return inMemoryCache[fileName];
  }
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf-8");
      const parsed = JSON.parse(data);
      inMemoryCache[fileName] = parsed;
      syncGlobalCache(fileName, parsed);
      return parsed;
    }
    if (IS_VERCEL) {
      const seedFilePath = path.join(SEED_DATA_DIR, fileName);
      if (fs.existsSync(seedFilePath)) {
        try {
          const seedContent = fs.readFileSync(seedFilePath, "utf-8");
          const parsed = JSON.parse(seedContent);
          inMemoryCache[fileName] = parsed;
          syncGlobalCache(fileName, parsed);
          try {
            fs.writeFileSync(filePath, seedContent, "utf-8");
          } catch (writeErr) {
            console.warn(`[Storage] Could not seed file ${filePath}:`, writeErr);
          }
          return parsed;
        } catch (seedErr) {
          console.warn(`[Storage] Error loading seed file ${seedFilePath}:`, seedErr);
        }
      }
    }
    inMemoryCache[fileName] = defaultValue;
    syncGlobalCache(fileName, defaultValue);
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    } catch (writeErr) {
      console.warn(`[Storage] Filesystem write ignored for ${filePath}. Retained in memory.`);
    }
    return defaultValue;
  } catch (error) {
    console.error(`[Storage] Error reading database file ${filePath}:`, error?.message || error);
    const fallback = inMemoryCache[fileName] || defaultValue;
    inMemoryCache[fileName] = fallback;
    syncGlobalCache(fileName, fallback);
    return fallback;
  }
};
var writeDatabase = (filePath, data) => {
  const fileName = path.basename(filePath);
  inMemoryCache[fileName] = data;
  syncGlobalCache(fileName, data);
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn(`[Storage] Notice: filesystem write skipped for ${filePath} (${error?.message || error}). Data safely retained in server memory.`);
  }
};
var ai = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log("Gemini AI SDK initialized successfully");
  } catch (err) {
    console.error("Failed to initialize Gemini AI SDK:", err);
  }
} else {
  console.warn("GEMINI_API_KEY is not defined. AI functionality will run in fallback/simulation mode.");
}
var callGeminiWithFallback = async (contents, primaryModel = "gemini-3.8-flash", fallbackModel = "gemini-3.1-flash-lite") => {
  if (!ai) {
    throw new Error("Gemini client not initialized");
  }
  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents
    });
    return response;
  } catch (error) {
    console.warn(`Primary Gemini model (${primaryModel}) failed or unavailable:`, error.message || error);
    try {
      console.log(`Attempting fallback model: ${fallbackModel}...`);
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents
      });
      return response;
    } catch (fallbackError) {
      console.error(`Fallback Gemini model (${fallbackModel}) also failed:`, fallbackError.message || fallbackError);
      throw error;
    }
  }
};
var GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxFuwvPovPthoFJ8E237r8Tdo2PuDbOw9FvjtDCyr2kHgkQX-VG8lglUej7zqFv0FsI/exec";
var sendToGoogleAppsScript = async (payload) => {
  try {
    console.log("Sending data to Google Apps Script Webhook...");
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Google Apps Script response status:", response.status);
  } catch (error) {
    console.error("Error sending webhook to Google Apps Script:", error);
  }
};
var sendToMakeWebhook = async (payload) => {
  let webhookUrl = process.env.MAKE_WEBHOOK_URL;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settingsRaw = fs.readFileSync(SETTINGS_FILE, "utf-8");
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (settings && settings.makeWebhookUrl) {
          webhookUrl = settings.makeWebhookUrl;
        }
      }
    }
  } catch (err) {
    console.error("Error reading settings for Make.com Webhook URL:", err);
  }
  if (!webhookUrl || webhookUrl.trim() === "" || webhookUrl.includes("your-custom-webhook-endpoint")) {
    console.log("--- [WHATSAPP & MAKE.COM AUTOMATION SIMULATOR] ---");
    console.log("Webhook URL not configured. Simulating outgoing WhatsApp notification:");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("--------------------------------------------------");
    return;
  }
  try {
    console.log("Sending webhook payload to Make.com:", webhookUrl);
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    console.log("Make.com response status:", response.status);
  } catch (error) {
    console.error("Error sending webhook to Make.com:", error);
  }
};
var logNotification = (moveId, action, message) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === moveId);
    if (moveIndex !== -1) {
      if (!moves[moveIndex].notificationsLog) {
        moves[moveIndex].notificationsLog = [];
      }
      moves[moveIndex].notificationsLog.unshift({
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action,
        message
      });
      writeDatabase(MOVES_FILE, moves);
    }
  } catch (err) {
    console.error("Error logging notification to move:", err);
  }
};
var generateAIAnalysis = async (moveRequest) => {
  if (!ai) {
    const basePrice = 400 + moveRequest.items.reduce((acc, item) => acc + item.quantity * 45, 0);
    const floorCost = moveRequest.floor * 100;
    const elevatorDiscount = moveRequest.hasElevator ? 0.75 : 1.35;
    const estMin = Math.round((basePrice + floorCost) * elevatorDiscount * 0.9);
    const estMax = Math.round((basePrice + floorCost) * elevatorDiscount * 1.15);
    return {
      estimatedPriceRange: `\u20AA${estMin} - \u20AA${estMax}`,
      difficultyScore: moveRequest.floor > 3 && !moveRequest.hasElevator ? 8 : moveRequest.items.length > 10 ? 6 : 3,
      recommendations: [
        "\u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05E2\u05D8\u05D5\u05E3 \u05DE\u05E8\u05D0\u05E9 \u05DE\u05D5\u05E6\u05E8\u05D9 \u05D7\u05E9\u05DE\u05DC \u05D5\u05E8\u05D4\u05D9\u05D8\u05D9\u05DD \u05D1\u05E0\u05D9\u05D9\u05DC\u05D5\u05DF \u05D1\u05D5\u05E2\u05D5\u05EA (\u05E4\u05E6\u05E4\u05E5)",
        moveRequest.floor > 2 && !moveRequest.hasElevator ? "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DB\u05D5\u05DC\u05DC\u05EA \u05E1\u05D7\u05D9\u05D1\u05D4 \u05E8\u05D2\u05DC\u05D9\u05EA \u05DC\u05E7\u05D5\u05DE\u05D4 \u05D2\u05D1\u05D5\u05D4\u05D4 \u05DC\u05DC\u05D0 \u05DE\u05E2\u05DC\u05D9\u05EA - \u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D5\u05D5\u05D3\u05D0 \u05D4\u05D2\u05E2\u05EA 3 \u05E1\u05D1\u05DC\u05D9\u05DD \u05DC\u05E4\u05D7\u05D5\u05EA" : "\u05D4\u05D1\u05E0\u05D9\u05D9\u05DF \u05DE\u05E6\u05D5\u05D9\u05D3 \u05D1\u05DE\u05E2\u05DC\u05D9\u05EA - \u05D9\u05E9 \u05DC\u05D5\u05D5\u05D3\u05D0 \u05E9\u05D4\u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D4\u05DB\u05D1\u05D3\u05D9\u05DD \u05E0\u05DB\u05E0\u05E1\u05D9\u05DD \u05D1\u05DE\u05E2\u05DC\u05D9\u05EA \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9\u05EA",
        moveRequest.craneNeeded === "yes" ? "\u05E0\u05D3\u05E8\u05E9 \u05EA\u05D9\u05D0\u05D5\u05DD \u05DE\u05E0\u05D5\u05E3 \u05D7\u05D9\u05E6\u05D5\u05E0\u05D9 \u05DE\u05E8\u05D0\u05E9 \u05E2\u05DD \u05D4\u05DE\u05D5\u05E2\u05E6\u05D4/\u05D7\u05E0\u05D9\u05D9\u05D4 \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9\u05EA" : "\u05DC\u05D0 \u05E6\u05D5\u05D9\u05DF \u05E6\u05D5\u05E8\u05DA \u05D1\u05DE\u05E0\u05D5\u05E3, \u05D0\u05DA \u05D9\u05E9 \u05DC\u05E9\u05D9\u05DD \u05DC\u05D1 \u05DC\u05DE\u05D9\u05D3\u05D5\u05EA \u05D7\u05D3\u05E8 \u05D4\u05DE\u05D3\u05E8\u05D2\u05D5\u05EA"
      ],
      summary: `\u05D4\u05D5\u05D1\u05DC\u05EA ${moveRequest.moveType === "apartment" ? "\u05D3\u05D9\u05E8\u05D4" : moveRequest.moveType === "office" ? "\u05DE\u05E9\u05E8\u05D3" : "\u05DE\u05E9\u05DC\u05D5\u05D7"} \u05DE${moveRequest.originAddress} \u05D0\u05DC ${moveRequest.destAddress}. \u05DB\u05DE\u05D5\u05EA \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD: ${moveRequest.items.reduce((acc, i) => acc + i.quantity, 0)}.`
    };
  }
  try {
    const itemsDescription = moveRequest.items.map((item) => `- ${item.name}: ${item.quantity} \u05D9\u05D7\u05D9\u05D3\u05D5\u05EA`).join("\n");
    const prompt = `
\u05D0\u05EA\u05D4 \u05DE\u05E2\u05E8\u05D9\u05DA \u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9 \u05D5\u05D7\u05DB\u05DD \u05E9\u05DC \u05D7\u05D1\u05E8\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D5\u05EA "Truk Dealil IL" (\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il).
\u05EA\u05E4\u05E7\u05D9\u05D3\u05DA \u05DC\u05E0\u05EA\u05D7 \u05D0\u05EA \u05E4\u05E8\u05D8\u05D9 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D4\u05D1\u05D0\u05D9\u05DD \u05D5\u05DC\u05E1\u05E4\u05E7 \u05D4\u05E6\u05E2\u05EA \u05DE\u05D7\u05D9\u05E8 \u05D7\u05DB\u05DE\u05D4, \u05E0\u05D9\u05EA\u05D5\u05D7 \u05E7\u05D5\u05E9\u05D9 \u05D5\u05D4\u05DE\u05DC\u05E6\u05D5\u05EA \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05D5\u05EA \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05DE\u05DC\u05D0\u05D4.

\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4:
- \u05E1\u05D5\u05D2 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4: ${moveRequest.moveType} (apartment=\u05D3\u05D9\u05E8\u05D4, office=\u05DE\u05E9\u05E8\u05D3, delivery=\u05DE\u05E9\u05DC\u05D5\u05D7)
- \u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D5\u05E6\u05D0: ${moveRequest.originAddress}
- \u05DB\u05EA\u05D5\u05D1\u05EA \u05D9\u05E2\u05D3: ${moveRequest.destAddress}
- \u05E7\u05D5\u05DE\u05D4: ${moveRequest.floor}
- \u05D9\u05E9 \u05DE\u05E2\u05DC\u05D9\u05EA? ${moveRequest.hasElevator ? "\u05DB\u05DF" : "\u05DC\u05D0"}
- \u05D4\u05D0\u05DD \u05DE\u05E7\u05E8\u05E8 \u05E0\u05DB\u05E0\u05E1 \u05D1\u05DE\u05E2\u05DC\u05D9\u05EA? ${moveRequest.elevatorDetails.fridgeFits ? "\u05DB\u05DF" : "\u05DC\u05D0"}
- \u05D4\u05D0\u05DD \u05E1\u05E4\u05D4 \u05E0\u05DB\u05E0\u05E1\u05EA \u05D1\u05DE\u05E2\u05DC\u05D9\u05EA? ${moveRequest.elevatorDetails.sofaFits ? "\u05DB\u05DF" : "\u05DC\u05D0"}
- \u05E0\u05D2\u05D9\u05E9\u05D5\u05EA \u05D7\u05E0\u05D9\u05D9\u05D4 \u05DC\u05DE\u05E9\u05D0\u05D9\u05EA: ${moveRequest.truckAccess} (easy=\u05E7\u05DC\u05D4, medium=\u05D1\u05D9\u05E0\u05D5\u05E0\u05D9\u05EA, difficult=\u05E7\u05E9\u05D4, no_parking=\u05D0\u05D9\u05DF \u05D7\u05E0\u05D9\u05D9\u05D4 \u05E7\u05E8\u05D5\u05D1\u05D4)
- \u05E6\u05D5\u05E8\u05DA \u05D1\u05DE\u05E0\u05D5\u05E3: ${moveRequest.craneNeeded} (yes=\u05DB\u05DF, no=\u05DC\u05D0, dont_know=\u05DC\u05D0 \u05D9\u05D5\u05D3\u05E2)
- \u05D4\u05E2\u05E8\u05D5\u05EA \u05DC\u05E7\u05D5\u05D7: ${moveRequest.notes || "\u05D0\u05D9\u05DF"}

\u05E8\u05E9\u05D9\u05DE\u05EA \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4:
${itemsDescription}

\u05D4\u05D7\u05D6\u05E8 \u05EA\u05E9\u05D5\u05D1\u05D4 \u05D0\u05DA \u05D5\u05E8\u05E7 \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 JSON \u05EA\u05E7\u05E0\u05D9 \u05D4\u05D1\u05D0 (\u05D0\u05DC \u05EA\u05D5\u05E1\u05D9\u05E3 \u05E9\u05D5\u05DD \u05DE\u05D9\u05DC\u05D4 \u05DE\u05D7\u05D5\u05E5 \u05DC-JSON, \u05D0\u05DC \u05EA\u05E2\u05D8\u05D5\u05E3 \u05D1\u05E1\u05D9\u05DE\u05D5\u05E0\u05D9 markdown \u05DB\u05DE\u05D5 \`\`\`json):
{
  "estimatedPriceRange": "\u05D8\u05D5\u05D5\u05D7 \u05DE\u05D7\u05D9\u05E8 \u05DE\u05D5\u05E2\u05E8\u05DA \u05D1\u05E9\u05E7\u05DC\u05D9\u05DD, \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4 '\u20AA1,200 - \u20AA1,600'",
  "difficultyScore": \u05DE\u05E1\u05E4\u05E8 \u05D1\u05D9\u05DF 1 \u05DC-10 \u05D4\u05DE\u05D9\u05D9\u05E6\u05D2 \u05D0\u05EA \u05E8\u05DE\u05EA \u05E7\u05D5\u05E9\u05D9 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4,
  "recommendations": ["\u05E8\u05E9\u05D9\u05DE\u05D4 \u05E9\u05DC 3-4 \u05D4\u05DE\u05DC\u05E6\u05D5\u05EA \u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9\u05D5\u05EA \u05D7\u05E9\u05D5\u05D1\u05D5\u05EA \u05D5\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05DC\u05E0\u05D4\u05D2 \u05D0\u05D5 \u05DC\u05DC\u05E7\u05D5\u05D7 \u05DC\u05E9\u05DE\u05D9\u05E8\u05D4 \u05E2\u05DC \u05D4\u05E6\u05D9\u05D5\u05D3 \u05D5\u05D9\u05D9\u05E2\u05D5\u05DC \u05D4\u05E2\u05D1\u05D5\u05D3\u05D4"],
  "summary": "\u05E1\u05D9\u05DB\u05D5\u05DD \u05EA\u05DE\u05E6\u05D9\u05EA\u05D9 \u05D5\u05DE\u05E7\u05E6\u05D5\u05E2\u05D9 \u05E9\u05DC \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA"
}
`;
    const response = await callGeminiWithFallback(prompt);
    const responseText = response.text || "";
    const cleanJson = responseText.replace(/```json/g, "").replace(/```/g, "").trim();
    const analysis = JSON.parse(cleanJson);
    return analysis;
  } catch (error) {
    console.error("Error generating AI quote from Gemini:", error);
    return {
      estimatedPriceRange: "\u20AA800 - \u20AA1,500",
      difficultyScore: 5,
      recommendations: [
        "\u05DE\u05D5\u05DE\u05DC\u05E5 \u05DC\u05D0\u05E8\u05D5\u05D6 \u05E9\u05D1\u05D9\u05E8\u05D9\u05DD \u05D1\u05D0\u05E8\u05D2\u05D6\u05D9\u05DD \u05DE\u05E8\u05D5\u05E4\u05D3\u05D9\u05DD",
        "\u05D9\u05E9 \u05DC\u05D1\u05D3\u05D5\u05E7 \u05D2\u05D9\u05E9\u05EA \u05D7\u05E0\u05D9\u05D9\u05D4 \u05E0\u05D5\u05D7\u05D4 \u05D1\u05D9\u05D5\u05DD \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D1\u05E9\u05EA\u05D9 \u05D4\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA"
      ],
      summary: "\u05D4\u05D5\u05D1\u05DC\u05EA \u05E6\u05D9\u05D5\u05D3 - \u05E0\u05D9\u05EA\u05D5\u05D7 \u05D1\u05E1\u05D9\u05E1\u05D9"
    };
  }
};
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
var getSeedMoves = () => {
  const now = /* @__PURE__ */ new Date();
  const todayStr = now.toISOString().split("T")[0];
  const in45Min = new Date(now.getTime() + 45 * 60 * 1e3);
  const time1 = `${in45Min.getHours().toString().padStart(2, "0")}:${in45Min.getMinutes().toString().padStart(2, "0")}`;
  const in3Hours = new Date(now.getTime() + 3.5 * 60 * 60 * 1e3);
  const time2 = `${in3Hours.getHours().toString().padStart(2, "0")}:${in3Hours.getMinutes().toString().padStart(2, "0")}`;
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
  const tomorrowStr = tomorrow.toISOString().split("T")[0];
  return [
    {
      id: "move_urgent45m",
      clientName: "\u05E8\u05D5\u05E0\u05DF \u05D0\u05D1\u05E8\u05D4\u05DD",
      clientPhone: "050-1122334",
      clientEmail: "ronen.moving@gmail.com",
      companyName: "\u05E1\u05D8\u05D0\u05E8\u05D8\u05D0\u05E4 \u05D8\u05E7 \u05E1\u05D5\u05DC\u05D5\u05E9\u05E0\u05E1",
      originAddress: "\u05D0\u05D1\u05DF \u05D2\u05D1\u05D9\u05E8\u05D5\u05DC 104, \u05EA\u05DC \u05D0\u05D1\u05D9\u05D1",
      destAddress: "\u05E8\u05D5\u05D8\u05E9\u05D9\u05DC\u05D3 45, \u05E8\u05D0\u05E9\u05D5\u05DF \u05DC\u05E6\u05D9\u05D5\u05DF",
      moveDate: todayStr,
      moveTime: time1,
      moveType: "apartment",
      floor: 3,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: true },
      truckAccess: "easy",
      craneNeeded: "no",
      items: [
        { id: "sofa_3", name: "\u05E1\u05E4\u05D4 3 \u05DE\u05D5\u05E9\u05D1\u05D9\u05DD", category: "furniture", quantity: 1 },
        { id: "double_bed", name: "\u05DE\u05D9\u05D8\u05D4 \u05D6\u05D5\u05D2\u05D9\u05EA + \u05DE\u05D6\u05E8\u05DF", category: "furniture", quantity: 1 },
        { id: "fridge_big", name: "\u05DE\u05E7\u05E8\u05E8 \u05D2\u05D3\u05D5\u05DC", category: "appliances", quantity: 1 },
        { id: "boxes", name: "\u05D0\u05E8\u05D2\u05D6\u05D9\u05DD \u05D0\u05E8\u05D5\u05D6\u05D9\u05DD", category: "boxes", quantity: 20 }
      ],
      images: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "approved_for_driver",
      paymentStatus: "paid_deposit",
      clientApprovedForBilling: true,
      assignedDriverId: "driver_1",
      assignedDriverName: "\u05D9\u05D5\u05E1\u05D9 \u05DC\u05D5\u05D9",
      assignedDriverPhone: "052-8765432",
      assignedTruckModel: "\u05DE\u05E9\u05D0\u05D9\u05EA 7.5 \u05D8\u05D5\u05DF + \u05E8\u05DE\u05E4\u05D4 \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA",
      assignedTruckLicense: "88-442-19",
      driverBids: [
        {
          id: "bid_1",
          driverName: "\u05D9\u05D5\u05E1\u05D9 \u05DC\u05D5\u05D9",
          driverPhone: "052-8765432",
          bidAmount: 1850,
          estimatedDuration: "3-4 \u05E9\u05E2\u05D5\u05EA",
          submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
          status: "approved"
        }
      ],
      finalApprovedBidId: "bid_1",
      aiAnalysis: {
        estimatedPriceRange: "1,800 - 2,200 \u20AA",
        difficultyScore: 4,
        recommendations: ["\u05E6\u05D9\u05D5\u05D3 \u05E7\u05E9\u05D9\u05E8\u05D4 \u05DE\u05DC\u05D0", "\u05E2\u05D2\u05DC\u05EA \u05E9\u05D9\u05E0\u05D5\u05E2 \u05DC\u05E8\u05DE\u05E4\u05D4"],
        summary: "\u05D4\u05D5\u05D1\u05DC\u05EA \u05D3\u05D9\u05E8\u05EA 2 \u05D7\u05D3\u05E8\u05D9\u05DD \u05E7\u05DC\u05D0\u05E1\u05D9\u05EA \u05E2\u05DD \u05DE\u05E2\u05DC\u05D9\u05EA \u05D2\u05D3\u05D5\u05DC\u05D4 \u05D5\u05E0\u05D2\u05D9\u05E9\u05D5\u05EA \u05DE\u05E9\u05D0\u05D9\u05EA \u05E0\u05D5\u05D7\u05D4"
      }
    },
    {
      id: "move_afternoon3h",
      clientName: "\u05E9\u05D9\u05E8\u05D4 \u05DB\u05D4\u05DF",
      clientPhone: "054-9876543",
      clientEmail: "shira.cohen@gmail.com",
      originAddress: "\u05D5\u05D9\u05E6\u05DE\u05DF 22, \u05D2\u05D1\u05E2\u05EA\u05D9\u05D9\u05DD",
      destAddress: "\u05D4\u05E8\u05E6\u05DC 80, \u05E8\u05DE\u05EA \u05D2\u05DF",
      moveDate: todayStr,
      moveTime: time2,
      moveType: "apartment",
      floor: 4,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: false },
      truckAccess: "medium",
      craneNeeded: "no",
      items: [
        { id: "dining_table", name: "\u05E9\u05D5\u05DC\u05D7\u05DF \u05D0\u05D5\u05DB\u05DC + \u05DB\u05D9\u05E1\u05D0\u05D5\u05EA", category: "furniture", quantity: 1 },
        { id: "wardrobe_big", name: "\u05D0\u05E8\u05D5\u05DF \u05D1\u05D2\u05D3\u05D9\u05DD \u05D2\u05D3\u05D5\u05DC", category: "furniture", quantity: 1 },
        { id: "boxes", name: "\u05D0\u05E8\u05D2\u05D6\u05D9\u05DD", category: "boxes", quantity: 15 }
      ],
      images: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "approved_for_driver",
      paymentStatus: "paid_full",
      clientApprovedForBilling: true,
      assignedDriverId: "driver_1",
      assignedDriverName: "\u05D9\u05D5\u05E1\u05D9 \u05DC\u05D5\u05D9",
      assignedDriverPhone: "052-8765432",
      assignedTruckModel: "\u05DE\u05E9\u05D0\u05D9\u05EA 7.5 \u05D8\u05D5\u05DF + \u05E8\u05DE\u05E4\u05D4 \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA",
      assignedTruckLicense: "88-442-19",
      driverBids: [],
      aiAnalysis: {
        estimatedPriceRange: "1,500 - 1,900 \u20AA",
        difficultyScore: 5,
        recommendations: ["\u05E4\u05D9\u05E8\u05D5\u05E7 \u05D5\u05D4\u05E8\u05DB\u05D1\u05EA \u05D0\u05E8\u05D5\u05DF \u05DE\u05D5\u05DE\u05DC\u05E6\u05EA"],
        summary: "\u05D4\u05D5\u05D1\u05DC\u05EA \u05D7\u05D3\u05E8 \u05E9\u05D9\u05E0\u05D4 \u05D5\u05E4\u05D9\u05E0\u05EA \u05D0\u05D5\u05DB\u05DC"
      }
    },
    {
      id: "move_tomorrow",
      clientName: "\u05D3\u05E0\u05D9\u05D0\u05DC \u05D2\u05E8\u05D9\u05E0\u05D1\u05E8\u05D2",
      clientPhone: "052-3344556",
      clientEmail: "daniel.g@techcorp.co.il",
      companyName: "\u05D2\u05E8\u05D9\u05E0\u05D1\u05E8\u05D2 \u05D9\u05D9\u05E2\u05D5\u05E5 \u05E2\u05E1\u05E7\u05D9",
      originAddress: "\u05DE\u05E0\u05D7\u05DD \u05D1\u05D2\u05D9\u05DF 144, \u05EA\u05DC \u05D0\u05D1\u05D9\u05D1",
      destAddress: "\u05E9\u05D3\u05E8\u05D5\u05EA \u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD 18, \u05D9\u05E4\u05D5",
      moveDate: tomorrowStr,
      moveTime: "09:00",
      moveType: "office",
      floor: 8,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: true },
      truckAccess: "easy",
      craneNeeded: "no",
      items: [
        { id: "desk", name: "\u05E9\u05D5\u05DC\u05D7\u05DF \u05DB\u05EA\u05D9\u05D1\u05D4 / \u05E2\u05D1\u05D5\u05D3\u05D4", category: "furniture", quantity: 6 },
        { id: "boxes", name: "\u05D0\u05E8\u05D2\u05D6\u05D9 \u05E7\u05DC\u05E1\u05E8\u05D9\u05DD \u05D5\u05E6\u05D9\u05D5\u05D3", category: "boxes", quantity: 30 }
      ],
      images: [],
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "approved_for_driver",
      paymentStatus: "paid_deposit",
      clientApprovedForBilling: true,
      assignedDriverId: "driver_2",
      assignedDriverName: "\u05D0\u05D1\u05D9 \u05DB\u05D4\u05DF",
      assignedDriverPhone: "054-1234567",
      assignedTruckModel: "\u05DE\u05E9\u05D0\u05D9\u05EA 12 \u05D8\u05D5\u05DF + \u05DE\u05E0\u05D5\u05E3 \u05E7\u05D1\u05D5\u05E2\u05D4 \u05E7\u05D5\u05DE\u05D4 6",
      assignedTruckLicense: "12-345-67",
      driverBids: [],
      aiAnalysis: {
        estimatedPriceRange: "2,800 - 3,500 \u20AA",
        difficultyScore: 6,
        recommendations: ["\u05E9\u05D9\u05DE\u05D5\u05E9 \u05D1\u05E2\u05D2\u05DC\u05D5\u05EA \u05DE\u05E9\u05D0 \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9\u05D5\u05EA \u05DC\u05DE\u05E9\u05E8\u05D3"],
        summary: "\u05D4\u05D5\u05D1\u05DC\u05EA \u05DE\u05E9\u05E8\u05D3 6 \u05E2\u05DE\u05D3\u05D5\u05EA \u05E2\u05D1\u05D5\u05D3\u05D4"
      }
    }
  ];
};
app.get("/api/moves", (req, res) => {
  let moves = readDatabase(MOVES_FILE);
  if (!moves || moves.length === 0) {
    moves = getSeedMoves();
    writeDatabase(MOVES_FILE, moves);
  }
  res.json(moves);
});
app.get("/api/moves/:id", (req, res) => {
  const moves = readDatabase(MOVES_FILE);
  let move = moves.find((m) => m.id === req.params.id);
  if (!move) {
    if (req.params.id && req.params.id.startsWith("TRK-")) {
      move = {
        id: req.params.id,
        clientName: "\u05DC\u05E7\u05D5\u05D7 Truk Dealil IL",
        clientPhone: "050-1234567",
        clientEmail: "truck.dealil@gmail.com",
        companyName: "",
        originAddress: "\u05D0\u05D6\u05D5\u05E8 \u05D4\u05DE\u05E8\u05DB\u05D6, \u05E7\u05D5\u05DE\u05D4 2",
        destAddress: "\u05D9\u05E2\u05D3 \u05E4\u05E8\u05D9\u05E7\u05D4, \u05E7\u05D5\u05DE\u05D4 2",
        moveDate: new Date(Date.now() + 864e5).toISOString().split("T")[0],
        moveTime: "10:00",
        moveType: "apartment",
        floor: 2,
        hasElevator: true,
        elevatorDetails: { sofaFits: true, fridgeFits: true },
        truckAccess: "easy",
        craneNeeded: "no",
        items: [
          { id: "item_disp_1", name: "\u05EA\u05DB\u05D5\u05DC\u05EA \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DC\u05E4\u05D9 \u05D0\u05E4\u05D9\u05D5\u05DF \u05E1\u05D3\u05E8\u05DF AI", category: "furniture", quantity: 1 }
        ],
        images: [],
        createdAt: (/* @__PURE__ */ new Date()).toISOString(),
        status: "bidding",
        paymentStatus: "pending_deposit",
        clientApprovedForBilling: false,
        driverBids: [],
        aiAnalysis: {
          estimatedPriceRange: "\u20AA2,000 - \u20AA2,800",
          difficultyScore: 5,
          recommendations: ["\u05DE\u05DB\u05E8\u05D6 \u05E4\u05EA\u05D5\u05D7 \u05DC\u05E0\u05D4\u05D2\u05D9\u05DD \u05D5\u05E1\u05E4\u05E7\u05D9\u05DD \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05DE\u05E2\u05E7\u05D1 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA \u05E4\u05E2\u05D9\u05DC"],
          summary: `\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05DB\u05E8\u05D6 [${req.params.id}] \u05E9\u05D5\u05D3\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`
        }
      };
      moves.push(move);
      writeDatabase(MOVES_FILE, moves);
    } else {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
  }
  const responseMove = { ...move };
  const maskAddress = (addr) => {
    if (!addr) return "";
    const parts = addr.split(",");
    if (parts.length > 0) {
      return `${parts[0].trim()} (\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05DC\u05D0\u05D4 \u05D7\u05E1\u05D5\u05DE\u05D4 - \u05EA\u05D9\u05D7\u05E9\u05E3 \u05DC\u05D0\u05D7\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05DE\u05E7\u05D3\u05DE\u05D4 \u{1F512})`;
    }
    return "\u05DE\u05D9\u05E7\u05D5\u05DD \u05E0\u05E2\u05D5\u05DC - \u05DE\u05D5\u05D2\u05DF \u05DE\u05E4\u05E0\u05D9 \u05DE\u05E2\u05E7\u05E3 \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4";
  };
  const isLocked = responseMove.paymentStatus === "pending_payment" && req.query.role !== "admin";
  if (isLocked) {
    responseMove.clientPhone = "\u05E0\u05E2\u05D5\u05DC - \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D4\u05E1\u05D3\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05DE\u05E7\u05D3\u05DE\u05D4 \u05E2\u05F4\u05D9 \u05D4\u05DC\u05E7\u05D5\u05D7 \u{1F512}";
    responseMove.clientEmail = "\u05E0\u05E2\u05D5\u05DC - \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05D4\u05E1\u05D3\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05DE\u05E7\u05D3\u05DE\u05D4 \u05E2\u05F4\u05D9 \u05D4\u05DC\u05E7\u05D5\u05D7 \u{1F512}";
    responseMove.clientName = responseMove.clientName ? `${responseMove.clientName.split(" ")[0]} (\u05E9\u05DD \u05DE\u05E9\u05E4\u05D7\u05D4 \u05E0\u05E2\u05D5\u05DC)` : "\u05DC\u05E7\u05D5\u05D7 \u05DE\u05D5\u05D2\u05DF";
    responseMove.originAddress = maskAddress(responseMove.originAddress);
    responseMove.destAddress = maskAddress(responseMove.destAddress);
    responseMove.isPaymentLocked = true;
  } else {
    responseMove.isPaymentLocked = false;
  }
  res.json(responseMove);
});
app.post("/api/moves", async (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const newMove = {
      id: "move_" + Math.random().toString(36).substr(2, 9),
      ...req.body,
      createdAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "new",
      // starts as new
      paymentStatus: "pending_payment",
      clientApprovedForBilling: false,
      // Must be approved by Admin later
      driverBids: []
    };
    console.log("Running smart AI quotation generation...");
    const aiAnalysis = await generateAIAnalysis(newMove);
    newMove.aiAnalysis = aiAnalysis;
    moves.unshift(newMove);
    writeDatabase(MOVES_FILE, moves);
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const bidLink = `${appUrl}?view=driver&moveId=${newMove.id}`;
    const appsScriptPayload = {
      action: "create_move",
      moveId: newMove.id,
      clientName: newMove.clientName,
      clientPhone: newMove.clientPhone,
      clientEmail: newMove.clientEmail,
      originAddress: newMove.originAddress,
      destAddress: newMove.destAddress,
      moveDate: newMove.moveDate,
      moveTime: newMove.moveTime,
      moveType: newMove.moveType,
      floor: newMove.floor,
      hasElevator: newMove.hasElevator,
      truckAccess: newMove.truckAccess,
      craneNeeded: newMove.craneNeeded,
      items: newMove.items,
      notes: newMove.notes || "",
      imagesCount: newMove.images ? newMove.images.length : 0,
      images: newMove.images || [],
      // base64 arrays to save in Google Drive
      estimatedPriceRange: aiAnalysis.estimatedPriceRange,
      difficultyScore: aiAnalysis.difficultyScore,
      summary: aiAnalysis.summary,
      bidLink,
      googleDriveFolderId: "1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG"
    };
    sendToGoogleAppsScript(appsScriptPayload);
    sendToMakeWebhook({
      moveId: newMove.id,
      clientName: newMove.clientName,
      origin: newMove.originAddress,
      destination: newMove.destAddress,
      craneNeeded: newMove.craneNeeded === "yes" ? "\u05DB\u05DF" : newMove.craneNeeded === "no" ? "\u05DC\u05D0" : "\u05DC\u05D0 \u05D9\u05D3\u05D5\u05E2",
      driverOfferLink: `https://truk-dealil.il/driver/quote/${newMove.id}`,
      message: `\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D7\u05D3\u05E9\u05D4 \u05E4\u05D5\u05E8\u05E1\u05DE\u05D4 \u05D1-Truk Dealil IL! \u{1F69A}

\u05DE:${newMove.originAddress} \u05DC:${newMove.destAddress}
\u05EA\u05D0\u05E8\u05D9\u05DA: ${newMove.moveDate}
\u05E4\u05E8\u05D8\u05D9\u05DD: ${aiAnalysis.summary}

\u05DC\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05EA \u05DE\u05D7\u05D9\u05E8 \u05DC\u05E0\u05D4\u05D2 \u05DC\u05D7\u05E5 \u05E2\u05DC \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8:
${bidLink}`
    });
    res.status(201).json(newMove);
  } catch (error) {
    console.error("Error creating move request:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D1\u05E7\u05E9\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4" });
  }
});
app.post("/api/moves/:id/bids", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { driverName, driverPhone, bidAmount, estimatedDuration, notes } = req.body;
    if (!driverName || !driverPhone || !bidAmount) {
      return res.status(400).json({ error: "\u05E0\u05D0 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05EA \u05DB\u05DC \u05E9\u05D3\u05D5\u05EA \u05D4\u05D7\u05D5\u05D1\u05D4 \u05DC\u05D4\u05D2\u05E9\u05EA \u05D4\u05D4\u05E6\u05E2\u05D4" });
    }
    const newBid = {
      id: "bid_" + Math.random().toString(36).substr(2, 9),
      driverName,
      driverPhone,
      bidAmount: Number(bidAmount),
      estimatedDuration,
      notes,
      submittedAt: (/* @__PURE__ */ new Date()).toISOString(),
      status: "pending"
    };
    moves[moveIndex].driverBids.push(newBid);
    if (moves[moveIndex].status === "new") {
      moves[moveIndex].status = "bidding";
    }
    writeDatabase(MOVES_FILE, moves);
    sendToGoogleAppsScript({
      action: "add_bid",
      moveId: req.params.id,
      bidId: newBid.id,
      driverName: newBid.driverName,
      driverPhone: newBid.driverPhone,
      bidAmount: newBid.bidAmount,
      notes: newBid.notes || ""
    });
    res.status(201).json(newBid);
  } catch (error) {
    console.error("Error submitting driver bid:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05EA \u05D4\u05DE\u05D7\u05D9\u05E8 \u05DC\u05E0\u05D4\u05D2" });
  }
});
app.post("/api/moves/:id/bids/:bidId/approve", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const move = moves[moveIndex];
    const bidIndex = move.driverBids.findIndex((b) => b.id === req.params.bidId);
    if (bidIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05E6\u05E2\u05EA \u05D4\u05E0\u05D4\u05D2 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    move.driverBids.forEach((b, index) => {
      move.driverBids[index].status = index === bidIndex ? "approved" : "rejected";
    });
    move.finalApprovedBidId = req.params.bidId;
    move.status = "Approved";
    writeDatabase(MOVES_FILE, moves);
    const approvedBid = move.driverBids[bidIndex];
    sendToGoogleAppsScript({
      action: "approve_bid",
      moveId: move.id,
      bidId: approvedBid.id,
      driverName: approvedBid.driverName,
      driverPhone: approvedBid.driverPhone,
      bidAmount: approvedBid.bidAmount
    });
    const messageText = `\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05DC\u05DA \u05D0\u05D5\u05E9\u05E8\u05D4! \u05D4\u05E0\u05D4\u05D2 \u05E9\u05E0\u05D1\u05D7\u05E8 \u05D4\u05D5\u05D0 ${approvedBid.driverName}, \u05DE\u05D7\u05D9\u05E8 \u05E1\u05D5\u05E4\u05D9: \u20AA${approvedBid.bidAmount}. \u05DC\u05D7\u05E5 \u05DB\u05D0\u05DF \u05DC\u05D1\u05D9\u05E6\u05D5\u05E2 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05D0\u05D1\u05D8\u05D7\u05EA \u05D4\u05D4\u05D6\u05DE\u05E0\u05D4`;
    sendToMakeWebhook({
      action: "bid_approved_notify_client",
      moveId: move.id,
      clientName: move.clientName,
      clientPhone: move.clientPhone,
      approvedPrice: approvedBid.bidAmount,
      driverName: approvedBid.driverName,
      message: messageText
    });
    logNotification(move.id, "bid_approved", `\u05D4\u05E6\u05E2\u05EA \u05D4\u05DE\u05D7\u05D9\u05E8 \u05E9\u05DC \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC ${approvedBid.driverName} \u05E2\u05DC \u05E1\u05DA \u20AA${approvedBid.bidAmount} \u05D0\u05D5\u05E9\u05E8\u05D4 \u05E2\u05F4\u05D9 \u05D4\u05DE\u05E0\u05D4\u05DC. \u05E0\u05E9\u05DC\u05D7\u05D4 \u05D4\u05D5\u05D3\u05E2\u05EA WhatsApp \u05DC\u05DC\u05E7\u05D5\u05D7 \u05E2\u05DD \u05E7\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E2\u05E7\u05D1 \u05D7\u05D9 \u05D5\u05D4\u05E1\u05D3\u05E8\u05EA \u05EA\u05E9\u05DC\u05D5\u05DD.`);
    res.json({ success: true, move });
  } catch (error) {
    console.error("Error approving driver bid:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05E6\u05E2\u05EA \u05D4\u05DE\u05D7\u05D9\u05E8" });
  }
});
app.post("/api/moves/:id/match-driver", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { driverId, driverName, driverPhone, bidAmount, clientSignature } = req.body;
    const move = moves[moveIndex];
    const matchedBid = {
      id: "bid_" + Math.random().toString(36).substr(2, 9),
      driverId: driverId || "driver_matched",
      driverName: driverName || "\u05D7\u05DB\u05DE\u05EA \u05D5\u05E2\u05D0\u05DC\u05D9",
      driverPhone: driverPhone || "050-1234567",
      bidAmount: Number(bidAmount) || 1850,
      estimatedDuration: "3-4 \u05E9\u05E2\u05D5\u05EA",
      notes: "\u05E9\u05D9\u05D3\u05D5\u05DA \u05D7\u05DB\u05DD \u05DE\u05D4\u05D9\u05E8 - \u05D4\u05E6\u05E2\u05EA \u05DE\u05D7\u05D9\u05E8 \u05D7\u05EA\u05D5\u05DE\u05D4 \u05D5\u05DE\u05D0\u05D5\u05E9\u05E8\u05EA \u05E2\u05F4\u05D9 \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA.",
      status: "approved",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    move.driverBids = [matchedBid];
    move.finalApprovedBidId = matchedBid.id;
    move.status = "Approved";
    move.clientSignature = clientSignature || "\u05E0\u05D7\u05EA\u05DD \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D1\u05D8\u05D0\u05E6\u05F3";
    move.assignedDriverId = driverId || "driver_matched";
    move.assignedDriverName = driverName || "\u05D7\u05DB\u05DE\u05EA \u05D5\u05E2\u05D0\u05DC\u05D9";
    move.assignedDriverPhone = driverPhone || "050-1234567";
    writeDatabase(MOVES_FILE, moves);
    sendToGoogleAppsScript({
      action: "client_match_and_sign",
      moveId: move.id,
      driverName: matchedBid.driverName,
      bidAmount: matchedBid.bidAmount,
      signature: move.clientSignature
    });
    sendToMakeWebhook({
      action: "driver_matched_and_signed",
      moveId: move.id,
      clientName: move.clientName,
      driverName: matchedBid.driverName,
      approvedPrice: matchedBid.bidAmount,
      message: `\u05E9\u05D9\u05D3\u05D5\u05DA \u05E0\u05D4\u05D2 \u05D5\u05D4\u05E6\u05E2\u05D4 \u05D7\u05EA\u05D5\u05DE\u05D4 \u05D4\u05EA\u05E7\u05D1\u05DC\u05D5 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 #${move.id}! \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC \u05D4\u05E0\u05D1\u05D7\u05E8: ${matchedBid.driverName}, \u05DE\u05D7\u05D9\u05E8: \u20AA${matchedBid.bidAmount}.`
    });
    logNotification(move.id, "driver_matched_signed", `\u05E9\u05D9\u05D3\u05D5\u05DA \u05E0\u05D4\u05D2 \u05D1\u05D5\u05E6\u05E2 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D0\u05D9\u05E9\u05E8 \u05D5\u05D7\u05EA\u05DD \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05E2\u05DC \u05D4\u05E6\u05E2\u05EA \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC ${matchedBid.driverName} \u05E2\u05DC \u05E1\u05DA \u20AA${matchedBid.bidAmount}.`);
    res.json({ success: true, move });
  } catch (error) {
    console.error("Error matching driver & signing proposal:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05D3\u05D5\u05DA \u05D4\u05E0\u05D4\u05D2 \u05D5\u05D1\u05D7\u05EA\u05D9\u05DE\u05D4 \u05D4\u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA" });
  }
});
app.post("/api/moves/:id/payment", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { paymentStatus, clientApprovedForBilling, status } = req.body;
    const targetStatus = status || moves[moveIndex].status;
    const targetPaymentStatus = paymentStatus || moves[moveIndex].paymentStatus;
    if (targetStatus === "approved_for_driver" && targetPaymentStatus === "pending_payment") {
      return res.status(400).json({
        error: "\u05D7\u05E1\u05D9\u05DE\u05EA \u05D0\u05D1\u05D8\u05D7\u05D4: \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D7\u05E8\u05E8 \u05D0\u05D5 \u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05E0\u05D4\u05D2 \u05DB\u05DC \u05E2\u05D5\u05D3 \u05E1\u05D8\u05D8\u05D5\u05E1 \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05D4\u05D5\u05D0 \u05DE\u05DE\u05EA\u05D9\u05DF \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD (Pending). \u05D4\u05DC\u05E7\u05D5\u05D7 \u05E0\u05D3\u05E8\u05E9 \u05DC\u05D4\u05E1\u05D3\u05D9\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05DE\u05E7\u05D3\u05DE\u05D4, \u05EA\u05E9\u05DC\u05D5\u05DD \u05DE\u05DC\u05D0, \u05D0\u05D5 \u05DC\u05D4\u05D9\u05D5\u05EA \u05DC\u05E7\u05D5\u05D7 \u05DE\u05D5\u05E1\u05D3\u05D9 \u05DE\u05D0\u05D5\u05E9\u05E8 \u05D1\u05E9\u05D5\u05D8\u05E3 + 30."
      });
    }
    if (paymentStatus) {
      moves[moveIndex].paymentStatus = paymentStatus;
    }
    if (typeof clientApprovedForBilling === "boolean") {
      moves[moveIndex].clientApprovedForBilling = clientApprovedForBilling;
      if (status === "approved_for_driver" && !clientApprovedForBilling) {
        return res.status(400).json({
          error: "\u05DE\u05E0\u05D2\u05E0\u05D5\u05DF \u05D0\u05D1\u05D8\u05D7\u05D4 \u05EA\u05E4\u05E2\u05D5\u05DC\u05D9: \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D7\u05E8\u05E8/\u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05E0\u05D4\u05D2 \u05D0\u05DC\u05D0 \u05D0\u05DD \u05D4\u05EA\u05E7\u05D1\u05DC \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E0\u05D4\u05DC \u05DC\u05D7\u05D9\u05D5\u05D1 \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA!"
        });
      }
    }
    if (status) {
      if (status === "approved_for_driver" && !moves[moveIndex].clientApprovedForBilling) {
        return res.status(400).json({
          error: "\u05DE\u05E0\u05D2\u05E0\u05D5\u05DF \u05D0\u05D1\u05D8\u05D7\u05D4 \u05EA\u05E4\u05E2\u05D5\u05DC\u05D9: \u05DC\u05D0 \u05E0\u05D9\u05EA\u05DF \u05DC\u05E9\u05D7\u05E8\u05E8/\u05DC\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05E0\u05D4\u05D2 \u05D0\u05DC\u05D0 \u05D0\u05DD \u05D4\u05EA\u05E7\u05D1\u05DC \u05D0\u05D9\u05E9\u05D5\u05E8 \u05DE\u05E0\u05D4\u05DC \u05DC\u05D7\u05D9\u05D5\u05D1 \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D1\u05DE\u05E2\u05E8\u05DB\u05EA!"
        });
      }
      moves[moveIndex].status = status;
    }
    writeDatabase(MOVES_FILE, moves);
    if (status === "approved_for_driver") {
      logNotification(moves[moveIndex].id, "approved_for_driver", `\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05D5\u05D7\u05E8\u05E8\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05DC\u05E0\u05D4\u05D2 \u05D4\u05DE\u05D5\u05E8\u05E9\u05D4 ${moves[moveIndex].assignedDriverName || "\u05DE\u05D5\u05D1\u05D9\u05DC \u05DE\u05D5\u05E8\u05E9\u05D4"}. \u05D4\u05E0\u05D4\u05D2 \u05E7\u05D9\u05D1\u05DC \u05D4\u05EA\u05E8\u05D0\u05EA \u05E9\u05D9\u05D1\u05D5\u05E5 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4 \u05E2\u05DD \u05E4\u05E8\u05D8\u05D9 \u05D4\u05DB\u05EA\u05D5\u05D1\u05D5\u05EA.`);
    }
    if (moves[moveIndex].paymentStatus === "paid_full" || moves[moveIndex].paymentStatus === "paid_deposit") {
      const appUrl = process.env.APP_URL || `http://localhost:3000`;
      const approvedBid = moves[moveIndex].driverBids.find((b) => b.id === moves[moveIndex].finalApprovedBidId) || moves[moveIndex].driverBids.find((b) => b.status === "approved");
      sendToMakeWebhook({
        action: "payment_success_notify",
        moveId: moves[moveIndex].id,
        clientName: moves[moveIndex].clientName,
        clientPhone: moves[moveIndex].clientPhone,
        amountPaid: approvedBid ? approvedBid.bidAmount : 1500,
        driverName: approvedBid ? approvedBid.driverName : "\u05DE\u05D5\u05D1\u05D9\u05DC \u05DE\u05D5\u05E8\u05E9\u05D4",
        driverPhone: approvedBid ? approvedBid.driverPhone : "\u05D8\u05E8\u05DD \u05D4\u05D5\u05E7\u05E6\u05D4",
        trackingLink: `${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}`,
        invoiceLink: `${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}&showReceipt=true`,
        message: `\u05E9\u05DC\u05D5\u05DD ${moves[moveIndex].clientName}, \u05D4\u05EA\u05E9\u05DC\u05D5\u05DD \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D5\u05D1\u05DC\u05D4 #${moves[moveIndex].id} \u05D4\u05EA\u05E7\u05D1\u05DC \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u{1F389}

\u05D4\u05DE\u05D5\u05D1\u05D9\u05DC \u05E9\u05E0\u05D1\u05D7\u05E8 \u05D4\u05D5\u05D0: ${approvedBid ? approvedBid.driverName : "\u05DE\u05D5\u05D1\u05D9\u05DC \u05DE\u05D5\u05E8\u05E9\u05D4"} (${approvedBid ? approvedBid.driverPhone : ""}).
\u05E4\u05E8\u05D8\u05D9 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05D5\u05D7\u05E8\u05E8\u05D5 \u05DB\u05E2\u05EA \u05D5\u05DE\u05D5\u05E4\u05D9\u05E2\u05D9\u05DD \u05D1\u05D3\u05E3 \u05D4\u05DE\u05E2\u05E7\u05D1 \u05D4\u05D7\u05D9 \u05E9\u05DC\u05DA \u05DB\u05D5\u05DC\u05DC \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DE\u05E1 \u05D5\u05E7\u05D1\u05DC\u05D4 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA:
${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}`
      });
      const paymentLabel = moves[moveIndex].paymentStatus === "paid_full" ? "\u05E9\u05D5\u05DC\u05DD \u05D1\u05DE\u05DC\u05D5\u05D0\u05D5" : "\u05E9\u05D5\u05DC\u05DE\u05D4 \u05DE\u05E7\u05D3\u05DE\u05D4 \u05E9\u05E8\u05D9\u05D5\u05DF";
      logNotification(moves[moveIndex].id, "payment_success", `\u05D4\u05E1\u05D3\u05E8 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D1\u05D5\u05E6\u05E2 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u05E1\u05D8\u05D8\u05D5\u05E1 \u05EA\u05E9\u05DC\u05D5\u05DD \u05E2\u05D5\u05D3\u05DB\u05DF \u05DC: ${paymentLabel}. \u05E7\u05D1\u05DC\u05D4 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D5\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05D6\u05DE\u05E0\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D5 \u05DC\u05DC\u05E7\u05D5\u05D7 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4.`);
    }
    sendToGoogleAppsScript({
      action: "update_payment",
      moveId: moves[moveIndex].id,
      paymentStatus: moves[moveIndex].paymentStatus,
      clientApprovedForBilling: moves[moveIndex].clientApprovedForBilling,
      status: moves[moveIndex].status
    });
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error("Error updating payment/billing status:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E4\u05E8\u05D8\u05D9 \u05EA\u05E9\u05DC\u05D5\u05DD \u05D5\u05D0\u05D1\u05D8\u05D7\u05D4" });
  }
});
app.post("/api/moves/:id/complete", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { signatureImage, confirmedItems, customerName, feedbackScore, notes, cargoPhotos } = req.body;
    moves[moveIndex].status = "completed";
    moves[moveIndex].deliveryNote = {
      signatureImage,
      // base64 representation of digital signature canvas
      signatureDataUrl: signatureImage,
      signedBy: customerName,
      signedAt: (/* @__PURE__ */ new Date()).toISOString(),
      checklistResults: confirmedItems ? confirmedItems.map((item) => ({ itemId: item.id, name: item.name, verified: item.confirmed })) : [],
      feedbackRating: feedbackScore,
      feedbackText: notes,
      confirmedItems,
      customerName,
      feedbackScore,
      notes,
      cargoPhotos: cargoPhotos || [],
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    writeDatabase(MOVES_FILE, moves);
    sendToGoogleAppsScript({
      action: "complete_move",
      moveId: req.params.id,
      customerName: customerName || moves[moveIndex].clientName,
      signatureImage,
      confirmedItems,
      feedbackScore,
      notes,
      cargoPhotos: cargoPhotos || [],
      completedAt: (/* @__PURE__ */ new Date()).toISOString()
    });
    sendToMakeWebhook({
      action: "move_completed",
      moveId: req.params.id,
      clientName: moves[moveIndex].clientName,
      clientPhone: moves[moveIndex].clientPhone,
      message: `\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05DC\u05DB\u05DD \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u{1F3C1} \u05EA\u05D5\u05D3\u05D4 \u05E9\u05D1\u05D7\u05E8\u05EA\u05DD \u05D1\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il. \u05D7\u05EA\u05DE\u05EA\u05DD \u05E2\u05DC \u05EA\u05E2\u05D5\u05D3\u05EA \u05D4\u05DE\u05E1\u05D9\u05E8\u05D4 \u05D4\u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D5\u05D4\u05D9\u05D0 \u05E0\u05E9\u05DE\u05E8\u05D4 \u05D1\u05D1\u05D8\u05D7\u05D4.`
    });
    logNotification(req.params.id, "move_completed", `\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D4\u05D5\u05E9\u05DC\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05D1\u05E9\u05D8\u05D7! \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D7\u05EA\u05DD \u05E2\u05DC \u05EA\u05E2\u05D5\u05D3\u05EA \u05D4\u05DE\u05E1\u05D9\u05E8\u05D4 \u05D4\u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA. \u05D7\u05E9\u05D1\u05D5\u05E0\u05D9\u05EA \u05DE\u05E1 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9\u05EA \u05D5\u05E7\u05D1\u05DC\u05D4 \u05E0\u05E9\u05DC\u05D7\u05D5 \u05DC\u05DC\u05E7\u05D5\u05D7 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4.`);
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error("Error completing move:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05D2\u05D9\u05E8\u05EA \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05D0\u05D9\u05E9\u05D5\u05E8 \u05D4\u05DE\u05E1\u05D9\u05E8\u05D4" });
  }
});
app.post("/api/moves/:id/driver-status", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { driverStatus } = req.body;
    if (!driverStatus) {
      return res.status(400).json({ error: "\u05D7\u05E1\u05E8 \u05E1\u05D8\u05D8\u05D5\u05E1 \u05E0\u05D4\u05D2" });
    }
    moves[moveIndex].driverStatus = driverStatus;
    let messageText = "";
    let actionName = "driver_status_update";
    if (driverStatus === "en_route_to_origin") {
      messageText = `\u05D4\u05E0\u05D4\u05D2 ${moves[moveIndex].assignedDriverName || "\u05D4\u05DE\u05D5\u05D1\u05D9\u05DC"} \u05D9\u05E6\u05D0 \u05DC\u05D3\u05E8\u05DA \u05D0\u05DC \u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05DE\u05D5\u05E6\u05D0 \u05E9\u05DC\u05DB\u05DD! \u{1F69A}`;
      actionName = "driver_en_route";
    } else if (driverStatus === "loading") {
      messageText = `\u05D4\u05D4\u05E2\u05DE\u05E1\u05D4 \u05E9\u05DC\u05DB\u05DD \u05D4\u05EA\u05D7\u05D9\u05DC\u05D4! \u05D4\u05E0\u05D4\u05D2 \u05D5\u05D4\u05E1\u05D1\u05DC\u05D9\u05DD \u05DE\u05E2\u05DE\u05D9\u05E1\u05D9\u05DD \u05D0\u05EA \u05D4\u05E6\u05D9\u05D5\u05D3 \u05D1\u05D1\u05D8\u05D7\u05D4 \u05D1\u05DE\u05E9\u05D0\u05D9\u05EA. \u{1F4E6}`;
      actionName = "loading_started";
    } else if (driverStatus === "en_route_to_dest") {
      messageText = `\u05D4\u05E2\u05DE\u05E1\u05EA \u05D4\u05EA\u05DB\u05D5\u05DC\u05D4 \u05D4\u05E1\u05EA\u05D9\u05D9\u05DE\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u05DE\u05E9\u05D0\u05D9\u05EA \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC \u05D9\u05E6\u05D0\u05D4 \u05DC\u05D3\u05E8\u05DA \u05D0\u05DC \u05DB\u05EA\u05D5\u05D1\u05EA \u05D4\u05D9\u05E2\u05D3 \u05E9\u05DC\u05DB\u05DD. \u{1F5FA}\uFE0F`;
      actionName = "en_route_to_destination";
    } else if (driverStatus === "delivered") {
      messageText = `\u05D4\u05DE\u05E9\u05D0\u05D9\u05EA \u05D4\u05D2\u05D9\u05E2\u05D4 \u05DC\u05D9\u05E2\u05D3! \u05DE\u05EA\u05D7\u05D9\u05DC\u05D9\u05DD \u05DB\u05E2\u05EA \u05D1\u05E4\u05E8\u05D9\u05E7\u05D4 \u05D5\u05E1\u05D9\u05D3\u05D5\u05E8 \u05D4\u05E8\u05D4\u05D9\u05D8\u05D9\u05DD \u05D1\u05D1\u05D9\u05EA\u05DB\u05DD \u05D4\u05D7\u05D3\u05E9. \u{1F3C1}`;
      actionName = "delivered_destination";
    }
    if (messageText) {
      if (!moves[moveIndex].notificationsLog) {
        moves[moveIndex].notificationsLog = [];
      }
      moves[moveIndex].notificationsLog.unshift({
        id: "notif_" + Math.random().toString(36).substr(2, 9),
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        action: actionName,
        message: messageText
      });
      sendToMakeWebhook({
        action: actionName,
        moveId: req.params.id,
        clientName: moves[moveIndex].clientName,
        clientPhone: moves[moveIndex].clientPhone,
        driverName: moves[moveIndex].assignedDriverName,
        message: messageText
      });
    }
    writeDatabase(MOVES_FILE, moves);
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error("Error updating driver status:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1 \u05D4\u05E0\u05D4\u05D2" });
  }
});
app.post("/api/moves/:id/feedback", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { rating, feedbackText } = req.body;
    if (!rating) {
      return res.status(400).json({ error: "\u05D3\u05D9\u05E8\u05D5\u05D2 \u05E9\u05D1\u05D9\u05E2\u05D5\u05EA \u05E8\u05E6\u05D5\u05DF \u05D4\u05D5\u05D0 \u05D7\u05D5\u05D1\u05D4" });
    }
    if (!moves[moveIndex].deliveryNote) {
      moves[moveIndex].deliveryNote = {
        signedBy: moves[moveIndex].clientName,
        signatureDataUrl: "",
        signedAt: (/* @__PURE__ */ new Date()).toISOString(),
        checklistResults: []
      };
    }
    moves[moveIndex].deliveryNote.feedbackRating = Number(rating);
    moves[moveIndex].deliveryNote.feedbackText = feedbackText || "";
    if (Number(rating) <= 3) {
      moves[moveIndex].requiresAdminReview = true;
      moves[moveIndex].adminReviewTicketId = "TKT-" + Math.floor(1e5 + Math.random() * 9e5);
      moves[moveIndex].adminReviewStatus = "open";
    } else {
      moves[moveIndex].requiresAdminReview = false;
    }
    if (!moves[moveIndex].notificationsLog) {
      moves[moveIndex].notificationsLog = [];
    }
    moves[moveIndex].notificationsLog.unshift({
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      action: "feedback_received",
      message: `\u05D4\u05EA\u05E7\u05D1\u05DC \u05DE\u05E9\u05D5\u05D1 \u05DC\u05E7\u05D5\u05D7 \u05D7\u05D3\u05E9! \u05D3\u05D9\u05E8\u05D5\u05D2: ${rating} \u2605. \u05D4\u05E2\u05E8\u05D5\u05EA: "${feedbackText || "\u05DC\u05DC\u05D0 \u05D4\u05E2\u05E8\u05D5\u05EA"}"`
    });
    writeDatabase(MOVES_FILE, moves);
    sendToGoogleAppsScript({
      action: "feedback_submitted",
      moveId: req.params.id,
      rating,
      feedbackText,
      requiresAdminReview: moves[moveIndex].requiresAdminReview || false,
      adminReviewTicketId: moves[moveIndex].adminReviewTicketId || ""
    });
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error("Error submitting feedback:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05D4\u05DE\u05E9\u05D5\u05D1" });
  }
});
app.post("/api/moves/:id/resolve-ticket", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    moves[moveIndex].adminReviewStatus = "resolved";
    moves[moveIndex].adminReviewTicketResolved = true;
    if (!moves[moveIndex].notificationsLog) {
      moves[moveIndex].notificationsLog = [];
    }
    moves[moveIndex].notificationsLog.unshift({
      id: "notif_" + Math.random().toString(36).substr(2, 9),
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      action: "ticket_resolved",
      message: `\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D8\u05D9\u05E4\u05D5\u05DC \u05D3\u05D7\u05D5\u05E3 (${moves[moveIndex].adminReviewTicketId}) \u05E0\u05E1\u05D2\u05E8 \u05D5\u05E1\u05D5\u05DE\u05DF \u05DB\u05E4\u05EA\u05D5\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05E2\u05F4\u05D9 \u05DE\u05E0\u05D4\u05DC \u05E7\u05E9\u05E8\u05D9 \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA.`
    });
    writeDatabase(MOVES_FILE, moves);
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error("Error resolving ticket:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E1\u05D2\u05D9\u05E8\u05EA \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D8\u05D9\u05E4\u05D5\u05DC" });
  }
});
app.post("/api/leads", async (req, res) => {
  try {
    const leads = readDatabase(LEADS_FILE);
    const { fullName, phone, email, companyName, notes } = req.body;
    if (!fullName || !phone || !email) {
      return res.status(400).json({ error: "\u05E9\u05D3\u05D5\u05EA \u05E9\u05DD \u05DE\u05DC\u05D0, \u05D8\u05DC\u05E4\u05D5\u05DF \u05D5\u05D0\u05D9\u05DE\u05D9\u05D9\u05DC \u05D4\u05DD \u05D7\u05D5\u05D1\u05D4" });
    }
    const newLead = {
      id: "lead_" + Math.random().toString(36).substr(2, 9),
      fullName,
      phone,
      email,
      companyName: companyName || "",
      notes: notes || "",
      createdAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    leads.unshift(newLead);
    writeDatabase(LEADS_FILE, leads);
    sendToGoogleAppsScript({
      action: "create_lead",
      leadId: newLead.id,
      fullName: newLead.fullName,
      phone: newLead.phone,
      email: newLead.email,
      companyName: newLead.companyName,
      notes: newLead.notes
    });
    sendToMakeWebhook({
      action: "create_lead",
      leadId: newLead.id,
      fullName: newLead.fullName,
      phone: newLead.phone,
      email: newLead.email,
      companyName: newLead.companyName,
      message: `\u05DC\u05D9\u05D3 \u05D7\u05D3\u05E9 \u05D4\u05EA\u05E7\u05D1\u05DC \u05D1-CRM \u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il: ${newLead.fullName} (${newLead.phone})`
    });
    res.status(201).json(newLead);
  } catch (error) {
    console.error("Error creating CRM lead:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E8\u05D9\u05E9\u05D5\u05DD \u05D4\u05DC\u05D9\u05D3" });
  }
});
app.get("/api/leads", (req, res) => {
  const leads = readDatabase(LEADS_FILE);
  res.json(leads);
});
app.get("/api/chats", (req, res) => {
  const chats = readDatabase(CHATS_FILE);
  res.json(chats);
});
app.get("/api/chats/:jobId", (req, res) => {
  const chats = readDatabase(CHATS_FILE);
  const filtered = chats.filter((c) => c.jobId === req.params.jobId);
  res.json(filtered);
});
app.post("/api/chats", (req, res) => {
  try {
    const chats = readDatabase(CHATS_FILE);
    const { jobId, sender, senderName, message, gps, photo, isUrgent } = req.body;
    if (!jobId || !sender || !senderName) {
      return res.status(400).json({ error: "\u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4 \u05D7\u05E1\u05E8\u05D9\u05DD \u05DC\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05D5\u05D3\u05E2\u05D4" });
    }
    const newMessage = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      jobId,
      sender,
      senderName,
      message: message || "",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      gps: gps || null,
      photo: photo || null,
      readByAdmin: sender === "admin",
      readByDriver: sender === "driver",
      isUrgent: isUrgent || false,
      pushNotificationDispatched: false,
      pushLog: null
    };
    if (isUrgent) {
      newMessage.pushNotificationDispatched = true;
      newMessage.pushLog = {
        oneSignalId: "onesignal_" + Math.random().toString(36).substr(2, 9),
        targetRole: sender === "admin" ? "driver" : "admin",
        title: `\u05D4\u05D5\u05D3\u05E2\u05D4 \u05D3\u05D7\u05D5\u05E4\u05D4 \u05DE-${senderName}`,
        body: message || "\u05E2\u05D3\u05DB\u05D5\u05DF \u05DE\u05D9\u05E7\u05D5\u05DD \u05D0\u05D5 \u05EA\u05DB\u05D5\u05DC\u05D4 \u05D7\u05D3\u05E9 \u05DE\u05D4\u05E9\u05D8\u05D7",
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        status: "Sent (Delivered via OneSignal REST API Gateway)"
      };
      console.log(`[OneSignal Push Dispatched] To ${newMessage.pushLog.targetRole}: ${newMessage.pushLog.title} - ${newMessage.pushLog.body}`);
    }
    chats.push(newMessage);
    writeDatabase(CHATS_FILE, chats);
    res.status(201).json(newMessage);
  } catch (error) {
    console.error("Error creating chat message:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DC\u05D9\u05D7\u05EA \u05D4\u05D4\u05D5\u05D3\u05E2\u05D4" });
  }
});
app.post("/api/chats/mark-read", (req, res) => {
  try {
    const chats = readDatabase(CHATS_FILE);
    const { jobId, role } = req.body;
    if (!jobId || !role) {
      return res.status(400).json({ error: "\u05D7\u05E1\u05E8\u05D9\u05DD \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05DC\u05E1\u05D9\u05DE\u05D5\u05DF \u05DB\u05E0\u05E7\u05E8\u05D0" });
    }
    let modified = false;
    chats.forEach((c) => {
      if (c.jobId === jobId) {
        if (role === "admin" && !c.readByAdmin) {
          c.readByAdmin = true;
          modified = true;
        }
        if (role === "driver" && !c.readByDriver) {
          c.readByDriver = true;
          modified = true;
        }
      }
    });
    if (modified) {
      writeDatabase(CHATS_FILE, chats);
    }
    res.json({ success: true });
  } catch (error) {
    console.error("Error marking messages as read:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05E1\u05D8\u05D8\u05D5\u05E1 \u05E7\u05E8\u05D9\u05D0\u05D4" });
  }
});
app.get("/api/drivers", (req, res) => {
  try {
    const drivers = readDatabase(DRIVERS_FILE, [
      {
        id: "driver_1",
        fullName: "\u05D9\u05D5\u05E1\u05D9 \u05DC\u05D5\u05D9",
        phone: "052-8765432",
        region: "\u05DE\u05E8\u05DB\u05D6 \u05D5\u05D4\u05E9\u05E8\u05D5\u05DF",
        truckType: "\u05DE\u05E9\u05D0\u05D9\u05EA 7.5 \u05D8\u05D5\u05DF + \u05E8\u05DE\u05E4\u05D4 \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA",
        rating: 4.9,
        completedMoves: 142,
        status: "active"
      },
      {
        id: "driver_2",
        fullName: "\u05D0\u05D1\u05D9 \u05DB\u05D4\u05DF",
        phone: "054-1234567",
        region: "\u05D2\u05D5\u05E9 \u05D3\u05DF \u05D5\u05D9\u05E8\u05D5\u05E9\u05DC\u05D9\u05DD",
        truckType: "\u05DE\u05E9\u05D0\u05D9\u05EA 12 \u05D8\u05D5\u05DF + \u05DE\u05E0\u05D5\u05E3 \u05E7\u05D1\u05D5\u05E2\u05D4 \u05E7\u05D5\u05DE\u05D4 6",
        rating: 4.8,
        completedMoves: 98,
        status: "active"
      }
    ]);
    res.json(drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05E8\u05E9\u05D9\u05DE\u05EA \u05D4\u05E0\u05D4\u05D2\u05D9\u05DD" });
  }
});
app.post("/api/drivers", (req, res) => {
  try {
    const drivers = readDatabase(DRIVERS_FILE, []);
    const driverData = req.body;
    if (!driverData.fullName || !driverData.phone) {
      return res.status(400).json({ error: "\u05E9\u05DD \u05DE\u05DC\u05D0 \u05D5\u05D8\u05DC\u05E4\u05D5\u05DF \u05D4\u05DD \u05E9\u05D3\u05D5\u05EA \u05D7\u05D5\u05D1\u05D4" });
    }
    if (driverData.id) {
      const idx = drivers.findIndex((d) => d.id === driverData.id);
      if (idx !== -1) {
        drivers[idx] = { ...drivers[idx], ...driverData };
      } else {
        drivers.push(driverData);
      }
    } else {
      const newDriver = {
        id: "driver_" + Math.random().toString(36).substr(2, 9),
        fullName: driverData.fullName,
        phone: driverData.phone,
        region: driverData.region || "\u05D0\u05E8\u05E6\u05D9",
        truckType: driverData.truckType || "\u05DE\u05E9\u05D0\u05D9\u05EA \u05DB\u05DC\u05DC\u05D9\u05EA",
        rating: 5,
        completedMoves: 0,
        status: "active"
      };
      drivers.push(newDriver);
    }
    writeDatabase(DRIVERS_FILE, drivers);
    res.json({ success: true, drivers });
  } catch (error) {
    console.error("Error saving driver:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05DE\u05D9\u05E8\u05EA \u05E4\u05E8\u05D8\u05D9 \u05D4\u05E0\u05D4\u05D2" });
  }
});
app.delete("/api/drivers/:id", (req, res) => {
  try {
    let drivers = readDatabase(DRIVERS_FILE, []);
    drivers = drivers.filter((d) => d.id !== req.params.id);
    writeDatabase(DRIVERS_FILE, drivers);
    res.json({ success: true, drivers });
  } catch (error) {
    console.error("Error deleting driver:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05E0\u05D4\u05D2" });
  }
});
app.get("/api/settings", (req, res) => {
  try {
    const raw = readDatabase(SETTINGS_FILE, [{ makeWebhookUrl: "" }]);
    const settings = Array.isArray(raw) ? raw[0] || { makeWebhookUrl: "" } : raw || { makeWebhookUrl: "" };
    res.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA" });
  }
});
app.post("/api/settings", (req, res) => {
  try {
    const newSettings = req.body || {};
    writeDatabase(SETTINGS_FILE, [newSettings]);
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error("Error updating settings:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05D2\u05D3\u05E8\u05D5\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA" });
  }
});
app.get("/api/trucks", (req, res) => {
  try {
    const trucks = readDatabase(TRUCKS_FILE, [
      {
        id: "truck_1",
        model: "\u05D0\u05D9\u05E1\u05D5\u05D6\u05D5 \u05E1\u05D5\u05DE\u05D5 12 \u05D8\u05D5\u05DF (\u05DE\u05E0\u05D5\u05E3)",
        licensePlate: "77-888-99",
        type: "crane",
        status: "available",
        testDate: "2026-11-15",
        insuranceDate: "2027-02-28"
      },
      {
        id: "truck_2",
        model: "\u05D5\u05D5\u05DC\u05D5\u05D5 FE \u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05E9\u05D8\u05D7 \u05DB\u05D1\u05D3\u05D4",
        licensePlate: "11-222-33",
        type: "flatbed",
        status: "available",
        testDate: "2026-10-02",
        insuranceDate: "2027-01-15"
      },
      {
        id: "truck_3",
        model: "\u05D3\u05D0\u05E3 LF \u05E2\u05DD \u05D3\u05D5\u05E4\u05DF \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA",
        licensePlate: "55-666-77",
        type: "hydraulic_ramp",
        status: "available",
        testDate: "2026-09-12",
        insuranceDate: "2026-12-20"
      }
    ]);
    res.json(trucks);
  } catch (error) {
    console.error("Error reading trucks:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E7\u05E8\u05D9\u05D0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05DE\u05E9\u05D0\u05D9\u05D5\u05EA" });
  }
});
app.post("/api/trucks", (req, res) => {
  try {
    const trucks = readDatabase(TRUCKS_FILE);
    const { model, licensePlate, type, status, testDate, insuranceDate } = req.body;
    if (!model || !licensePlate) {
      return res.status(400).json({ error: "\u05E0\u05D0 \u05DC\u05DE\u05DC\u05D0 \u05D0\u05EA \u05DB\u05DC \u05E9\u05D3\u05D5\u05EA \u05D4\u05D7\u05D5\u05D1\u05D4" });
    }
    const newTruck = {
      id: "truck_" + Math.random().toString(36).substr(2, 9),
      model,
      licensePlate,
      type,
      status,
      testDate,
      insuranceDate
    };
    trucks.push(newTruck);
    writeDatabase(TRUCKS_FILE, trucks);
    res.status(201).json({ success: true, trucks });
  } catch (error) {
    console.error("Error adding truck:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05E9\u05D0\u05D9\u05EA" });
  }
});
app.put("/api/trucks/:id", (req, res) => {
  try {
    const trucks = readDatabase(TRUCKS_FILE);
    const truckIndex = trucks.findIndex((t) => t.id === req.params.id);
    if (truckIndex === -1) {
      return res.status(404).json({ error: "\u05DE\u05E9\u05D0\u05D9\u05EA \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { model, licensePlate, type, status, testDate, insuranceDate } = req.body;
    trucks[truckIndex] = {
      ...trucks[truckIndex],
      model: model || trucks[truckIndex].model,
      licensePlate: licensePlate || trucks[truckIndex].licensePlate,
      type: type || trucks[truckIndex].type,
      status: status || trucks[truckIndex].status,
      testDate: testDate || trucks[truckIndex].testDate,
      insuranceDate: insuranceDate || trucks[truckIndex].insuranceDate
    };
    writeDatabase(TRUCKS_FILE, trucks);
    res.json({ success: true, trucks });
  } catch (error) {
    console.error("Error updating truck:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05DE\u05E9\u05D0\u05D9\u05EA" });
  }
});
app.delete("/api/trucks/:id", (req, res) => {
  try {
    let trucks = readDatabase(TRUCKS_FILE);
    trucks = trucks.filter((t) => t.id !== req.params.id);
    writeDatabase(TRUCKS_FILE, trucks);
    res.json({ success: true, trucks });
  } catch (error) {
    console.error("Error deleting truck:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05DE\u05D7\u05D9\u05E7\u05EA \u05D4\u05DE\u05E9\u05D0\u05D9\u05EA" });
  }
});
app.get("/api/shifts", (req, res) => {
  try {
    const shifts = readDatabase(SHIFTS_FILE, []);
    res.json(shifts);
  } catch (error) {
    console.error("Error reading shifts:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E7\u05E8\u05D9\u05D0\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9 \u05D4\u05DE\u05E9\u05DE\u05E8\u05D5\u05EA" });
  }
});
app.post("/api/shifts", (req, res) => {
  try {
    const shifts = readDatabase(SHIFTS_FILE, []);
    const { driverId, driverName, date, status, shiftType, notes } = req.body;
    if (!driverId || !date) {
      return res.status(400).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E4\u05E8\u05DE\u05D8\u05E8\u05D9 \u05D4\u05E9\u05D9\u05D1\u05D5\u05E5" });
    }
    const existingIndex = shifts.findIndex((s) => s.driverId === driverId && s.date === date);
    const shiftData = {
      id: existingIndex !== -1 ? shifts[existingIndex].id : "shift_" + Math.random().toString(36).substr(2, 9),
      driverId,
      driverName,
      date,
      status,
      shiftType,
      notes: notes || ""
    };
    if (existingIndex !== -1) {
      shifts[existingIndex] = shiftData;
    } else {
      shifts.push(shiftData);
    }
    writeDatabase(SHIFTS_FILE, shifts);
    res.json({ success: true, shifts });
  } catch (error) {
    console.error("Error saving shift:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D3\u05DB\u05D5\u05DF \u05D4\u05DE\u05E9\u05DE\u05E8\u05EA" });
  }
});
app.post("/api/moves/:id/assign", (req, res) => {
  try {
    const moves = readDatabase(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: "\u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DC\u05D0 \u05E0\u05DE\u05E6\u05D0\u05D4" });
    }
    const { driverId, truckId, notes } = req.body;
    if (!driverId || !truckId) {
      return res.status(400).json({ error: "\u05E9\u05DD \u05D4\u05E0\u05D4\u05D2 \u05D5\u05DE\u05D6\u05D4\u05D4 \u05DE\u05E9\u05D0\u05D9\u05EA \u05D4\u05DD \u05D7\u05D5\u05D1\u05D4 \u05DC\u05E9\u05D9\u05D5\u05DA" });
    }
    const move = moves[moveIndex];
    const drivers = readDatabase(DRIVERS_FILE, []);
    const driver = drivers.find((d) => d.id === driverId);
    const trucks = readDatabase(TRUCKS_FILE, []);
    const truck = trucks.find((t) => t.id === truckId);
    if (truck) {
      const updatedTrucks = trucks.map((t) => t.id === truckId ? { ...t, status: "on_route" } : t);
      writeDatabase(TRUCKS_FILE, updatedTrucks);
    }
    move.assignedDriverId = driverId;
    move.assignedDriverName = driver ? driver.fullName : "\u05E0\u05D4\u05D2 \u05DE\u05E9\u05D5\u05D9\u05DA";
    move.assignedDriverPhone = driver ? driver.phone : "";
    move.assignedTruckId = truckId;
    move.assignedTruckModel = truck ? truck.model : "\u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05E9\u05D5\u05D9\u05DB\u05EA";
    move.assignedTruckLicense = truck ? truck.licensePlate : "";
    move.assignedTruckType = truck ? truck.type : "";
    move.status = "approved_for_driver";
    move.operationalNotes = notes || "";
    writeDatabase(MOVES_FILE, moves);
    sendToGoogleAppsScript({
      action: "assign_resource",
      moveId: move.id,
      driverId,
      driverName: move.assignedDriverName,
      truckId,
      truckModel: move.assignedTruckModel,
      notes: notes || ""
    });
    sendToMakeWebhook({
      action: "resource_assigned_notify_driver",
      moveId: move.id,
      driverName: move.assignedDriverName,
      driverPhone: move.assignedDriverPhone,
      truckModel: move.assignedTruckModel,
      licensePlate: move.assignedTruckLicense,
      clientName: move.clientName,
      origin: move.originAddress,
      destination: move.destAddress,
      message: `\u05D4\u05E7\u05E6\u05D0\u05EA \u05DE\u05E9\u05D0\u05D1\u05D9\u05DD \u05D7\u05D3\u05E9\u05D4 \u05D1-Truk Dealil IL! \u{1F69A}

\u05E9\u05DC\u05D5\u05DD ${move.assignedDriverName}, \u05E9\u05D5\u05D9\u05DB\u05EA \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05DC ${move.clientName} \u05D1\u05EA\u05D0\u05E8\u05D9\u05DA ${move.moveDate}.
\u05DB\u05DC\u05D9 \u05E8\u05DB\u05D1 \u05DE\u05E9\u05D5\u05D9\u05DA: ${move.assignedTruckModel} (${move.assignedTruckLicense}).
\u05E0\u05D0 \u05DC\u05D0\u05E9\u05E8 \u05EA\u05D7\u05D9\u05DC\u05EA \u05EA\u05E0\u05D5\u05E2\u05D4 \u05D1\u05D1\u05D5\u05E7\u05E8 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4.`
    });
    res.json({ success: true, move });
  } catch (error) {
    console.error("Error assigning resource to move:", error);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E9\u05D9\u05D1\u05D5\u05E5 \u05D4\u05DE\u05E9\u05D0\u05D1\u05D9\u05DD \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4" });
  }
});
app.post("/api/settings/test-webhook", async (req, res) => {
  try {
    const { testPayload, webhookUrl } = req.body;
    const targetUrl = webhookUrl || process.env.MAKE_WEBHOOK_URL;
    if (!targetUrl || targetUrl.trim() === "" || targetUrl.includes("your-custom-webhook-endpoint")) {
      return res.status(400).json({ error: "\u05D0\u05E0\u05D0 \u05D4\u05D2\u05D3\u05E8 \u05EA\u05D7\u05D9\u05DC\u05D4 \u05DB\u05EA\u05D5\u05D1\u05EA Webhook \u05EA\u05E7\u05D9\u05E0\u05D4 \u05DC-Make.com" });
    }
    console.log("Sending manual integration test payload to:", targetUrl);
    const response = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload || { test: true, message: "\u05D1\u05D3\u05D9\u05E7\u05EA \u05D7\u05D9\u05D1\u05D5\u05E8 \u05D0\u05D5\u05D8\u05D5\u05DE\u05D8\u05D9 \u05DE\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC IL" })
    });
    res.json({ success: true, status: response.status });
  } catch (error) {
    console.error("Webhook manual test failed:", error);
    res.status(500).json({ error: `\u05D4\u05D7\u05D9\u05D1\u05D5\u05E8 \u05E0\u05DB\u05E9\u05DC: ${error.message}` });
  }
});
app.get("/api/concierge/history", (req, res) => {
  try {
    const history = readDatabase(CONCIERGE_CHATS_FILE, []);
    res.json(history);
  } catch (err) {
    console.error("Error in concierge history API:", err);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05D8\u05E2\u05D9\u05E0\u05EA \u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4" });
  }
});
app.post("/api/concierge/chat", async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: "\u05D4\u05D5\u05D3\u05E2\u05D4 \u05E8\u05D9\u05E7\u05D4 \u05D0\u05D9\u05E0\u05D4 \u05D7\u05D5\u05E7\u05D9\u05EA" });
    }
    const history = readDatabase(CONCIERGE_CHATS_FILE, []);
    const userMsg = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "user",
      text: message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    history.push(userMsg);
    let aiReply = "";
    let driveLink = void 0;
    const lowerMessage = message.toLowerCase();
    const isRequestingMedia = lowerMessage.includes("\u05EA\u05DE\u05D5\u05E0\u05D4") || lowerMessage.includes("\u05E1\u05E8\u05D8\u05D5\u05DF") || lowerMessage.includes("\u05E1\u05D9\u05D5\u05E8") || lowerMessage.includes("\u05EA\u05DB\u05D5\u05DC\u05D4") || lowerMessage.includes("\u05DE\u05D3\u05D9\u05D4");
    if (isRequestingMedia) {
      aiReply = `\u05D4\u05E2\u05DC\u05D9\u05EA \u05E7\u05D5\u05D1\u05E5 \u05E1\u05D9\u05D5\u05E8 \u05EA\u05DB\u05D5\u05DC\u05D4 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4! \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05E1\u05E0\u05DB\u05E8\u05E0\u05D4 \u05D0\u05EA \u05D4\u05DE\u05D3\u05D9\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DC\u05EA\u05D9\u05E7\u05D9\u05D9\u05EA Google Drive \u05D4\u05DE\u05D0\u05D5\u05D1\u05D8\u05D7\u05EA \u05E9\u05DC \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05E9\u05DC\u05DA \u05DC\u05D4\u05E2\u05E8\u05DB\u05EA \u05E2\u05DC\u05D5\u05D9\u05D5\u05EA \u05DE\u05D3\u05D5\u05D9\u05E7\u05EA \u05E2\u05F4\u05D9 Truk AI.<br/><br/>\u{1F532} \u05D4\u05E6\u05D2 \u05E0\u05D9\u05EA\u05D5\u05D7 \u05E2\u05DC\u05D5\u05EA \u05D4\u05D5\u05D1\u05DC\u05D4<br/>\u{1F532} \u05E9\u05DC\u05D7 \u05D4\u05E6\u05E2\u05D4 \u05DC\u05DE\u05D5\u05D1\u05D9\u05DC \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4`;
      driveLink = "https://drive.google.com/drive/folders/1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG";
    } else if (ai) {
      try {
        const systemPrompt = `\u05D0\u05EA\u05D4 "Truk AI Dispatcher" \u2014 \u05D4\u05E1\u05D3\u05E8\u05DF, \u05D4\u05DE\u05EA\u05DE\u05D7\u05E8 \u05D5\u05DE\u05E0\u05D4\u05DC \u05D4\u05EA\u05E4\u05E2\u05D5\u05DC \u05D4\u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9 \u05D4\u05E8\u05D0\u05E9\u05D9 \u05E9\u05DC \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05EA "\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il" (Truk Dealil IL).
\u05D3\u05D5\u05DE\u05D9\u05D9\u05DF \u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05D4\u05E4\u05E2\u05D9\u05DC: https://truck-deal.vercel.app/

\u05EA\u05E4\u05E7\u05D9\u05D3\u05DA: \u05DC\u05E0\u05D4\u05DC \u05E9\u05D9\u05D7\u05D4 \u05E2\u05E1\u05E7\u05D9\u05EA \u05D7\u05D3\u05D4 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05DE\u05DC\u05D0\u05D4 \u05DE\u05D5\u05DC \u05DC\u05E7\u05D5\u05D7\u05D5\u05EA \u05E4\u05E8\u05D8\u05D9\u05D9\u05DD \u05D5\u05E2\u05E1\u05E7\u05D9\u05D9\u05DD, \u05DC\u05D1\u05E6\u05E2 \u05D0\u05E4\u05D9\u05D5\u05DF \u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9, \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05E6\u05D9 \u05E8\u05DB\u05D1, \u05DC\u05EA\u05DE\u05D7\u05E8 \u05D1\u05E9\u05E7\u05D9\u05E4\u05D5\u05EA, \u05DC\u05E1\u05D2\u05D5\u05E8 \u05DE\u05DB\u05E8\u05D6, \u05D5\u05DC\u05D4\u05E0\u05E4\u05D9\u05E7 "\u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD" (Magic Links) \u05D3\u05D9\u05E0\u05DE\u05D9\u05D9\u05DD \u05DC\u05DE\u05E2\u05E7\u05D1 \u05D5\u05DC\u05E0\u05D4\u05D2\u05D9\u05DD.

======================================================================
1. \u05D6\u05D9\u05DB\u05E8\u05D5\u05DF \u05E9\u05D9\u05D7\u05D4 \u05DE\u05D7\u05D9\u05D9\u05D1 \u05D5\u05D0\u05D9\u05E1\u05D5\u05E8 \u05D7\u05D6\u05E8\u05EA\u05D9\u05D5\u05EA (STRICT CONTEXT MEMORY)
======================================================================
- \u05E9\u05DE\u05D5\u05E8 \u05DE\u05E2\u05E7\u05D1 \u05E8\u05E6\u05D9\u05E3 \u05D0\u05D7\u05E8 \u05DB\u05DC \u05E0\u05EA\u05D5\u05DF \u05E9\u05E0\u05DE\u05E1\u05E8 \u05D1\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4: \u05DB\u05EA\u05D5\u05D1\u05D5\u05EA \u05DE\u05D5\u05E6\u05D0 \u05D5\u05D9\u05E2\u05D3, \u05E7\u05D5\u05DE\u05D4, \u05DE\u05E2\u05DC\u05D9\u05EA, \u05EA\u05DB\u05D5\u05DC\u05D4, \u05DE\u05E9\u05E7\u05DC, \u05DE\u05E0\u05D5\u05E3, \u05E8\u05DE\u05E4\u05D4 \u05D5\u05DE\u05D7\u05D9\u05E8\u05D9\u05DD \u05E9\u05E0\u05E0\u05E7\u05D1\u05D5.
- \u05D7\u05DC \u05D0\u05D9\u05E1\u05D5\u05E8 \u05DE\u05D5\u05D7\u05DC\u05D8 \u05DC\u05E9\u05D0\u05D5\u05DC \u05E9\u05D5\u05D1 \u05E2\u05DC \u05E0\u05EA\u05D5\u05DF \u05E9\u05DB\u05D1\u05E8 \u05E0\u05DE\u05E1\u05E8 \u05D0\u05D5 \u05D7\u05D5\u05E9\u05D1 \u05D1\u05DE\u05D4\u05DC\u05DA \u05D4\u05E9\u05D9\u05D7\u05D4.
- \u05D1\u05E8\u05D2\u05E2 \u05E9\u05D4\u05DC\u05E7\u05D5\u05D7 \u05DE\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05E6\u05E2\u05D4 ("\u05D0\u05D9\u05E9\u05D5\u05E8", "\u05D0\u05E9\u05E8", "\u05E1\u05D2\u05D5\u05E8", "\u05E7\u05D3\u05D9\u05DE\u05D4"): \u05E2\u05D1\u05D5\u05E8 \u05DE\u05D9\u05D3 \u05DC\u05D4\u05E7\u05DE\u05EA \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4, \u05D9\u05D9\u05E6\u05D5\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9 (TRK-XXXX) \u05D5\u05D4\u05E0\u05E4\u05E7\u05EA \u05DC\u05D9\u05E0\u05E7\u05D9 \u05D4\u05E7\u05E1\u05DD \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4. \u05D0\u05DC \u05EA\u05D1\u05E7\u05E9 \u05E4\u05E8\u05D8\u05D9\u05DD \u05DE\u05D7\u05D3\u05E9.

======================================================================
2. \u05D0\u05E8\u05DB\u05D9\u05D8\u05E7\u05D8\u05D5\u05E8\u05EA \u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD (MAGIC LINKS SPECIFICATION)
======================================================================
\u05D4\u05DE\u05E2\u05E8\u05DB\u05EA \u05DE\u05D9\u05D9\u05E6\u05E8\u05EA \u05DC\u05D9\u05E0\u05E7\u05D9\u05DD \u05D9\u05D9\u05E2\u05D5\u05D3\u05D9\u05D9\u05DD \u05D4\u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05D9\u05E9\u05D9\u05E8\u05D5\u05EA \u05DC\u05DE\u05E1\u05DB\u05D9 \u05D4\u05E4\u05E2\u05D5\u05DC\u05D4 \u05DC\u05E4\u05D9 \u05DE\u05D6\u05D4\u05D4 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 (\u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: TRK-8420):
1. \u05DC\u05D9\u05E0\u05E7 \u05E7\u05E1\u05DD \u05DC\u05DE\u05E2\u05E7\u05D1 \u05DC\u05E7\u05D5\u05D7 \u05D5\u05DE\u05E7\u05D3\u05DE\u05D4:
   https://truck-deal.vercel.app/?view=tracking&moveId={TRK_ID}
2. \u05DC\u05D9\u05E0\u05E7 \u05E7\u05E1\u05DD \u05DC\u05E4\u05D5\u05E8\u05D8\u05DC \u05E0\u05D4\u05D2\u05D9\u05DD \u05D5\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05D5\u05EA (\u05DC\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4):
   https://truck-deal.vercel.app/?view=driver&moveId={TRK_ID}
3. \u05DC\u05D9\u05E0\u05E7 \u05E7\u05E1\u05DD \u05D9\u05E9\u05D9\u05E8 \u05DC\u05E9\u05D9\u05EA\u05D5\u05E3 \u05D1-WhatsApp:
   https://api.whatsapp.com/send?text={ENCODED_MESSAGE}

======================================================================
3. \u05E1\u05D9\u05D5\u05D5\u05D2 \u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9 \u05D5\u05D4\u05EA\u05D0\u05DE\u05EA \u05E6\u05D9 \u05E8\u05DB\u05D1 (LOGISTICS & FLEET MATCHING)
======================================================================
\u05D0. \u05E1\u05D9\u05D5\u05D5\u05D2 \u05E1\u05D5\u05D2 \u05D4\u05E4\u05E2\u05D9\u05DC\u05D5\u05EA:
- \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA (Spot): \u05D4\u05E2\u05D1\u05E8\u05EA \u05D3\u05D9\u05E8\u05D4, \u05E4\u05E8\u05D9\u05D8\u05D9\u05DD \u05D1\u05D5\u05D3\u05D3\u05D9\u05DD, \u05E9\u05D9\u05E0\u05D5\u05E2 \u05D7\u05D3-\u05E4\u05E2\u05DE\u05D9. \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA: 15%.
- \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 (B2B): \u05D4\u05E4\u05E6\u05D4 \u05E7\u05D1\u05D5\u05E2\u05D4 \u05DC\u05E8\u05E9\u05EA\u05D5\u05EA, \u05D7\u05E0\u05D5\u05D9\u05D5\u05EA, \u05DE\u05D7\u05E1\u05E0\u05D9\u05DD, \u05D0\u05E1\u05E4\u05E7\u05EA \u05D7\u05D5\u05DE\u05E8\u05D9 \u05D1\u05E0\u05D9\u05D9\u05DF (\u05DE\u05E1\u05DC\u05D5\u05DC \u05DE\u05E8\u05D5\u05D1\u05D4 \u05E0\u05E7\u05D5\u05D3\u05D5\u05EA). \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA: 10%.

\u05D1. \u05D7\u05D5\u05E7\u05D9 \u05E9\u05D9\u05D1\u05D5\u05E5 \u05E6\u05D9 \u05E8\u05DB\u05D1 \u05E7\u05E9\u05D9\u05D7\u05D9\u05DD:
- \u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05E0\u05D5\u05E3 (12-15 \u05D8\u05D5\u05DF): \u05DE\u05D9\u05D5\u05E2\u05D3\u05EA \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DC\u05DE\u05D8\u05E2\u05E0\u05D9\u05DD \u05DB\u05D1\u05D3\u05D9\u05DD (\u05DE\u05E2\u05DC 1.5 \u05D8\u05D5\u05DF, \u05DE\u05E9\u05D8\u05D7\u05D9\u05DD, \u05D1\u05DC\u05D5\u05EA), \u05E4\u05E8\u05D9\u05E7\u05D4 \u05DC\u05D2\u05D5\u05D1\u05D4/\u05DE\u05E8\u05E4\u05E1\u05D5\u05EA, \u05D0\u05D5 \u05E7\u05D5\u05DE\u05D5\u05EA \u05D2\u05D1\u05D5\u05D4\u05D5\u05EA \u05DC\u05DC\u05D0 \u05DE\u05E2\u05DC\u05D9\u05EA. \u05D7\u05E1\u05D5\u05DD \u05E9\u05D9\u05D1\u05D5\u05E5 \u05DE\u05E0\u05D5\u05E3 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D5\u05EA \u05E7\u05DC\u05D5\u05EA.
- \u05DE\u05E9\u05D0\u05D9\u05EA \u05E1\u05D2\u05D5\u05E8\u05D4 / \u05E4\u05DC\u05D8\u05D4 \u05E2\u05DD \u05E8\u05DE\u05E4\u05D4 \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA (5.5-7.5 \u05D8\u05D5\u05DF): \u05DE\u05D9\u05D5\u05E2\u05D3\u05EA \u05DC\u05D3\u05D9\u05E8\u05D5\u05EA 3-5 \u05D7\u05D3\u05E8\u05D9\u05DD, \u05E7\u05D5\u05D5\u05D9 \u05D7\u05DC\u05D5\u05E7\u05D4, \u05D2\u05D1\u05E1, \u05DE\u05E9\u05D8\u05D7\u05D9\u05DD \u05E2\u05DD \u05E2\u05D2\u05DC\u05EA \u05DE\u05E9\u05D8\u05D7\u05D9\u05DD \u05D5\u05E1\u05D7\u05D5\u05E8\u05D4 \u05E4\u05E8\u05D9\u05E7\u05D4 \u05D9\u05D3\u05E0\u05D9\u05EA.
- \u05DE\u05E1\u05D7\u05E8\u05D9\u05EA \u05D2\u05D3\u05D5\u05DC\u05D4 (3.5 \u05D8\u05D5\u05DF / \u05E1\u05E4\u05E8\u05D9\u05E0\u05D8\u05E8): \u05DC\u05D3\u05D9\u05E8\u05D5\u05EA 1-2 \u05D7\u05D3\u05E8\u05D9\u05DD, \u05DE\u05E9\u05DC\u05D5\u05D7\u05D9\u05DD \u05DE\u05D4\u05D9\u05E8\u05D9\u05DD, \u05D5\u05E8\u05D7\u05D5\u05D1\u05D5\u05EA \u05E6\u05E4\u05D5\u05E4\u05D9\u05DD \u05D1\u05E2\u05D9\u05E8 \u05DC\u05DC\u05D0 \u05D2\u05D9\u05E9\u05EA \u05DE\u05E9\u05D0\u05D9\u05EA \u05DB\u05D1\u05D3\u05D4.

======================================================================
4. \u05E0\u05D5\u05E1\u05D7\u05EA \u05EA\u05DE\u05D7\u05D5\u05E8 \u05E9\u05E7\u05D5\u05E4\u05D4 (PRICING FORMULA)
======================================================================
1. \u05E2\u05DC\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1 \u05D9\u05E9\u05D9\u05E8\u05D4 \u05DC\u05E0\u05D4\u05D2 (\u05E9\u05D9\u05E0\u05D5\u05E2, \u05DE\u05E8\u05D7\u05E7, \u05D3\u05DC\u05E7, \u05D5\u05EA\u05E4\u05E2\u05D5\u05DC \u05DE\u05E0\u05D5\u05E3/\u05E8\u05DE\u05E4\u05D4).
2. \u05E2\u05DE\u05DC\u05EA \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05EA "\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il": 15% \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA | 10% \u05DC\u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2.
3. \u05E1\u05D4"\u05DB \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE = \u05E2\u05DC\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1 + \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA.
4. \u05DE\u05E2"\u05DE \u05D7\u05D5\u05E7\u05D9 \u05D1\u05D9\u05E9\u05E8\u05D0\u05DC = 18%.
5. \u05DE\u05D7\u05D9\u05E8 \u05E1\u05D5\u05E4\u05D9 \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE = \u05E1\u05D4"\u05DB \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE \xD7 1.18.

======================================================================
5. \u05DE\u05D1\u05E0\u05D4 \u05E4\u05DC\u05D8 \u05E9\u05DC\u05D1 \u05D0\u05D9\u05E9\u05D5\u05E8 \u05D5\u05D4\u05E7\u05DE\u05EA \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05E2\u05DD \u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD (MOVE DISPATCH CARD & MAGIC LINKS)
======================================================================
\u05DB\u05D0\u05E9\u05E8 \u05D4\u05DC\u05E7\u05D5\u05D7 \u05DE\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05E6\u05E2\u05D4, \u05E4\u05DC\u05D5\u05D8 \u05EA\u05DE\u05D9\u05D3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D5\u05D1\u05E0\u05D4 \u05D4\u05DE\u05DB\u05D9\u05DC \u05D0\u05EA \u05DC\u05D9\u05E0\u05E7\u05D9 \u05D4\u05E7\u05E1\u05DD \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 \u05D4\u05D1\u05D0:

\u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05D4\u05DE\u05DB\u05E8\u05D6 \u05E9\u05D5\u05D3\u05E8 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA \u05DC\u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD \u05D1\u05D0\u05D6\u05D5\u05E8\u05DA.

\u{1F4CB} \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05DB\u05E8\u05D6 [TRK-ID]:
\u2022 \u05E1\u05D8\u05D8\u05D5\u05E1: \u05DE\u05DB\u05E8\u05D6 \u05E4\u05EA\u05D5\u05D7 \u05DC\u05E0\u05D4\u05D2\u05D9\u05DD (Bidding) \u{1F7E2}
\u2022 \u05E1\u05D5\u05D2 \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA: [\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA (Spot) / \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 (B2B)]
\u2022 \u05DE\u05E1\u05DC\u05D5\u05DC: [\u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D5\u05E6\u05D0, \u05E7\u05D5\u05DE\u05D4] \u2794 [\u05DB\u05EA\u05D5\u05D1\u05EA \u05D9\u05E2\u05D3, \u05E7\u05D5\u05DE\u05D4]
\u2022 \u05E6\u05D9 \u05DE\u05E9\u05D5\u05D1\u05E5: [\u05E1\u05D5\u05D2 \u05D4\u05E8\u05DB\u05D1 \u05D5\u05D4\u05E6\u05D9\u05D5\u05D3, \u05DC\u05D3\u05D5\u05D2\u05DE\u05D4: \u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05E0\u05D5\u05E3 12-15 \u05D8\u05D5\u05DF]
\u2022 \u05E4\u05D9\u05E8\u05D5\u05D8 \u05DE\u05D8\u05E2\u05DF \u05D5\u05DE\u05E9\u05E7\u05DC: [\u05EA\u05DB\u05D5\u05DC\u05D4 \u05D5\u05DE\u05E9\u05E7\u05DC \u05DE\u05D5\u05E2\u05E8\u05DA]
\u2022 \u05E1\u05D9\u05DB\u05D5\u05DD \u05EA\u05DE\u05D7\u05D5\u05E8 \u05E0\u05E2\u05D5\u05DC:
  - \u05E2\u05DC\u05D5\u05EA \u05D1\u05D9\u05E6\u05D5\u05E2 \u05E0\u05D4\u05D2: \u20AA[X]
  - \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA ([10%/15%]): \u20AA[Y]
  - \u05E1\u05D4"\u05DB \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE: \u20AA[Z]
  - \u05DE\u05E2"\u05DE (18%): \u20AA[V]
  - \u05DE\u05D7\u05D9\u05E8 \u05E1\u05D5\u05E4\u05D9 \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE: \u20AA[Total]
\u2022 \u05D6\u05DE\u05E0\u05D9 \u05D1\u05D9\u05E6\u05D5\u05E2: [\u05D7\u05DC\u05D5\u05DF \u05D4\u05D2\u05E2\u05D4 / \u05EA\u05D9\u05D0\u05D5\u05DD \u05DE\u05D5\u05E2\u05D3]

\u{1F517} \u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D4:
\u2022 \u{1F4CD} \u05DE\u05E2\u05E7\u05D1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05E7\u05D3\u05DE\u05D4 \u05DC\u05DC\u05E7\u05D5\u05D7:
  https://truck-deal.vercel.app/?view=tracking&moveId=[TRK-ID]
\u2022 \u{1F69B} \u05DB\u05E0\u05D9\u05E1\u05EA \u05E0\u05D4\u05D2\u05D9\u05DD \u05D5\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05D5\u05EA:
  https://truck-deal.vercel.app/?view=driver&moveId=[TRK-ID]
\u2022 \u{1F4F2} \u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05DE\u05DB\u05E8\u05D6 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4:
  [\u05DC\u05D9\u05E0\u05E7 \u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4 \u05DE\u05E7\u05D5\u05E6\u05E8 \u05E2\u05DD \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD: https://api.whatsapp.com/send?text=...]

\u05D0\u05D9\u05DA \u05EA\u05E8\u05E6\u05D4 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05DB\u05E2\u05EA?
\u{1F532} \u05DE\u05E2\u05D1\u05E8 \u05DC\u05DE\u05E2\u05E7\u05D1 \u05D7\u05D9 \u05D5\u05D4\u05E1\u05D3\u05E8\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u{1F4F1}
\u{1F532} \u05E7\u05D1\u05DC\u05EA \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D1-WhatsApp
\u{1F532} \u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05E2\u05E8\u05EA \u05D2\u05D9\u05E9\u05D4 \u05DE\u05D9\u05D5\u05D7\u05D3\u05EA \u05DC\u05E0\u05D4\u05D2

\u05D1\u05DE\u05D9\u05D3\u05D4 \u05D5\u05DE\u05D3\u05D5\u05D1\u05E8 \u05D1\u05E9\u05DC\u05D1 \u05D0\u05E4\u05D9\u05D5\u05DF \u05D5\u05D0\u05D9\u05E1\u05D5\u05E3 \u05E4\u05E8\u05D8\u05D9\u05DD (\u05DC\u05E4\u05E0\u05D9 \u05D0\u05D9\u05E9\u05D5\u05E8), \u05E1\u05D9\u05D9\u05DD \u05E2\u05DD 2-3 \u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05D1\u05E4\u05D5\u05E8\u05DE\u05D8 \u{1F532}, \u05DB\u05D2\u05D5\u05DF:
\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD
\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA
\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7`;
        const recentHistory = history.slice(-11, -1);
        const historyText = recentHistory.length > 0 ? `\u05D4\u05D9\u05E1\u05D8\u05D5\u05E8\u05D9\u05D9\u05EA \u05D4\u05E9\u05D9\u05D7\u05D4 \u05E2\u05D3 \u05DB\u05D4 (\u05D6\u05DB\u05D5\u05E8 \u05D1\u05E7\u05E4\u05D9\u05D3\u05D4 \u05D0\u05EA \u05DB\u05DC \u05D4\u05E4\u05E8\u05D8\u05D9\u05DD \u05E9\u05E0\u05DE\u05E1\u05E8\u05D5 \u05D1\u05E2\u05D1\u05E8 \u05D5\u05D0\u05DC \u05EA\u05E9\u05D0\u05DC \u05E2\u05DC\u05D9\u05D4\u05DD \u05E9\u05D5\u05D1!):
` + recentHistory.map((m) => `${m.sender === "user" ? "\u05DC\u05E7\u05D5\u05D7" : "\u05E1\u05D3\u05E8\u05DF Truk AI Dispatcher"}: ${m.text.replace(/<[^>]*>/g, " ")}`).join("\n") : "\u05EA\u05D7\u05D9\u05DC\u05EA \u05E9\u05D9\u05D7\u05D4 \u05D7\u05D3\u05E9\u05D4.";
        const userPrompt = `${systemPrompt}

${historyText}

\u05D4\u05D5\u05D3\u05E2\u05EA \u05D4\u05DC\u05E7\u05D5\u05D7 \u05D4\u05E0\u05D5\u05DB\u05D7\u05D9\u05EA:
"${message}"

\u05D4\u05E0\u05D7\u05D9\u05D5\u05EA \u05E2\u05D9\u05E6\u05D5\u05D1 \u05DC\u05DE\u05E2\u05E0\u05D4:
- \u05D4\u05E9\u05D1 \u05D1\u05E2\u05D1\u05E8\u05D9\u05EA \u05E2\u05E1\u05E7\u05D9\u05EA, \u05E7\u05D5\u05DC\u05D7\u05EA, \u05DE\u05E7\u05E6\u05D5\u05E2\u05D9\u05EA \u05D5\u05DE\u05D3\u05D5\u05D9\u05E7\u05EA.
- \u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05EA\u05D2\u05D9\u05D5\u05EA <b> \u05DC\u05D4\u05D3\u05D2\u05E9\u05EA \u05E0\u05EA\u05D5\u05E0\u05D9\u05DD \u05D5\u05E1\u05DB\u05D5\u05DE\u05D9\u05DD \u05D5-<br/> \u05DC\u05DE\u05E2\u05D1\u05E8\u05D9 \u05E9\u05D5\u05E8\u05D5\u05EA (\u05D0\u05D9\u05DF \u05DC\u05D4\u05E9\u05EA\u05DE\u05E9 \u05D1\u05D1\u05DC\u05D5\u05E7\u05D9 \u05E7\u05D5\u05D3 \u05E9\u05DC markdown).
- \u05E6\u05D5\u05E8 \u05DE\u05E1\u05E4\u05E8 \u05DE\u05D6\u05D4\u05D4 \u05D9\u05D9\u05D7\u05D5\u05D3\u05D9 \u05E2\u05D1\u05D5\u05E8 [TRK-ID] \u05DB\u05D2\u05D5\u05DF TRK-8420.
- \u05DB\u05D0\u05E9\u05E8 \u05D4\u05DC\u05E7\u05D5\u05D7 \u05DE\u05D0\u05E9\u05E8 \u05D0\u05EA \u05D4\u05D4\u05E6\u05E2\u05D4, \u05D4\u05E7\u05E4\u05D3 \u05DC\u05DB\u05DC\u05D5\u05DC \u05D0\u05EA 3 \u05DC\u05D9\u05E0\u05E7\u05D9 \u05D4\u05E7\u05E1\u05DD \u05E2\u05DD \u05DE\u05D6\u05D4\u05D4 \u05D4\u05D4\u05D5\u05D1\u05DC\u05D4 \u05D4\u05D0\u05DE\u05D9\u05EA\u05D9, \u05D5\u05D0\u05EA \u05D4\u05E7\u05D9\u05E9\u05D5\u05E8 \u05DC\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4 \u05E2\u05DD \u05D4\u05D8\u05E7\u05E1\u05D8 \u05D4\u05DE\u05E7\u05D5\u05D3\u05D3 \u05DB\u05D7\u05D5\u05E7.
- \u05D4\u05E7\u05E4\u05D3 \u05DC\u05E1\u05D9\u05D9\u05DD \u05D1\u05D0\u05E4\u05E9\u05E8\u05D5\u05D9\u05D5\u05EA \u05E4\u05E2\u05D5\u05DC\u05D4 \u05E7\u05D5\u05E0\u05E7\u05E8\u05D8\u05D9\u05D5\u05EA \u05D4\u05DE\u05E1\u05D5\u05DE\u05E0\u05D5\u05EA \u05D1\u05E1\u05DE\u05DC \u{1F532} \u05D1\u05EA\u05D7\u05D9\u05DC\u05EA \u05E9\u05D5\u05E8\u05D4 \u05D7\u05D3\u05E9\u05D4.`;
        const response = await callGeminiWithFallback(userPrompt);
        aiReply = response.text || "";
        if (!aiReply.includes("\u{1F532}")) {
          const isApproval = message.includes("\u05D0\u05D9\u05E9\u05D5\u05E8") || message.includes("\u05D0\u05E9\u05E8") || message.includes("\u05E1\u05D2\u05D5\u05E8") || message.includes("\u05E7\u05D3\u05D9\u05DE\u05D4") || message.includes("\u05DE\u05D0\u05E9\u05E8");
          if (isApproval) {
            aiReply += "<br/><br/>\u{1F532} \u05DE\u05E2\u05D1\u05E8 \u05DC\u05DE\u05E2\u05E7\u05D1 \u05D7\u05D9 \u05D5\u05D4\u05E1\u05D3\u05E8\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u{1F4F1}<br/>\u{1F532} \u05E7\u05D1\u05DC\u05EA \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D1-WhatsApp<br/>\u{1F532} \u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05E2\u05E8\u05EA \u05D2\u05D9\u05E9\u05D4 \u05DE\u05D9\u05D5\u05D7\u05D3\u05EA \u05DC\u05E0\u05D4\u05D2";
          } else {
            aiReply += "<br/><br/>\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD<br/>\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA<br/>\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7";
          }
        }
      } catch (err) {
        console.error("Error calling Gemini for concierge:", err);
      }
    }
    if (!aiReply) {
      const isApproval = message.includes("\u05D0\u05D9\u05E9\u05D5\u05E8") || message.includes("\u05D0\u05E9\u05E8") || message.includes("\u05E1\u05D2\u05D5\u05E8") || message.includes("\u05E7\u05D3\u05D9\u05DE\u05D4") || message.includes("\u05DE\u05D0\u05E9\u05E8") || message.includes("\u05E9\u05D9\u05D3\u05D5\u05DA \u05DE\u05E9\u05D0\u05D9\u05EA");
      if (isApproval) {
        const trkId = "TRK-" + Math.floor(1e3 + Math.random() * 9e3);
        const encodedWa = encodeURIComponent(`\u05E9\u05DC\u05D5\u05DD, \u05DE\u05E6\u05D5\u05E8\u05E3 \u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05DB\u05E8\u05D6 \u05E4\u05EA\u05D5\u05D7 [${trkId}] \u05D1\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il: \u05E1\u05D4"\u05DB \u05DC\u05EA\u05E9\u05DC\u05D5\u05DD \u20AA2,714 \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE. \u05DC\u05E6\u05E4\u05D9\u05D9\u05D4 \u05D5\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05D4: https://truck-deal.vercel.app/?view=driver&moveId=${trkId}`);
        aiReply = `\u05DE\u05E2\u05D5\u05DC\u05D4! \u05D4\u05D4\u05D6\u05DE\u05E0\u05D4 \u05D0\u05D5\u05E9\u05E8\u05D4 \u05D5\u05D4\u05DE\u05DB\u05E8\u05D6 \u05E9\u05D5\u05D3\u05E8 \u05DE\u05D9\u05D9\u05D3\u05D9\u05EA \u05DC\u05DE\u05D5\u05D1\u05D9\u05DC\u05D9\u05DD \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD \u05D1\u05D0\u05D6\u05D5\u05E8\u05DA.<br/><br/>\u{1F4CB} <b>\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05DB\u05E8\u05D6 [${trkId}]:</b><br/>\u2022 <b>\u05E1\u05D8\u05D8\u05D5\u05E1:</b> \u05DE\u05DB\u05E8\u05D6 \u05E4\u05EA\u05D5\u05D7 \u05DC\u05E0\u05D4\u05D2\u05D9\u05DD (Bidding) \u{1F7E2}<br/>\u2022 <b>\u05E1\u05D5\u05D2 \u05E4\u05E2\u05D9\u05DC\u05D5\u05EA:</b> \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA (Spot)<br/>\u2022 <b>\u05DE\u05E1\u05DC\u05D5\u05DC:</b> \u05DB\u05EA\u05D5\u05D1\u05EA \u05DE\u05D5\u05E6\u05D0 \u2794 \u05DB\u05EA\u05D5\u05D1\u05EA \u05D9\u05E2\u05D3 (\u05DC\u05E4\u05D9 \u05E4\u05E8\u05D8\u05D9 \u05D4\u05D4\u05D6\u05DE\u05E0\u05D4)<br/>\u2022 <b>\u05E6\u05D9 \u05DE\u05E9\u05D5\u05D1\u05E5:</b> \u05DE\u05E9\u05D0\u05D9\u05EA \u05E1\u05D2\u05D5\u05E8\u05D4 \u05E2\u05DD \u05E8\u05DE\u05E4\u05D4 \u05D4\u05D9\u05D3\u05E8\u05D0\u05D5\u05DC\u05D9\u05EA (5.5-7.5 \u05D8\u05D5\u05DF)<br/>\u2022 <b>\u05E4\u05D9\u05E8\u05D5\u05D8 \u05DE\u05D8\u05E2\u05DF \u05D5\u05DE\u05E9\u05E7\u05DC:</b> \u05EA\u05DB\u05D5\u05DC\u05EA \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DC\u05E4\u05D9 \u05D0\u05E4\u05D9\u05D5\u05DF<br/>\u2022 <b>\u05E1\u05D9\u05DB\u05D5\u05DD \u05EA\u05DE\u05D7\u05D5\u05E8 \u05E0\u05E2\u05D5\u05DC:</b><br/>  - \u05E2\u05DC\u05D5\u05EA \u05D1\u05D9\u05E6\u05D5\u05E2 \u05E0\u05D4\u05D2: \u20AA2,000<br/>  - \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA (15%): \u20AA300<br/>  - \u05E1\u05D4"\u05DB \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE: \u20AA2,300<br/>  - \u05DE\u05E2"\u05DE (18%): \u20AA414<br/>  - <b>\u05DE\u05D7\u05D9\u05E8 \u05E1\u05D5\u05E4\u05D9 \u05DB\u05D5\u05DC\u05DC \u05DE\u05E2"\u05DE: \u20AA2,714</b><br/>\u2022 <b>\u05D6\u05DE\u05E0\u05D9 \u05D1\u05D9\u05E6\u05D5\u05E2:</b> \u05EA\u05D9\u05D0\u05D5\u05DD \u05DE\u05D5\u05E2\u05D3 \u05DE\u05D5\u05DC \u05D4\u05E0\u05D4\u05D2 \u05D4\u05D6\u05D5\u05DB\u05D4 \u05D1\u05DE\u05DB\u05E8\u05D6<br/><br/>\u{1F517} <b>\u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD \u05DC\u05E4\u05E2\u05D5\u05DC\u05D4 \u05D9\u05E9\u05D9\u05E8\u05D4:</b><br/>\u2022 \u{1F4CD} <b>\u05DE\u05E2\u05E7\u05D1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05E7\u05D3\u05DE\u05D4 \u05DC\u05DC\u05E7\u05D5\u05D7:</b><br/>https://truck-deal.vercel.app/?view=tracking&moveId=${trkId}<br/>\u2022 \u{1F69B} <b>\u05DB\u05E0\u05D9\u05E1\u05EA \u05E0\u05D4\u05D2\u05D9\u05DD \u05D5\u05D4\u05D2\u05E9\u05EA \u05D4\u05E6\u05E2\u05D5\u05EA:</b><br/>https://truck-deal.vercel.app/?view=driver&moveId=${trkId}<br/>\u2022 \u{1F4F2} <b>\u05E9\u05D9\u05D3\u05D5\u05E8 \u05D4\u05DE\u05DB\u05E8\u05D6 \u05D1\u05D5\u05D5\u05D0\u05D8\u05E1\u05D0\u05E4:</b><br/>https://api.whatsapp.com/send?text=${encodedWa}<br/><br/>\u05D0\u05D9\u05DA \u05EA\u05E8\u05E6\u05D4 \u05DC\u05D4\u05DE\u05E9\u05D9\u05DA \u05DB\u05E2\u05EA?<br/>\u{1F532} \u05DE\u05E2\u05D1\u05E8 \u05DC\u05DE\u05E2\u05E7\u05D1 \u05D7\u05D9 \u05D5\u05D4\u05E1\u05D3\u05E8\u05EA \u05DE\u05E7\u05D3\u05DE\u05D4 \u{1F4F1}<br/>\u{1F532} \u05E7\u05D1\u05DC\u05EA \u05E1\u05D9\u05DB\u05D5\u05DD \u05D4\u05D6\u05DE\u05E0\u05D4 \u05D1-WhatsApp<br/>\u{1F532} \u05D4\u05D5\u05E1\u05E4\u05EA \u05D4\u05E2\u05E8\u05EA \u05D2\u05D9\u05E9\u05D4 \u05DE\u05D9\u05D5\u05D7\u05D3\u05EA \u05DC\u05E0\u05D4\u05D2`;
      } else if (message.includes("\u05DB\u05DE\u05D4 \u05E2\u05D5\u05DC\u05D4") || message.includes("\u05DE\u05D7\u05D9\u05E8") || message.includes("\u05E2\u05DC\u05D5\u05EA") || message.includes("\u05EA\u05DE\u05D7\u05D5\u05E8")) {
        aiReply = '\u05D1\u05D4\u05EA\u05D0\u05DD \u05DC\u05DE\u05D5\u05D3\u05DC \u05D4\u05EA\u05DE\u05D7\u05D5\u05E8 \u05D4\u05E9\u05E7\u05D5\u05E3 \u05E9\u05DC "\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il":<br/>\u2022 <b>\u05E2\u05DC\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1 \u05E0\u05D4\u05D2 \u05D5\u05D3\u05DC\u05E7</b>: \u05E0\u05E2\u05D4 \u05D1\u05D9\u05DF \u20AA650 \u05DC\u05DE\u05E1\u05D7\u05E8\u05D9\u05EA \u05D5\u05E2\u05D3 \u20AA2,700 \u05DC\u05DE\u05E9\u05D0\u05D9\u05EA \u05E8\u05DE\u05E4\u05D4<br/>\u2022 <b>\u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA</b>: 15% \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA (\u05D0\u05D5 10% \u05DC\u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2)<br/>\u2022 <b>\u05E9\u05E7\u05D9\u05E4\u05D5\u05EA \u05DE\u05DC\u05D0\u05D4</b>: \u05E2\u05DC\u05D5\u05EA \u05D1\u05E1\u05D9\u05E1 + \u05E2\u05DE\u05DC\u05EA \u05DE\u05E2\u05E8\u05DB\u05EA = \u05DE\u05D7\u05D9\u05E8 \u05DC\u05E4\u05E0\u05D9 \u05DE\u05E2"\u05DE \u2794 \u05DE\u05D7\u05D9\u05E8 \u05E1\u05D5\u05E4\u05D9 \u05DB\u05D5\u05DC\u05DC 18% \u05DE\u05E2"\u05DE \u05DB\u05D7\u05D5\u05E7.<br/><br/>\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD<br/>\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA<br/>\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7';
      } else if (message.includes("\u05DE\u05E0\u05D5\u05E3") || message.includes("\u05DE\u05E9\u05D8\u05D7") || message.includes("\u05DB\u05D1\u05D3") || message.includes("\u05D1\u05DC\u05D5\u05E7\u05D9\u05DD")) {
        aiReply = "\u05DE\u05E9\u05D0\u05D9\u05EA \u05DE\u05E0\u05D5\u05E3 (12-15 \u05D8\u05D5\u05DF) \u05DE\u05D9\u05D5\u05E2\u05D3\u05EA \u05D0\u05DA \u05D5\u05E8\u05E7 \u05DC\u05DE\u05D8\u05E2\u05E0\u05D9\u05DD \u05DB\u05D1\u05D3\u05D9\u05DD (\u05DE\u05E2\u05DC 1.5 \u05D8\u05D5\u05DF, \u05DE\u05E9\u05D8\u05D7\u05D9\u05DD, \u05D1\u05DC\u05D5\u05EA) \u05D0\u05D5 \u05E4\u05E8\u05D9\u05E7\u05D4 \u05DC\u05D2\u05D5\u05D1\u05D4/\u05DE\u05E8\u05E4\u05E1\u05D5\u05EA \u05DC\u05DC\u05D0 \u05DE\u05E2\u05DC\u05D9\u05EA. \u05E2\u05D1\u05D5\u05E8 \u05D4\u05D5\u05D1\u05DC\u05D5\u05EA \u05E7\u05DC\u05D5\u05EA \u05E0\u05D7\u05E1\u05D5\u05DD \u05E9\u05D9\u05D1\u05D5\u05E5 \u05DE\u05E0\u05D5\u05E3 \u05D5\u05E0\u05E9\u05D1\u05E5 \u05DE\u05E9\u05D0\u05D9\u05EA \u05E1\u05D2\u05D5\u05E8\u05D4 \u05D0\u05D5 \u05DE\u05E1\u05D7\u05E8\u05D9\u05EA.<br/><br/>\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD<br/>\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA<br/>\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7";
      } else if (message.includes("\u05D7\u05DC\u05D5\u05E7\u05D4") || message.includes("\u05E2\u05E1\u05E7") || message.includes("b2b") || message.includes("\u05D4\u05E4\u05E6\u05D4") || message.includes("\u05E8\u05E9\u05EA")) {
        aiReply = "\u05E2\u05D1\u05D5\u05E8 \u05E7\u05D5\u05D5\u05D9 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2\u05D9\u05DD \u05DC\u05E2\u05E1\u05E7\u05D9\u05DD \u05D5\u05E8\u05E9\u05EA\u05D5\u05EA \u05E9\u05D9\u05D5\u05D5\u05E7 (B2B, Multi-drop): \u05D4\u05EA\u05DE\u05D7\u05D5\u05E8 \u05DE\u05D7\u05D5\u05E9\u05D1 \u05DC\u05E4\u05D9 \u05D9\u05D5\u05DD \u05E2\u05D1\u05D5\u05D3\u05D4 \u05D5\u05DE\u05E9\u05DE\u05E8\u05EA \u05DE\u05DC\u05D0\u05D4 + \u05D3\u05DC\u05E7 \u05D5\u05E0\u05E7\u05D5\u05D3\u05D5\u05EA \u05E4\u05E8\u05D9\u05E7\u05D4, \u05E2\u05DD \u05E2\u05DE\u05DC\u05EA \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05D4 \u05DE\u05D5\u05E4\u05D7\u05EA\u05EA \u05E9\u05DC 10% \u05D1\u05DC\u05D1\u05D3.<br/><br/>\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7<br/>\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA<br/>\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD";
      } else {
        aiReply = '\u05E9\u05DC\u05D5\u05DD, \u05D0\u05E0\u05D9 <b>Truk AI Dispatcher</b> \u2014 \u05D4\u05E1\u05D3\u05E8\u05DF, \u05D4\u05DE\u05EA\u05DE\u05D7\u05E8 \u05D5\u05DE\u05E0\u05D4\u05DC \u05D4\u05EA\u05E4\u05E2\u05D5\u05DC \u05D4\u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9 \u05D4\u05E8\u05D0\u05E9\u05D9 \u05E9\u05DC \u05E4\u05DC\u05D8\u05E4\u05D5\u05E8\u05DE\u05EA "\u05D8\u05E8\u05D0\u05E7 \u05D3\u05D9\u05DC il". \u05D3\u05D5\u05DE\u05D9\u05D9\u05DF \u05E4\u05E2\u05D9\u05DC: https://truck-deal.vercel.app/<br/>\u05D0\u05E0\u05D9 \u05DB\u05D0\u05DF \u05DC\u05D0\u05E4\u05D9\u05D9\u05DF \u05D0\u05EA \u05D4\u05E6\u05D5\u05E8\u05DA \u05D4\u05DC\u05D5\u05D2\u05D9\u05E1\u05D8\u05D9, \u05DC\u05D4\u05EA\u05D0\u05D9\u05DD \u05D0\u05EA \u05E6\u05D9 \u05D4\u05E8\u05DB\u05D1 \u05D4\u05DE\u05D3\u05D5\u05D9\u05E7, \u05DC\u05D4\u05E6\u05D9\u05D2 \u05EA\u05DE\u05D7\u05D5\u05E8 \u05E9\u05E7\u05D5\u05E3, \u05DC\u05E1\u05D2\u05D5\u05E8 \u05DE\u05DB\u05E8\u05D6 \u05D5\u05DC\u05D4\u05E0\u05E4\u05D9\u05E7 \u05DC\u05D9\u05E0\u05E7\u05D9 \u05E7\u05E1\u05DD \u05D3\u05D9\u05E0\u05DE\u05D9\u05D9\u05DD \u05DC\u05DE\u05E2\u05E7\u05D1 \u05D5\u05DC\u05E0\u05D4\u05D2\u05D9\u05DD.<br/><br/>\u{1F532} \u05D1\u05D3\u05D9\u05E7\u05EA \u05D4\u05EA\u05D0\u05DE\u05EA \u05DE\u05E0\u05D5\u05E3 \u05DC\u05DE\u05D9\u05E7\u05D5\u05DD<br/>\u{1F532} \u05E4\u05EA\u05D9\u05D7\u05EA \u05DE\u05DB\u05E8\u05D6 \u05DC\u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05D6\u05D3\u05DE\u05E0\u05EA<br/>\u{1F532} \u05EA\u05D9\u05D0\u05D5\u05DD \u05E7\u05D5 \u05D7\u05DC\u05D5\u05E7\u05D4 \u05E7\u05D1\u05D5\u05E2 \u05DC\u05E2\u05E1\u05E7';
      }
    }
    const trkIdMatch = aiReply.match(/TRK-\d+/);
    if (trkIdMatch) {
      const detectedId = trkIdMatch[0];
      const moves = readDatabase(MOVES_FILE);
      if (!moves.some((m) => m.id === detectedId)) {
        moves.push({
          id: detectedId,
          clientName: "\u05DC\u05E7\u05D5\u05D7 Truk Dealil IL",
          clientPhone: "050-1234567",
          clientEmail: "truck.dealil@gmail.com",
          companyName: "",
          originAddress: "\u05D0\u05D6\u05D5\u05E8 \u05D4\u05DE\u05E8\u05DB\u05D6, \u05E7\u05D5\u05DE\u05D4 2",
          destAddress: "\u05D9\u05E2\u05D3 \u05E4\u05E8\u05D9\u05E7\u05D4, \u05E7\u05D5\u05DE\u05D4 2",
          moveDate: new Date(Date.now() + 864e5).toISOString().split("T")[0],
          moveTime: "10:00",
          moveType: "apartment",
          floor: 2,
          hasElevator: true,
          elevatorDetails: { sofaFits: true, fridgeFits: true },
          truckAccess: "easy",
          craneNeeded: "no",
          items: [
            { id: "item_disp_1", name: "\u05EA\u05DB\u05D5\u05DC\u05EA \u05D4\u05D5\u05D1\u05DC\u05D4 \u05DE\u05DC\u05D0\u05D4 \u05DC\u05E4\u05D9 \u05D0\u05E4\u05D9\u05D5\u05DF \u05E1\u05D3\u05E8\u05DF AI", category: "furniture", quantity: 1 }
          ],
          images: [],
          createdAt: (/* @__PURE__ */ new Date()).toISOString(),
          status: "bidding",
          paymentStatus: "pending_deposit",
          clientApprovedForBilling: false,
          driverBids: [],
          aiAnalysis: {
            estimatedPriceRange: "\u20AA2,000 - \u20AA2,800",
            difficultyScore: 5,
            recommendations: ["\u05DE\u05DB\u05E8\u05D6 \u05E4\u05EA\u05D5\u05D7 \u05DC\u05E0\u05D4\u05D2\u05D9\u05DD \u05D5\u05E1\u05E4\u05E7\u05D9\u05DD \u05DE\u05D5\u05E8\u05E9\u05D9\u05DD", "\u05DE\u05E2\u05E7\u05D1 \u05D3\u05D9\u05D2\u05D9\u05D8\u05DC\u05D9 \u05D1\u05D6\u05DE\u05DF \u05D0\u05DE\u05EA \u05E4\u05E2\u05D9\u05DC"],
            summary: `\u05DB\u05E8\u05D8\u05D9\u05E1 \u05D4\u05D5\u05D1\u05DC\u05D4 \u05D5\u05DE\u05DB\u05E8\u05D6 [${detectedId}] \u05E9\u05D5\u05D3\u05E8 \u05D1\u05D4\u05E6\u05DC\u05D7\u05D4`
          }
        });
        writeDatabase(MOVES_FILE, moves);
      }
    }
    const aiMsg = {
      id: "msg_" + Math.random().toString(36).substr(2, 9),
      sender: "ai",
      text: aiReply,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (driveLink) {
      aiMsg["driveLink"] = driveLink;
    }
    history.push(aiMsg);
    writeDatabase(CONCIERGE_CHATS_FILE, history);
    res.json({ reply: aiReply, driveLink });
  } catch (err) {
    console.error("Error in concierge chat API:", err);
    res.status(500).json({ error: "\u05E9\u05D2\u05D9\u05D0\u05D4 \u05D1\u05E2\u05D9\u05D1\u05D5\u05D3 \u05D1\u05E7\u05E9\u05EA \u05D4-AI" });
  }
});
app.use((err, req, res, next) => {
  console.error("[API Server Error]:", err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || "\u05E9\u05D2\u05D9\u05D0\u05EA \u05E9\u05E8\u05EA \u05E4\u05E0\u05D9\u05DE\u05D9\u05EA",
      status: 500
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL && process.env.NODE_ENV !== "production") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Truk Dealil IL Fullstack Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Truk Dealil IL Production Server running on port ${PORT}`);
    });
  }
}
if (!process.env.VERCEL) {
  startServer();
}
var server_default = app;

// api/index.ts
var index_default = server_default;
export {
  index_default as default
};
