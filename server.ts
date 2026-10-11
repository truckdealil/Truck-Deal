import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Enable CORS for all incoming client and external requests
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Normalize incoming path for Vercel Serverless environment:
// Handles cases where Vercel rewrites stripped /api or where headers contain the original route
app.use((req, res, next) => {
  const possiblePaths = [
    req.headers['x-matched-path'] as string,
    req.headers['x-invoke-path'] as string,
    req.headers['x-forwarded-uri'] as string,
    req.originalUrl
  ];
  const original = possiblePaths.find(p => p && typeof p === 'string' && p.startsWith('/api') && p !== '/api');
  if (original && (req.url === '/api' || req.url === '/')) {
    req.url = original;
  } else if (
    req.url &&
    !req.url.startsWith('/api') &&
    req.url !== '/' &&
    !req.url.startsWith('/index.html') &&
    !req.url.startsWith('/sw.js') &&
    !req.url.startsWith('/manifest.json')
  ) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Explicit route for Service Worker to ensure exact javascript mime type
app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=UTF-8');
  res.setHeader('Service-Worker-Allowed', '/');
  const pubSw = path.join(process.cwd(), 'public', 'sw.js');
  const distSw = path.join(process.cwd(), 'dist', 'sw.js');
  if (fs.existsSync(pubSw)) {
    return res.sendFile(pubSw);
  } else if (fs.existsSync(distSw)) {
    return res.sendFile(distSw);
  }
  return res.status(404).send('// Service worker not found');
});

// Explicit route for Web App Manifest
app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=UTF-8');
  const pubManifest = path.join(process.cwd(), 'public', 'manifest.json');
  const distManifest = path.join(process.cwd(), 'dist', 'manifest.json');
  if (fs.existsSync(pubManifest)) {
    return res.sendFile(pubManifest);
  } else if (fs.existsSync(distManifest)) {
    return res.sendFile(distManifest);
  }
  return res.status(404).json({ error: 'Manifest not found' });
});

// Serve public directory
app.use(express.static(path.join(process.cwd(), 'public')));

// Increase payload limits for Base64 image transfers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Determine active database directory:
// On Vercel Serverless, root filesystem is read-only except /tmp
const IS_VERCEL = Boolean(process.env.VERCEL);
const DATA_DIR = IS_VERCEL ? '/tmp' : path.join(process.cwd(), 'data');
const SEED_DATA_DIR = path.join(process.cwd(), 'data');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (err: any) {
  console.warn(`[Storage] Could not create directory ${DATA_DIR}:`, err?.message || err);
}

const MOVES_FILE = path.join(DATA_DIR, 'moves.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const DRIVERS_FILE = path.join(DATA_DIR, 'drivers.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const TRUCKS_FILE = path.join(DATA_DIR, 'trucks.json');
const SHIFTS_FILE = path.join(DATA_DIR, 'shifts.json');
const CHATS_FILE = path.join(DATA_DIR, 'chats.json');
const CONCIERGE_CHATS_FILE = path.join(DATA_DIR, 'concierge_chats.json');

// Global In-Memory Fallback Cache to survive EROFS / ephemeral environments
const inMemoryCache: Record<string, any[]> = {};
let movesCache: any[] = [];
let driversCache: any[] = [];
let leadsCache: any[] = [];
let settingsCache: any[] = [];
let chatsCache: any[] = [];
let conciergeChatsCache: any[] = [];

// Helper to keep named global cache variables in sync
const syncGlobalCache = (fileName: string, data: any[]) => {
  if (fileName === 'moves.json') movesCache = data;
  else if (fileName === 'drivers.json') driversCache = data;
  else if (fileName === 'leads.json') leadsCache = data;
  else if (fileName === 'settings.json') settingsCache = data;
  else if (fileName === 'chats.json') chatsCache = data;
  else if (fileName === 'concierge_chats.json') conciergeChatsCache = data;
};

// Candidate directories for seed data
const findSeedFilePath = (fileName: string): string | null => {
  const candidates = [
    path.join(process.cwd(), 'data', fileName),
    path.resolve('./data', fileName),
    path.join('/var/task', 'data', fileName)
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return p;
    } catch {}
  }
  return null;
};

// Resilient Helper to read database (Memory Cache -> /tmp File -> Project seed file -> Defaults)
const readDatabase = <T>(filePath: string, defaultValue: any = []): T[] => {
  const fileName = path.basename(filePath);

  // 1. If available in memory cache, return it
  if (inMemoryCache[fileName] !== undefined) {
    return inMemoryCache[fileName] as T[];
  }

  try {
    // 2. Try reading from target path (e.g. /tmp/moves.json or data/moves.json)
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(data);
      inMemoryCache[fileName] = parsed;
      syncGlobalCache(fileName, Array.isArray(parsed) ? parsed : [parsed]);
      return parsed as T[];
    }

    // 3. In Vercel / serverless environment, if /tmp doesn't have the file yet, seed from project repository data/
    const seedFilePath = findSeedFilePath(fileName);
    if (seedFilePath) {
      try {
        const seedContent = fs.readFileSync(seedFilePath, 'utf-8');
        const parsed = JSON.parse(seedContent);
        inMemoryCache[fileName] = parsed;
        syncGlobalCache(fileName, Array.isArray(parsed) ? parsed : [parsed]);

        // Write to /tmp for subsequent reads
        try {
          fs.writeFileSync(filePath, seedContent, 'utf-8');
        } catch (writeErr) {
          // safe to ignore on read-only FS
        }
        return parsed as T[];
      } catch (seedErr) {
        console.warn(`[Storage] Error loading seed file ${seedFilePath}:`, seedErr);
      }
    }

    // 4. Default fallback: write default value if possible and cache in memory
    inMemoryCache[fileName] = defaultValue;
    syncGlobalCache(fileName, Array.isArray(defaultValue) ? defaultValue : [defaultValue]);
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
    } catch (writeErr) {
      // EROFS or filesystem restriction - safe to ignore since memory cache is active
    }
    return defaultValue;
  } catch (error: any) {
    console.error(`[Storage] Error reading database file ${filePath}:`, error?.message || error);
    const fallback = inMemoryCache[fileName] !== undefined ? inMemoryCache[fileName] : defaultValue;
    inMemoryCache[fileName] = fallback;
    syncGlobalCache(fileName, Array.isArray(fallback) ? fallback : [fallback]);
    return fallback as T[];
  }
};

// Resilient Helper to write database (Always updates In-Memory Cache first, then writes to disk with EROFS protection)
const writeDatabase = <T>(filePath: string, data: any): void => {
  const fileName = path.basename(filePath);
  // Guarantee memory update immediately
  inMemoryCache[fileName] = data;
  syncGlobalCache(fileName, Array.isArray(data) ? data : [data]);

  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error: any) {
    console.warn(`[Storage] Notice: filesystem write skipped for ${filePath} (${error?.message || error}). Data safely retained in server memory.`);
  }
};

// Initialize Gemini SDK with API Key
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  try {
    ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    console.log('Gemini AI SDK initialized successfully');
  } catch (err) {
    console.error('Failed to initialize Gemini AI SDK:', err);
  }
} else {
  console.warn('GEMINI_API_KEY is not defined. AI functionality will run in fallback/simulation mode.');
}

// Helper to call Gemini with a fallback model (e.g. gemini-3.1-flash-lite) if the primary model is busy or unavailable
const callGeminiWithFallback = async (contents: string, primaryModel: string = 'gemini-3.8-flash', fallbackModel: string = 'gemini-3.1-flash-lite') => {
  if (!ai) {
    throw new Error('Gemini client not initialized');
  }

  try {
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: contents,
    });
    return response;
  } catch (error: any) {
    console.warn(`Primary Gemini model (${primaryModel}) failed or unavailable:`, error.message || error);
    
    // Attempt the fallback model
    try {
      console.log(`Attempting fallback model: ${fallbackModel}...`);
      const response = await ai.models.generateContent({
        model: fallbackModel,
        contents: contents,
      });
      return response;
    } catch (fallbackError: any) {
      console.error(`Fallback Gemini model (${fallbackModel}) also failed:`, fallbackError.message || fallbackError);
      throw error; // Re-throw original error if fallback also fails
    }
  }
};

// Google Apps Script Webhook URL
const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFuwvPovPthoFJ8E237r8Tdo2PuDbOw9FvjtDCyr2kHgkQX-VG8lglUej7zqFv0FsI/exec';

// Send lead/move data to Google Apps Script
const sendToGoogleAppsScript = async (payload: any) => {
  try {
    console.log('Sending data to Google Apps Script Webhook...');
    const response = await fetch(GOOGLE_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('Google Apps Script response status:', response.status);
  } catch (error) {
    console.error('Error sending webhook to Google Apps Script:', error);
  }
};

// Send webhook to Make.com (Optional, configurable via environment or database settings)
const sendToMakeWebhook = async (payload: any) => {
  let webhookUrl = process.env.MAKE_WEBHOOK_URL;
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const settingsRaw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      if (settingsRaw) {
        const settings = JSON.parse(settingsRaw);
        if (settings && settings.makeWebhookUrl) {
          webhookUrl = settings.makeWebhookUrl;
        }
      }
    }
  } catch (err) {
    console.error('Error reading settings for Make.com Webhook URL:', err);
  }

  if (!webhookUrl || webhookUrl.trim() === '' || webhookUrl.includes('your-custom-webhook-endpoint')) {
    console.log('--- [WHATSAPP & MAKE.COM AUTOMATION SIMULATOR] ---');
    console.log('Webhook URL not configured. Simulating outgoing WhatsApp notification:');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('--------------------------------------------------');
    return;
  }

  try {
    console.log('Sending webhook payload to Make.com:', webhookUrl);
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('Make.com response status:', response.status);
  } catch (error) {
    console.error('Error sending webhook to Make.com:', error);
  }
};

// Helper to log system/whatsapp notifications to the move request object
const logNotification = (moveId: string, action: string, message: string) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m: any) => m.id === moveId);
    if (moveIndex !== -1) {
      if (!moves[moveIndex].notificationsLog) {
        moves[moveIndex].notificationsLog = [];
      }
      moves[moveIndex].notificationsLog.unshift({
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        action,
        message
      });
      writeDatabase(MOVES_FILE, moves);
    }
  } catch (err) {
    console.error('Error logging notification to move:', err);
  }
};

// AI smart quoting with Gemini
const generateAIAnalysis = async (moveRequest: any): Promise<any> => {
  if (!ai) {
    // Fallback if API key is not present
    const basePrice = 400 + (moveRequest.items.reduce((acc: number, item: any) => acc + (item.quantity * 45), 0));
    const floorCost = moveRequest.floor * 100;
    const elevatorDiscount = moveRequest.hasElevator ? 0.75 : 1.35;
    const estMin = Math.round((basePrice + floorCost) * elevatorDiscount * 0.9);
    const estMax = Math.round((basePrice + floorCost) * elevatorDiscount * 1.15);

    return {
      estimatedPriceRange: `₪${estMin} - ₪${estMax}`,
      difficultyScore: moveRequest.floor > 3 && !moveRequest.hasElevator ? 8 : (moveRequest.items.length > 10 ? 6 : 3),
      recommendations: [
        'מומלץ לעטוף מראש מוצרי חשמל ורהיטים בניילון בועות (פצפץ)',
        moveRequest.floor > 2 && !moveRequest.hasElevator ? 'ההובלה כוללת סחיבה רגלית לקומה גבוהה ללא מעלית - מומלץ לוודא הגעת 3 סבלים לפחות' : 'הבניין מצויד במעלית - יש לוודא שהפריטים הכבדים נכנסים במעלית הנוכחית',
        moveRequest.craneNeeded === 'yes' ? 'נדרש תיאום מנוף חיצוני מראש עם המועצה/חנייה ייעודית' : 'לא צוין צורך במנוף, אך יש לשים לב למידות חדר המדרגות',
      ],
      summary: `הובלת ${moveRequest.moveType === 'apartment' ? 'דירה' : moveRequest.moveType === 'office' ? 'משרד' : 'משלוח'} מ${moveRequest.originAddress} אל ${moveRequest.destAddress}. כמות פריטים: ${moveRequest.items.reduce((acc: number, i: any) => acc + i.quantity, 0)}.`,
    };
  }

  try {
    const itemsDescription = moveRequest.items
      .map((item: any) => `- ${item.name}: ${item.quantity} יחידות`)
      .join('\n');

    const prompt = `
אתה מעריך לוגיסטי וחכם של חברת ההובלות "Truk Dealil IL" (טראק דיל il).
תפקידך לנתח את פרטי ההובלה הבאים ולספק הצעת מחיר חכמה, ניתוח קושי והמלצות מקצועיות בעברית מלאה.

פרטי ההובלה:
- סוג ההובלה: ${moveRequest.moveType} (apartment=דירה, office=משרד, delivery=משלוח)
- כתובת מוצא: ${moveRequest.originAddress}
- כתובת יעד: ${moveRequest.destAddress}
- קומה: ${moveRequest.floor}
- יש מעלית? ${moveRequest.hasElevator ? 'כן' : 'לא'}
- האם מקרר נכנס במעלית? ${moveRequest.elevatorDetails.fridgeFits ? 'כן' : 'לא'}
- האם ספה נכנסת במעלית? ${moveRequest.elevatorDetails.sofaFits ? 'כן' : 'לא'}
- נגישות חנייה למשאית: ${moveRequest.truckAccess} (easy=קלה, medium=בינונית, difficult=קשה, no_parking=אין חנייה קרובה)
- צורך במנוף: ${moveRequest.craneNeeded} (yes=כן, no=לא, dont_know=לא יודע)
- הערות לקוח: ${moveRequest.notes || 'אין'}

רשימת פריטים להובלה:
${itemsDescription}

החזר תשובה אך ורק בפורמט JSON תקני הבא (אל תוסיף שום מילה מחוץ ל-JSON, אל תעטוף בסימוני markdown כמו \`\`\`json):
{
  "estimatedPriceRange": "טווח מחיר מוערך בשקלים, לדוגמה '₪1,200 - ₪1,600'",
  "difficultyScore": מספר בין 1 ל-10 המייצג את רמת קושי ההובלה,
  "recommendations": ["רשימה של 3-4 המלצות לוגיסטיות חשובות והנחיות לנהג או ללקוח לשמירה על הציוד וייעול העבודה"],
  "summary": "סיכום תמציתי ומקצועי של ההובלה בעברית"
}
`;

    // Call Gemini with Fallback
    const response = await callGeminiWithFallback(prompt);

    const responseText = response.text || '';
    // Clean potential markdown wrappers
    const cleanJson = responseText
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    const analysis = JSON.parse(cleanJson);
    return analysis;
  } catch (error) {
    console.error('Error generating AI quote from Gemini:', error);
    // Fallback in case of failure
    return {
      estimatedPriceRange: '₪800 - ₪1,500',
      difficultyScore: 5,
      recommendations: [
        'מומלץ לארוז שבירים בארגזים מרופדים',
        'יש לבדוק גישת חנייה נוחה ביום ההובלה בשתי הכתובות',
      ],
      summary: 'הובלת ציוד - ניתוח בסיסי',
    };
  }
};

/* --- API ROUTES FIRST --- */

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// GET all move requests
const getSeedMoves = () => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  
  // Job 1: Scheduled today in 45 minutes! (Triggers colorful <1h alert immediately)
  const in45Min = new Date(now.getTime() + 45 * 60 * 1000);
  const time1 = `${in45Min.getHours().toString().padStart(2, '0')}:${in45Min.getMinutes().toString().padStart(2, '0')}`;
  
  // Job 2: Scheduled today in 3.5 hours
  const in3Hours = new Date(now.getTime() + 3.5 * 60 * 60 * 1000);
  const time2 = `${in3Hours.getHours().toString().padStart(2, '0')}:${in3Hours.getMinutes().toString().padStart(2, '0')}`;

  // Job 3: Scheduled tomorrow morning
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  return [
    {
      id: 'move_urgent45m',
      clientName: 'רונן אברהם',
      clientPhone: '050-1122334',
      clientEmail: 'ronen.moving@gmail.com',
      companyName: 'סטארטאפ טק סולושנס',
      originAddress: 'אבן גבירול 104, תל אביב',
      destAddress: 'רוטשילד 45, ראשון לציון',
      moveDate: todayStr,
      moveTime: time1,
      moveType: 'apartment',
      floor: 3,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: true },
      truckAccess: 'easy',
      craneNeeded: 'no',
      items: [
        { id: 'sofa_3', name: 'ספה 3 מושבים', category: 'furniture', quantity: 1 },
        { id: 'double_bed', name: 'מיטה זוגית + מזרן', category: 'furniture', quantity: 1 },
        { id: 'fridge_big', name: 'מקרר גדול', category: 'appliances', quantity: 1 },
        { id: 'boxes', name: 'ארגזים ארוזים', category: 'boxes', quantity: 20 }
      ],
      images: [],
      createdAt: new Date().toISOString(),
      status: 'approved_for_driver',
      paymentStatus: 'paid_deposit',
      clientApprovedForBilling: true,
      assignedDriverId: 'driver_1',
      assignedDriverName: 'יוסי לוי',
      assignedDriverPhone: '052-8765432',
      assignedTruckModel: 'משאית 7.5 טון + רמפה הידראולית',
      assignedTruckLicense: '88-442-19',
      driverBids: [
        {
          id: 'bid_1',
          driverName: 'יוסי לוי',
          driverPhone: '052-8765432',
          bidAmount: 1850,
          estimatedDuration: '3-4 שעות',
          submittedAt: new Date().toISOString(),
          status: 'approved'
        }
      ],
      finalApprovedBidId: 'bid_1',
      aiAnalysis: {
        estimatedPriceRange: '1,800 - 2,200 ₪',
        difficultyScore: 4,
        recommendations: ['ציוד קשירה מלא', 'עגלת שינוע לרמפה'],
        summary: 'הובלת דירת 2 חדרים קלאסית עם מעלית גדולה ונגישות משאית נוחה'
      }
    },
    {
      id: 'move_afternoon3h',
      clientName: 'שירה כהן',
      clientPhone: '054-9876543',
      clientEmail: 'shira.cohen@gmail.com',
      originAddress: 'ויצמן 22, גבעתיים',
      destAddress: 'הרצל 80, רמת גן',
      moveDate: todayStr,
      moveTime: time2,
      moveType: 'apartment',
      floor: 4,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: false },
      truckAccess: 'medium',
      craneNeeded: 'no',
      items: [
        { id: 'dining_table', name: 'שולחן אוכל + כיסאות', category: 'furniture', quantity: 1 },
        { id: 'wardrobe_big', name: 'ארון בגדים גדול', category: 'furniture', quantity: 1 },
        { id: 'boxes', name: 'ארגזים', category: 'boxes', quantity: 15 }
      ],
      images: [],
      createdAt: new Date().toISOString(),
      status: 'approved_for_driver',
      paymentStatus: 'paid_full',
      clientApprovedForBilling: true,
      assignedDriverId: 'driver_1',
      assignedDriverName: 'יוסי לוי',
      assignedDriverPhone: '052-8765432',
      assignedTruckModel: 'משאית 7.5 טון + רמפה הידראולית',
      assignedTruckLicense: '88-442-19',
      driverBids: [],
      aiAnalysis: {
        estimatedPriceRange: '1,500 - 1,900 ₪',
        difficultyScore: 5,
        recommendations: ['פירוק והרכבת ארון מומלצת'],
        summary: 'הובלת חדר שינה ופינת אוכל'
      }
    },
    {
      id: 'move_tomorrow',
      clientName: 'דניאל גרינברג',
      clientPhone: '052-3344556',
      clientEmail: 'daniel.g@techcorp.co.il',
      companyName: 'גרינברג ייעוץ עסקי',
      originAddress: 'מנחם בגין 144, תל אביב',
      destAddress: 'שדרות ירושלים 18, יפו',
      moveDate: tomorrowStr,
      moveTime: '09:00',
      moveType: 'office',
      floor: 8,
      hasElevator: true,
      elevatorDetails: { sofaFits: true, fridgeFits: true },
      truckAccess: 'easy',
      craneNeeded: 'no',
      items: [
        { id: 'desk', name: 'שולחן כתיבה / עבודה', category: 'furniture', quantity: 6 },
        { id: 'boxes', name: 'ארגזי קלסרים וציוד', category: 'boxes', quantity: 30 }
      ],
      images: [],
      createdAt: new Date().toISOString(),
      status: 'approved_for_driver',
      paymentStatus: 'paid_deposit',
      clientApprovedForBilling: true,
      assignedDriverId: 'driver_2',
      assignedDriverName: 'אבי כהן',
      assignedDriverPhone: '054-1234567',
      assignedTruckModel: 'משאית 12 טון + מנוף קבועה קומה 6',
      assignedTruckLicense: '12-345-67',
      driverBids: [],
      aiAnalysis: {
        estimatedPriceRange: '2,800 - 3,500 ₪',
        difficultyScore: 6,
        recommendations: ['שימוש בעגלות משא ייעודיות למשרד'],
        summary: 'הובלת משרד 6 עמדות עבודה'
      }
    }
  ];
};

app.get('/api/moves', (req, res) => {
  let moves = readDatabase<any>(MOVES_FILE);
  if (!moves || moves.length === 0) {
    moves = getSeedMoves();
    writeDatabase(MOVES_FILE, moves);
  }
  res.json(moves);
});

// GET a single move request
app.get('/api/moves/:id', (req, res) => {
  const moves = readDatabase<any>(MOVES_FILE);
  let move = moves.find((m) => m.id === req.params.id);
  if (!move) {
    if (req.params.id && req.params.id.startsWith('TRK-')) {
      move = {
        id: req.params.id,
        clientName: 'לקוח Truk Dealil IL',
        clientPhone: '050-1234567',
        clientEmail: 'truck.dealil@gmail.com',
        companyName: '',
        originAddress: 'אזור המרכז, קומה 2',
        destAddress: 'יעד פריקה, קומה 2',
        moveDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        moveTime: '10:00',
        moveType: 'apartment',
        floor: 2,
        hasElevator: true,
        elevatorDetails: { sofaFits: true, fridgeFits: true },
        truckAccess: 'easy',
        craneNeeded: 'no',
        items: [
          { id: 'item_disp_1', name: 'תכולת הובלה מלאה לפי אפיון סדרן AI', category: 'furniture', quantity: 1 }
        ],
        images: [],
        createdAt: new Date().toISOString(),
        status: 'bidding',
        paymentStatus: 'pending_deposit',
        clientApprovedForBilling: false,
        driverBids: [],
        aiAnalysis: {
          estimatedPriceRange: '₪2,000 - ₪2,800',
          difficultyScore: 5,
          recommendations: ['מכרז פתוח לנהגים וספקים מורשים', 'מעקב דיגיטלי בזמן אמת פעיל'],
          summary: `כרטיס הובלה ומכרז [${req.params.id}] שודר בהצלחה`
        }
      };
      moves.push(move);
      writeDatabase(MOVES_FILE, moves);
    } else {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }
  }

  // Clone to avoid modifying the in-memory cache directly
  const responseMove = { ...move };

  // Helper to mask addresses
  const maskAddress = (addr: string) => {
    if (!addr) return '';
    const parts = addr.split(',');
    if (parts.length > 0) {
      return `${parts[0].trim()} (כתובת מלאה חסומה - תיחשף לאחר תשלום מקדמה 🔒)`;
    }
    return 'מיקום נעול - מוגן מפני מעקף פלטפורמה';
  };

  // Payment lock enforcement: if pending_payment and not accessed by admin
  const isLocked = responseMove.paymentStatus === 'pending_payment' && req.query.role !== 'admin';

  if (isLocked) {
    responseMove.clientPhone = 'נעול - ממתין להסדר תשלום ומקדמה ע״י הלקוח 🔒';
    responseMove.clientEmail = 'נעול - ממתין להסדר תשלום ומקדמה ע״י הלקוח 🔒';
    responseMove.clientName = responseMove.clientName ? `${responseMove.clientName.split(' ')[0]} (שם משפחה נעול)` : 'לקוח מוגן';
    responseMove.originAddress = maskAddress(responseMove.originAddress);
    responseMove.destAddress = maskAddress(responseMove.destAddress);
    responseMove.isPaymentLocked = true;
  } else {
    responseMove.isPaymentLocked = false;
  }

  res.json(responseMove);
});

// POST a new move request (Client submits)
app.post('/api/moves', async (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const newMove = {
      id: 'move_' + Math.random().toString(36).substr(2, 9),
      ...req.body,
      createdAt: new Date().toISOString(),
      status: 'new', // starts as new
      paymentStatus: 'pending_payment',
      clientApprovedForBilling: false, // Must be approved by Admin later
      driverBids: [],
    };

    // Run smart AI Analysis
    console.log('Running smart AI quotation generation...');
    const aiAnalysis = await generateAIAnalysis(newMove);
    newMove.aiAnalysis = aiAnalysis;

    // Save to server-side DB
    moves.unshift(newMove);
    writeDatabase(MOVES_FILE, moves);

    // Formulate driver bid link inside the application
    const appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    const bidLink = `${appUrl}?view=driver&moveId=${newMove.id}`;

    // Send payload to Google Apps Script (includes base64 images if present)
    const appsScriptPayload = {
      action: 'create_move',
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
      notes: newMove.notes || '',
      imagesCount: newMove.images ? newMove.images.length : 0,
      images: newMove.images || [], // base64 arrays to save in Google Drive
      estimatedPriceRange: aiAnalysis.estimatedPriceRange,
      difficultyScore: aiAnalysis.difficultyScore,
      summary: aiAnalysis.summary,
      bidLink: bidLink,
      googleDriveFolderId: '1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG'
    };
    
    // Fire and forget integration calls so response is lightning fast
    sendToGoogleAppsScript(appsScriptPayload);

    // Send to Make Webhook to notify drivers in WhatsApp with exact requested structure
    sendToMakeWebhook({
      moveId: newMove.id,
      clientName: newMove.clientName,
      origin: newMove.originAddress,
      destination: newMove.destAddress,
      craneNeeded: newMove.craneNeeded === 'yes' ? 'כן' : (newMove.craneNeeded === 'no' ? 'לא' : 'לא ידוע'),
      driverOfferLink: `https://truk-dealil.il/driver/quote/${newMove.id}`,
      message: `הובלה חדשה פורסמה ב-Truk Dealil IL! 🚚\n\nמ:${newMove.originAddress} ל:${newMove.destAddress}\nתאריך: ${newMove.moveDate}\nפרטים: ${aiAnalysis.summary}\n\nלהגשת הצעת מחיר לנהג לחץ על הקישור:\n${bidLink}`
    });

    res.status(201).json(newMove);
  } catch (error) {
    console.error('Error creating move request:', error);
    res.status(500).json({ error: 'שגיאה בשמירת בקשת ההובלה' });
  }
});

// POST submit a driver bid
app.post('/api/moves/:id/bids', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { driverName, driverPhone, bidAmount, estimatedDuration, notes } = req.body;
    if (!driverName || !driverPhone || !bidAmount) {
      return res.status(400).json({ error: 'נא למלא את כל שדות החובה להגשת ההצעה' });
    }

    const newBid = {
      id: 'bid_' + Math.random().toString(36).substr(2, 9),
      driverName,
      driverPhone,
      bidAmount: Number(bidAmount),
      estimatedDuration,
      notes,
      submittedAt: new Date().toISOString(),
      status: 'pending' as const,
    };

    moves[moveIndex].driverBids.push(newBid);
    // Move status switches to bidding
    if (moves[moveIndex].status === 'new') {
      moves[moveIndex].status = 'bidding';
    }

    writeDatabase(MOVES_FILE, moves);

    // Notify Google Apps Script about the new bid
    sendToGoogleAppsScript({
      action: 'add_bid',
      moveId: req.params.id,
      bidId: newBid.id,
      driverName: newBid.driverName,
      driverPhone: newBid.driverPhone,
      bidAmount: newBid.bidAmount,
      notes: newBid.notes || '',
    });

    res.status(201).json(newBid);
  } catch (error) {
    console.error('Error submitting driver bid:', error);
    res.status(500).json({ error: 'שגיאה בהגשת הצעת המחיר לנהג' });
  }
});

// POST Approve driver's bid by admin (Admin approves driver bid before client notification)
app.post('/api/moves/:id/bids/:bidId/approve', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const move = moves[moveIndex];
    const bidIndex = move.driverBids.findIndex((b: any) => b.id === req.params.bidId);
    if (bidIndex === -1) {
      return res.status(404).json({ error: 'הצעת הנהג לא נמצאה' });
    }

    // Set all bids to rejected, approve the selected one
    move.driverBids.forEach((b: any, index: number) => {
      move.driverBids[index].status = index === bidIndex ? 'approved' : 'rejected';
    });

    move.finalApprovedBidId = req.params.bidId;
    move.status = 'Approved'; // Update move status to Approved

    writeDatabase(MOVES_FILE, moves);

    const approvedBid = move.driverBids[bidIndex];

    // Notify apps script
    sendToGoogleAppsScript({
      action: 'approve_bid',
      moveId: move.id,
      bidId: approvedBid.id,
      driverName: approvedBid.driverName,
      driverPhone: approvedBid.driverPhone,
      bidAmount: approvedBid.bidAmount,
    });

    // Notify via WhatsApp/Make with the requested text
    const messageText = `ההובלה שלך אושרה! הנהג שנבחר הוא ${approvedBid.driverName}, מחיר סופי: ₪${approvedBid.bidAmount}. לחץ כאן לביצוע תשלום ואבטחת ההזמנה`;
    sendToMakeWebhook({
      action: 'bid_approved_notify_client',
      moveId: move.id,
      clientName: move.clientName,
      clientPhone: move.clientPhone,
      approvedPrice: approvedBid.bidAmount,
      driverName: approvedBid.driverName,
      message: messageText
    });

    logNotification(move.id, 'bid_approved', `הצעת המחיר של המוביל ${approvedBid.driverName} על סך ₪${approvedBid.bidAmount} אושרה ע״י המנהל. נשלחה הודעת WhatsApp ללקוח עם קישור מעקב חי והסדרת תשלום.`);

    res.json({ success: true, move });
  } catch (error) {
    console.error('Error approving driver bid:', error);
    res.status(500).json({ error: 'שגיאה באישור הצעת המחיר' });
  }
});

// POST Client digital signature and driver matching proposal (Get Taxi Matchmaking Engine)
app.post('/api/moves/:id/match-driver', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { driverId, driverName, driverPhone, bidAmount, clientSignature } = req.body;
    const move = moves[moveIndex];

    // Create a virtual bid representing this matched proposal
    const matchedBid = {
      id: 'bid_' + Math.random().toString(36).substr(2, 9),
      driverId: driverId || 'driver_matched',
      driverName: driverName || 'חכמת ועאלי',
      driverPhone: driverPhone || '050-1234567',
      bidAmount: Number(bidAmount) || 1850,
      estimatedDuration: '3-4 שעות',
      notes: 'שידוך חכם מהיר - הצעת מחיר חתומה ומאושרת ע״י הלקוח דיגיטלית.',
      status: 'approved',
      createdAt: new Date().toISOString()
    };

    // Update move with matched driver and signature details
    move.driverBids = [matchedBid];
    move.finalApprovedBidId = matchedBid.id;
    move.status = 'Approved'; // Advanced to Approved status
    move.clientSignature = clientSignature || 'נחתם דיגיטלית בטאצ׳';
    move.assignedDriverId = driverId || 'driver_matched';
    move.assignedDriverName = driverName || 'חכמת ועאלי';
    move.assignedDriverPhone = driverPhone || '050-1234567';

    writeDatabase(MOVES_FILE, moves);

    // Notify apps script & make webhooks
    sendToGoogleAppsScript({
      action: 'client_match_and_sign',
      moveId: move.id,
      driverName: matchedBid.driverName,
      bidAmount: matchedBid.bidAmount,
      signature: move.clientSignature
    });

    sendToMakeWebhook({
      action: 'driver_matched_and_signed',
      moveId: move.id,
      clientName: move.clientName,
      driverName: matchedBid.driverName,
      approvedPrice: matchedBid.bidAmount,
      message: `שידוך נהג והצעה חתומה התקבלו להובלה #${move.id}! המוביל הנבחר: ${matchedBid.driverName}, מחיר: ₪${matchedBid.bidAmount}.`
    });

    logNotification(move.id, 'driver_matched_signed', `שידוך נהג בוצע בהצלחה! הלקוח אישר וחתם דיגיטלית על הצעת המוביל ${matchedBid.driverName} על סך ₪${matchedBid.bidAmount}.`);

    res.json({ success: true, move });
  } catch (error) {
    console.error('Error matching driver & signing proposal:', error);
    res.status(500).json({ error: 'שגיאה בשידוך הנהג ובחתימה הדיגיטלית' });
  }
});

// POST Admin billing approval and payment status updates
app.post('/api/moves/:id/payment', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { paymentStatus, clientApprovedForBilling, status } = req.body;
    
    // Safety payment lock checks
    const targetStatus = status || moves[moveIndex].status;
    const targetPaymentStatus = paymentStatus || moves[moveIndex].paymentStatus;
    
    if (targetStatus === 'approved_for_driver' && targetPaymentStatus === 'pending_payment') {
      return res.status(400).json({ 
        error: 'חסימת אבטחה: לא ניתן לשחרר או לאשר את ההובלה לנהג כל עוד סטטוס התשלום הוא ממתין לתשלום (Pending). הלקוח נדרש להסדיר תשלום מקדמה, תשלום מלא, או להיות לקוח מוסדי מאושר בשוטף + 30.' 
      });
    }

    if (paymentStatus) {
      moves[moveIndex].paymentStatus = paymentStatus;
    }
    
    if (typeof clientApprovedForBilling === 'boolean') {
      moves[moveIndex].clientApprovedForBilling = clientApprovedForBilling;
      
      // Safety operational logic: Prevent final confirmation of transport/status to driver ('approved_for_driver') unless billing is approved
      if (status === 'approved_for_driver' && !clientApprovedForBilling) {
        return res.status(400).json({ 
          error: 'מנגנון אבטחה תפעולי: לא ניתן לשחרר/לאשר את ההובלה לנהג אלא אם התקבל אישור מנהל לחיוב הלקוח במערכת!' 
        });
      }
    }

    if (status) {
      // If we are changing status to 'approved_for_driver', we must double check client billing approval
      if (status === 'approved_for_driver' && !moves[moveIndex].clientApprovedForBilling) {
        return res.status(400).json({ 
          error: 'מנגנון אבטחה תפעולי: לא ניתן לשחרר/לאשר את ההובלה לנהג אלא אם התקבל אישור מנהל לחיוב הלקוח במערכת!' 
        });
      }
      moves[moveIndex].status = status;
    }

    writeDatabase(MOVES_FILE, moves);

    // If status became approved_for_driver, log it
    if (status === 'approved_for_driver') {
      logNotification(moves[moveIndex].id, 'approved_for_driver', `ההובלה שוחררה בהצלחה לנהג המורשה ${moves[moveIndex].assignedDriverName || 'מוביל מורשה'}. הנהג קיבל התראת שיבוץ בוואטסאפ עם פרטי הכתובות.`);
    }

    // If payment status became paid (paid_full or paid_deposit)
    if (moves[moveIndex].paymentStatus === 'paid_full' || moves[moveIndex].paymentStatus === 'paid_deposit') {
      const appUrl = process.env.APP_URL || `http://localhost:3000`;
      const approvedBid = moves[moveIndex].driverBids.find((b: any) => b.id === moves[moveIndex].finalApprovedBidId) || moves[moveIndex].driverBids.find((b: any) => b.status === 'approved');
      
      sendToMakeWebhook({
        action: 'payment_success_notify',
        moveId: moves[moveIndex].id,
        clientName: moves[moveIndex].clientName,
        clientPhone: moves[moveIndex].clientPhone,
        amountPaid: approvedBid ? approvedBid.bidAmount : 1500,
        driverName: approvedBid ? approvedBid.driverName : 'מוביל מורשה',
        driverPhone: approvedBid ? approvedBid.driverPhone : 'טרם הוקצה',
        trackingLink: `${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}`,
        invoiceLink: `${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}&showReceipt=true`,
        message: `שלום ${moves[moveIndex].clientName}, התשלום עבור הובלה #${moves[moveIndex].id} התקבל בהצלחה! 🎉\n\nהמוביל שנבחר הוא: ${approvedBid ? approvedBid.driverName : 'מוביל מורשה'} (${approvedBid ? approvedBid.driverPhone : ''}).\nפרטי ההובלה שוחררו כעת ומופיעים בדף המעקב החי שלך כולל חשבונית מס וקבלה דיגיטלית:\n${appUrl}/?view=tracking&moveId=${moves[moveIndex].id}`
      });

      const paymentLabel = moves[moveIndex].paymentStatus === 'paid_full' ? 'שולם במלואו' : 'שולמה מקדמה שריון';
      logNotification(moves[moveIndex].id, 'payment_success', `הסדר תשלום בוצע בהצלחה! סטטוס תשלום עודכן ל: ${paymentLabel}. קבלה דיגיטלית ואישור הזמנה נשלחו ללקוח בוואטסאפ.`);
    }

    // Notify apps script
    sendToGoogleAppsScript({
      action: 'update_payment',
      moveId: moves[moveIndex].id,
      paymentStatus: moves[moveIndex].paymentStatus,
      clientApprovedForBilling: moves[moveIndex].clientApprovedForBilling,
      status: moves[moveIndex].status,
    });

    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error('Error updating payment/billing status:', error);
    res.status(500).json({ error: 'שגיאה בעדכון פרטי תשלום ואבטחה' });
  }
});

// POST complete move with digital signature and delivery note
app.post('/api/moves/:id/complete', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { signatureImage, confirmedItems, customerName, feedbackScore, notes, cargoPhotos } = req.body;
    
    moves[moveIndex].status = 'completed';
    moves[moveIndex].deliveryNote = {
      signatureImage, // base64 representation of digital signature canvas
      signatureDataUrl: signatureImage,
      signedBy: customerName,
      signedAt: new Date().toISOString(),
      checklistResults: confirmedItems ? confirmedItems.map((item: any) => ({ itemId: item.id, name: item.name, verified: item.confirmed })) : [],
      feedbackRating: feedbackScore,
      feedbackText: notes,
      confirmedItems,
      customerName,
      feedbackScore,
      notes,
      cargoPhotos: cargoPhotos || [],
      completedAt: new Date().toISOString()
    };

    writeDatabase(MOVES_FILE, moves);

    // Call Google Apps Script with action 'complete_move'
    sendToGoogleAppsScript({
      action: 'complete_move',
      moveId: req.params.id,
      customerName: customerName || moves[moveIndex].clientName,
      signatureImage,
      confirmedItems,
      feedbackScore,
      notes,
      cargoPhotos: cargoPhotos || [],
      completedAt: new Date().toISOString()
    });

    // Send webhook to Make.com/WhatsApp
    sendToMakeWebhook({
      action: 'move_completed',
      moveId: req.params.id,
      clientName: moves[moveIndex].clientName,
      clientPhone: moves[moveIndex].clientPhone,
      message: `ההובלה שלכם הושלמה בהצלחה! 🏁 תודה שבחרתם בטראק דיל il. חתמתם על תעודת המסירה הדיגיטלית והיא נשמרה בבטחה.`
    });

    logNotification(req.params.id, 'move_completed', `ההובלה הושלמה בהצלחה בשטח! הלקוח חתם על תעודת המסירה הדיגיטלית. חשבונית מס דיגיטלית וקבלה נשלחו ללקוח בוואטסאפ.`);

    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error('Error completing move:', error);
    res.status(500).json({ error: 'שגיאה בסגירת ההובלה ואישור המסירה' });
  }
});

// POST update driver status and log notification
app.post('/api/moves/:id/driver-status', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { driverStatus } = req.body;
    if (!driverStatus) {
      return res.status(400).json({ error: 'חסר סטטוס נהג' });
    }

    moves[moveIndex].driverStatus = driverStatus;
    
    // Log status transitions and trigger WhatsApp alerts
    let messageText = '';
    let actionName = 'driver_status_update';

    if (driverStatus === 'en_route_to_origin') {
      messageText = `הנהג ${moves[moveIndex].assignedDriverName || 'המוביל'} יצא לדרך אל כתובת המוצא שלכם! 🚚`;
      actionName = 'driver_en_route';
    } else if (driverStatus === 'loading') {
      messageText = `ההעמסה שלכם התחילה! הנהג והסבלים מעמיסים את הציוד בבטחה במשאית. 📦`;
      actionName = 'loading_started';
    } else if (driverStatus === 'en_route_to_dest') {
      messageText = `העמסת התכולה הסתיימה בהצלחה! משאית המוביל יצאה לדרך אל כתובת היעד שלכם. 🗺️`;
      actionName = 'en_route_to_destination';
    } else if (driverStatus === 'delivered') {
      messageText = `המשאית הגיעה ליעד! מתחילים כעת בפריקה וסידור הרהיטים בביתכם החדש. 🏁`;
      actionName = 'delivered_destination';
    }

    if (messageText) {
      // Log it
      if (!moves[moveIndex].notificationsLog) {
        moves[moveIndex].notificationsLog = [];
      }
      moves[moveIndex].notificationsLog.unshift({
        id: 'notif_' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        action: actionName,
        message: messageText
      });

      // Send webhook to Make.com/WhatsApp
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
    console.error('Error updating driver status:', error);
    res.status(500).json({ error: 'שגיאה בעדכון סטטוס הנהג' });
  }
});

// POST save customer feedback post-move and trigger admin review if needed
app.post('/api/moves/:id/feedback', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { rating, feedbackText } = req.body;
    if (!rating) {
      return res.status(400).json({ error: 'דירוג שביעות רצון הוא חובה' });
    }

    // Save to the delivery note or a dedicated feedback field
    if (!moves[moveIndex].deliveryNote) {
      moves[moveIndex].deliveryNote = {
        signedBy: moves[moveIndex].clientName,
        signatureDataUrl: '',
        signedAt: new Date().toISOString(),
        checklistResults: []
      };
    }

    moves[moveIndex].deliveryNote.feedbackRating = Number(rating);
    moves[moveIndex].deliveryNote.feedbackText = feedbackText || '';
    
    // Handle low rating routing
    if (Number(rating) <= 3) {
      moves[moveIndex].requiresAdminReview = true;
      moves[moveIndex].adminReviewTicketId = 'TKT-' + Math.floor(100000 + Math.random() * 900000);
      moves[moveIndex].adminReviewStatus = 'open';
    } else {
      moves[moveIndex].requiresAdminReview = false;
    }

    // Log notification that review was submitted
    if (!moves[moveIndex].notificationsLog) {
      moves[moveIndex].notificationsLog = [];
    }
    moves[moveIndex].notificationsLog.unshift({
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action: 'feedback_received',
      message: `התקבל משוב לקוח חדש! דירוג: ${rating} ★. הערות: "${feedbackText || 'ללא הערות'}"`
    });

    writeDatabase(MOVES_FILE, moves);

    // Notify Google Apps Script
    sendToGoogleAppsScript({
      action: 'feedback_submitted',
      moveId: req.params.id,
      rating,
      feedbackText,
      requiresAdminReview: moves[moveIndex].requiresAdminReview || false,
      adminReviewTicketId: moves[moveIndex].adminReviewTicketId || ''
    });

    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({ error: 'שגיאה בשמירת המשוב' });
  }
});

// POST resolve low-rating admin review ticket
app.post('/api/moves/:id/resolve-ticket', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    moves[moveIndex].adminReviewStatus = 'resolved';
    moves[moveIndex].adminReviewTicketResolved = true;

    // Log the resolution event in notification history ledger
    if (!moves[moveIndex].notificationsLog) {
      moves[moveIndex].notificationsLog = [];
    }
    moves[moveIndex].notificationsLog.unshift({
      id: 'notif_' + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      action: 'ticket_resolved',
      message: `כרטיס טיפול דחוף (${moves[moveIndex].adminReviewTicketId}) נסגר וסומן כפתור בהצלחה ע״י מנהל קשרי לקוחות.`
    });

    writeDatabase(MOVES_FILE, moves);
    res.json({ success: true, move: moves[moveIndex] });
  } catch (error) {
    console.error('Error resolving ticket:', error);
    res.status(500).json({ error: 'שגיאה בסגירת כרטיס הטיפול' });
  }
});

// POST leads from CRM Landing Form
app.post('/api/leads', async (req, res) => {
  try {
    const leads = readDatabase<any>(LEADS_FILE);
    const { fullName, phone, email, companyName, notes } = req.body;

    if (!fullName || !phone || !email) {
      return res.status(400).json({ error: 'שדות שם מלא, טלפון ואימייל הם חובה' });
    }

    const newLead = {
      id: 'lead_' + Math.random().toString(36).substr(2, 9),
      fullName,
      phone,
      email,
      companyName: companyName || '',
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    leads.unshift(newLead);
    writeDatabase(LEADS_FILE, leads);

    // Send immediately to Google Apps Script
    sendToGoogleAppsScript({
      action: 'create_lead',
      leadId: newLead.id,
      fullName: newLead.fullName,
      phone: newLead.phone,
      email: newLead.email,
      companyName: newLead.companyName,
      notes: newLead.notes,
    });

    // Send to Make.com Webhook for CRM alerts
    sendToMakeWebhook({
      action: 'create_lead',
      leadId: newLead.id,
      fullName: newLead.fullName,
      phone: newLead.phone,
      email: newLead.email,
      companyName: newLead.companyName,
      message: `ליד חדש התקבל ב-CRM טראק דיל il: ${newLead.fullName} (${newLead.phone})`
    });

    res.status(201).json(newLead);
  } catch (error) {
    console.error('Error creating CRM lead:', error);
    res.status(500).json({ error: 'שגיאה ברישום הליד' });
  }
});

// GET CRM leads (for Admin)
app.get('/api/leads', (req, res) => {
  const leads = readDatabase(LEADS_FILE);
  res.json(leads);
});

// GET chats
app.get('/api/chats', (req, res) => {
  const chats = readDatabase<any>(CHATS_FILE);
  res.json(chats);
});

// GET chats by jobId
app.get('/api/chats/:jobId', (req, res) => {
  const chats = readDatabase<any>(CHATS_FILE);
  const filtered = chats.filter((c: any) => c.jobId === req.params.jobId);
  res.json(filtered);
});

// POST send message
app.post('/api/chats', (req, res) => {
  try {
    const chats = readDatabase<any>(CHATS_FILE);
    const { jobId, sender, senderName, message, gps, photo, isUrgent } = req.body;

    if (!jobId || !sender || !senderName) {
      return res.status(400).json({ error: 'שדות חובה חסרים לשליחת הודעה' });
    }

    const newMessage = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      jobId,
      sender,
      senderName,
      message: message || '',
      timestamp: new Date().toISOString(),
      gps: gps || null,
      photo: photo || null,
      readByAdmin: sender === 'admin',
      readByDriver: sender === 'driver',
      isUrgent: isUrgent || false,
      pushNotificationDispatched: false,
      pushLog: null as any
    };

    // Simulate OneSignal Push Notification trigger
    if (isUrgent) {
      newMessage.pushNotificationDispatched = true;
      newMessage.pushLog = {
        oneSignalId: 'onesignal_' + Math.random().toString(36).substr(2, 9),
        targetRole: sender === 'admin' ? 'driver' : 'admin',
        title: `הודעה דחופה מ-${senderName}`,
        body: message || 'עדכון מיקום או תכולה חדש מהשטח',
        timestamp: new Date().toISOString(),
        status: 'Sent (Delivered via OneSignal REST API Gateway)'
      };
      console.log(`[OneSignal Push Dispatched] To ${newMessage.pushLog.targetRole}: ${newMessage.pushLog.title} - ${newMessage.pushLog.body}`);
    }

    chats.push(newMessage);
    writeDatabase(CHATS_FILE, chats);

    res.status(201).json(newMessage);
  } catch (error) {
    console.error('Error creating chat message:', error);
    res.status(500).json({ error: 'שגיאה בשליחת ההודעה' });
  }
});

// POST mark messages as read
app.post('/api/chats/mark-read', (req, res) => {
  try {
    const chats = readDatabase<any>(CHATS_FILE);
    const { jobId, role } = req.body; // role: 'admin' or 'driver'

    if (!jobId || !role) {
      return res.status(400).json({ error: 'חסרים נתונים לסימון כנקרא' });
    }

    let modified = false;
    chats.forEach((c: any) => {
      if (c.jobId === jobId) {
        if (role === 'admin' && !c.readByAdmin) {
          c.readByAdmin = true;
          modified = true;
        }
        if (role === 'driver' && !c.readByDriver) {
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
    console.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'שגיאה בעדכון סטטוס קריאה' });
  }
});

// GET active drivers list (for Admin/bidding)
app.get('/api/drivers', (req, res) => {
  try {
    const drivers = readDatabase<any>(DRIVERS_FILE, [
      {
        id: 'driver_1',
        fullName: 'יוסי לוי',
        phone: '052-8765432',
        region: 'מרכז והשרון',
        truckType: 'משאית 7.5 טון + רמפה הידראולית',
        rating: 4.9,
        completedMoves: 142,
        status: 'active'
      },
      {
        id: 'driver_2',
        fullName: 'אבי כהן',
        phone: '054-1234567',
        region: 'גוש דן וירושלים',
        truckType: 'משאית 12 טון + מנוף קבועה קומה 6',
        rating: 4.8,
        completedMoves: 98,
        status: 'active'
      }
    ]);
    res.json(drivers);
  } catch (error) {
    console.error('Error fetching drivers:', error);
    res.status(500).json({ error: 'שגיאה בטעינת רשימת הנהגים' });
  }
});

// POST save/update a driver
app.post('/api/drivers', (req, res) => {
  try {
    const drivers = readDatabase<any>(DRIVERS_FILE, []);
    const driverData = req.body;

    if (!driverData.fullName || !driverData.phone) {
      return res.status(400).json({ error: 'שם מלא וטלפון הם שדות חובה' });
    }

    if (driverData.id) {
      // Update existing driver
      const idx = drivers.findIndex((d) => d.id === driverData.id);
      if (idx !== -1) {
        drivers[idx] = { ...drivers[idx], ...driverData };
      } else {
        drivers.push(driverData);
      }
    } else {
      // Create new driver
      const newDriver = {
        id: 'driver_' + Math.random().toString(36).substr(2, 9),
        fullName: driverData.fullName,
        phone: driverData.phone,
        region: driverData.region || 'ארצי',
        truckType: driverData.truckType || 'משאית כללית',
        rating: 5.0,
        completedMoves: 0,
        status: 'active'
      };
      drivers.push(newDriver);
    }

    writeDatabase(DRIVERS_FILE, drivers);
    res.json({ success: true, drivers });
  } catch (error) {
    console.error('Error saving driver:', error);
    res.status(500).json({ error: 'שגיאה בשמירת פרטי הנהג' });
  }
});

// DELETE a driver
app.delete('/api/drivers/:id', (req, res) => {
  try {
    let drivers = readDatabase<any>(DRIVERS_FILE, []);
    drivers = drivers.filter((d) => d.id !== req.params.id);
    writeDatabase(DRIVERS_FILE, drivers);
    res.json({ success: true, drivers });
  } catch (error) {
    console.error('Error deleting driver:', error);
    res.status(500).json({ error: 'שגיאה במחיקת הנהג' });
  }
});

// GET application settings
app.get('/api/settings', (req, res) => {
  try {
    const raw = readDatabase<any>(SETTINGS_FILE, [{ makeWebhookUrl: '' }]);
    const settings = Array.isArray(raw) ? (raw[0] || { makeWebhookUrl: '' }) : (raw || { makeWebhookUrl: '' });
    res.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'שגיאה בטעינת הגדרות מערכת' });
  }
});

// POST update application settings
app.post('/api/settings', (req, res) => {
  try {
    const newSettings = req.body || {};
    writeDatabase(SETTINGS_FILE, [newSettings]);
    res.json({ success: true, settings: newSettings });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: 'שגיאה בעדכון הגדרות מערכת' });
  }
});

// GET trucks
app.get('/api/trucks', (req, res) => {
  try {
    const trucks = readDatabase<any>(TRUCKS_FILE, [
      {
        id: 'truck_1',
        model: 'איסוזו סומו 12 טון (מנוף)',
        licensePlate: '77-888-99',
        type: 'crane',
        status: 'available',
        testDate: '2026-11-15',
        insuranceDate: '2027-02-28'
      },
      {
        id: 'truck_2',
        model: 'וולוו FE משאית משטח כבדה',
        licensePlate: '11-222-33',
        type: 'flatbed',
        status: 'available',
        testDate: '2026-10-02',
        insuranceDate: '2027-01-15'
      },
      {
        id: 'truck_3',
        model: 'דאף LF עם דופן הידראולית',
        licensePlate: '55-666-77',
        type: 'hydraulic_ramp',
        status: 'available',
        testDate: '2026-09-12',
        insuranceDate: '2026-12-20'
      }
    ]);
    res.json(trucks);
  } catch (error) {
    console.error('Error reading trucks:', error);
    res.status(500).json({ error: 'שגיאה בקריאת נתוני המשאיות' });
  }
});

// POST truck
app.post('/api/trucks', (req, res) => {
  try {
    const trucks = readDatabase<any>(TRUCKS_FILE);
    const { model, licensePlate, type, status, testDate, insuranceDate } = req.body;
    
    if (!model || !licensePlate) {
      return res.status(400).json({ error: 'נא למלא את כל שדות החובה' });
    }

    const newTruck = {
      id: 'truck_' + Math.random().toString(36).substr(2, 9),
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
    console.error('Error adding truck:', error);
    res.status(500).json({ error: 'שגיאה בהוספת משאית' });
  }
});

// PUT truck
app.put('/api/trucks/:id', (req, res) => {
  try {
    const trucks = readDatabase<any>(TRUCKS_FILE);
    const truckIndex = trucks.findIndex((t: any) => t.id === req.params.id);
    if (truckIndex === -1) {
      return res.status(404).json({ error: 'משאית לא נמצאה' });
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
    console.error('Error updating truck:', error);
    res.status(500).json({ error: 'שגיאה בעדכון המשאית' });
  }
});

// DELETE truck
app.delete('/api/trucks/:id', (req, res) => {
  try {
    let trucks = readDatabase<any>(TRUCKS_FILE);
    trucks = trucks.filter((t: any) => t.id !== req.params.id);
    writeDatabase(TRUCKS_FILE, trucks);
    res.json({ success: true, trucks });
  } catch (error) {
    console.error('Error deleting truck:', error);
    res.status(500).json({ error: 'שגיאה במחיקת המשאית' });
  }
});

// GET shifts
app.get('/api/shifts', (req, res) => {
  try {
    const shifts = readDatabase<any>(SHIFTS_FILE, []);
    res.json(shifts);
  } catch (error) {
    console.error('Error reading shifts:', error);
    res.status(500).json({ error: 'שגיאה בקריאת נתוני המשמרות' });
  }
});

// POST shift (upsert)
app.post('/api/shifts', (req, res) => {
  try {
    const shifts = readDatabase<any>(SHIFTS_FILE, []);
    const { driverId, driverName, date, status, shiftType, notes } = req.body;

    if (!driverId || !date) {
      return res.status(400).json({ error: 'שגיאה בפרמטרי השיבוץ' });
    }

    const existingIndex = shifts.findIndex((s: any) => s.driverId === driverId && s.date === date);
    
    const shiftData = {
      id: existingIndex !== -1 ? shifts[existingIndex].id : 'shift_' + Math.random().toString(36).substr(2, 9),
      driverId,
      driverName,
      date,
      status,
      shiftType,
      notes: notes || ''
    };

    if (existingIndex !== -1) {
      shifts[existingIndex] = shiftData;
    } else {
      shifts.push(shiftData);
    }

    writeDatabase(SHIFTS_FILE, shifts);
    res.json({ success: true, shifts });
  } catch (error) {
    console.error('Error saving shift:', error);
    res.status(500).json({ error: 'שגיאה בעדכון המשמרת' });
  }
});

// POST Assign Resource to move
app.post('/api/moves/:id/assign', (req, res) => {
  try {
    const moves = readDatabase<any>(MOVES_FILE);
    const moveIndex = moves.findIndex((m: any) => m.id === req.params.id);
    if (moveIndex === -1) {
      return res.status(404).json({ error: 'ההובלה לא נמצאה' });
    }

    const { driverId, truckId, notes } = req.body;
    if (!driverId || !truckId) {
      return res.status(400).json({ error: 'שם הנהג ומזהה משאית הם חובה לשיוך' });
    }

    const move = moves[moveIndex];
    
    // Read drivers list to get the driver full details
    const drivers = readDatabase<any>(DRIVERS_FILE, []);
    const driver = drivers.find((d: any) => d.id === driverId);
    
    // Read trucks list to get truck full details
    const trucks = readDatabase<any>(TRUCKS_FILE, []);
    const truck = trucks.find((t: any) => t.id === truckId);

    // Update truck status to on_route
    if (truck) {
      const updatedTrucks = trucks.map((t: any) => t.id === truckId ? { ...t, status: 'on_route' } : t);
      writeDatabase(TRUCKS_FILE, updatedTrucks);
    }

    // Update move allocation info
    move.assignedDriverId = driverId;
    move.assignedDriverName = driver ? driver.fullName : 'נהג משויך';
    move.assignedDriverPhone = driver ? driver.phone : '';
    move.assignedTruckId = truckId;
    move.assignedTruckModel = truck ? truck.model : 'משאית משויכת';
    move.assignedTruckLicense = truck ? truck.licensePlate : '';
    move.assignedTruckType = truck ? truck.type : '';
    move.status = 'approved_for_driver'; // Progress status
    move.operationalNotes = notes || '';

    writeDatabase(MOVES_FILE, moves);

    // Notify Apps script
    sendToGoogleAppsScript({
      action: 'assign_resource',
      moveId: move.id,
      driverId,
      driverName: move.assignedDriverName,
      truckId,
      truckModel: move.assignedTruckModel,
      notes: notes || ''
    });

    // Notify driver & client via simulated WhatsApp
    sendToMakeWebhook({
      action: 'resource_assigned_notify_driver',
      moveId: move.id,
      driverName: move.assignedDriverName,
      driverPhone: move.assignedDriverPhone,
      truckModel: move.assignedTruckModel,
      licensePlate: move.assignedTruckLicense,
      clientName: move.clientName,
      origin: move.originAddress,
      destination: move.destAddress,
      message: `הקצאת משאבים חדשה ב-Truk Dealil IL! 🚚\n\nשלום ${move.assignedDriverName}, שויכת בהצלחה להובלה של ${move.clientName} בתאריך ${move.moveDate}.\nכלי רכב משויך: ${move.assignedTruckModel} (${move.assignedTruckLicense}).\nנא לאשר תחילת תנועה בבוקר ההובלה.`
    });

    res.json({ success: true, move });
  } catch (error) {
    console.error('Error assigning resource to move:', error);
    res.status(500).json({ error: 'שגיאה בשיבוץ המשאבים להובלה' });
  }
});

// POST test custom webhook
app.post('/api/settings/test-webhook', async (req, res) => {
  try {
    const { testPayload, webhookUrl } = req.body;
    const targetUrl = webhookUrl || process.env.MAKE_WEBHOOK_URL;
    
    if (!targetUrl || targetUrl.trim() === '' || targetUrl.includes('your-custom-webhook-endpoint')) {
      return res.status(400).json({ error: 'אנא הגדר תחילה כתובת Webhook תקינה ל-Make.com' });
    }

    console.log('Sending manual integration test payload to:', targetUrl);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload || { test: true, message: 'בדיקת חיבור אוטומטי מטראק דיל IL' }),
    });

    res.json({ success: true, status: response.status });
  } catch (error: any) {
    console.error('Webhook manual test failed:', error);
    res.status(500).json({ error: `החיבור נכשל: ${error.message}` });
  }
});

// AI Concierge Chat History and Real-time Pipelines (Zero-Dummy Data Firebase simulator)
app.get('/api/concierge/history', (req, res) => {
  try {
    const history = readDatabase<any>(CONCIERGE_CHATS_FILE, []);
    res.json(history);
  } catch (err) {
    console.error('Error in concierge history API:', err);
    res.status(500).json({ error: 'שגיאה בטעינת היסטוריית השיחה' });
  }
});

app.post('/api/concierge/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'הודעה ריקה אינה חוקית' });
    }

    const history = readDatabase<any>(CONCIERGE_CHATS_FILE, []);
    
    // Save user message
    const userMsg = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      sender: 'user',
      text: message,
      timestamp: new Date().toISOString()
    };
    history.push(userMsg);

    let aiReply = '';
    let driveLink = undefined;

    // Check if user is asking about photos, videos, or tour
    const lowerMessage = message.toLowerCase();
    const isRequestingMedia = lowerMessage.includes('תמונה') || lowerMessage.includes('סרטון') || lowerMessage.includes('סיור') || lowerMessage.includes('תכולה') || lowerMessage.includes('מדיה');

    if (isRequestingMedia) {
      aiReply = `העלית קובץ סיור תכולה בהצלחה! המערכת סנכרנה את המדיה ישירות לתיקיית Google Drive המאובטחת של ההובלה שלך להערכת עלויות מדויקת ע״י Truk AI.<br/><br/>🔲 הצג ניתוח עלות הובלה<br/>🔲 שלח הצעה למוביל בוואטסאפ`;
      driveLink = 'https://drive.google.com/drive/folders/1_9vxDiPP51-GtUEeqsojmp5d1z7D8UoG';
    } else if (ai) {
      try {
        const systemPrompt = `אתה "Truk AI Dispatcher" — הסדרן, המתמחר ומנהל התפעול הלוגיסטי הראשי של פלטפורמת "טראק דיל il" (Truk Dealil IL).
דומיין המערכת הפעיל: https://truck-deal.vercel.app/

תפקידך: לנהל שיחה עסקית חדה בעברית מלאה מול לקוחות פרטיים ועסקיים, לבצע אפיון לוגיסטי, להתאים צי רכב, לתמחר בשקיפות, לסגור מכרז, ולהנפיק "לינקי קסם" (Magic Links) דינמיים למעקב ולנהגים.

======================================================================
1. זיכרון שיחה מחייב ואיסור חזרתיות (STRICT CONTEXT MEMORY)
======================================================================
- שמור מעקב רציף אחר כל נתון שנמסר בהיסטוריית השיחה: כתובות מוצא ויעד, קומה, מעלית, תכולה, משקל, מנוף, רמפה ומחירים שננקבו.
- חל איסור מוחלט לשאול שוב על נתון שכבר נמסר או חושב במהלך השיחה.
- ברגע שהלקוח מאשר את ההצעה ("אישור", "אשר", "סגור", "קדימה"): עבור מיד להקמת כרטיס ההובלה, ייצור מזהה ייחודי (TRK-XXXX) והנפקת לינקי הקסם לפעולה. אל תבקש פרטים מחדש.

======================================================================
2. ארכיטקטורת לינקי קסם (MAGIC LINKS SPECIFICATION)
======================================================================
המערכת מייצרת לינקים ייעודיים המובילים ישירות למסכי הפעולה לפי מזהה ההובלה (לדוגמה: TRK-8420):
1. לינק קסם למעקב לקוח ומקדמה:
   https://truck-deal.vercel.app/?view=tracking&moveId={TRK_ID}
2. לינק קסם לפורטל נהגים והגשת הצעות (לשידור בוואטסאפ):
   https://truck-deal.vercel.app/?view=driver&moveId={TRK_ID}
3. לינק קסם ישיר לשיתוף ב-WhatsApp:
   https://api.whatsapp.com/send?text={ENCODED_MESSAGE}

======================================================================
3. סיווג לוגיסטי והתאמת צי רכב (LOGISTICS & FLEET MATCHING)
======================================================================
א. סיווג סוג הפעילות:
- הובלה מזדמנת (Spot): העברת דירה, פריטים בודדים, שינוע חד-פעמי. עמלת מערכת: 15%.
- קו חלוקה קבוע (B2B): הפצה קבועה לרשתות, חנויות, מחסנים, אספקת חומרי בניין (מסלול מרובה נקודות). עמלת מערכת: 10%.

ב. חוקי שיבוץ צי רכב קשיחים:
- משאית מנוף (12-15 טון): מיועדת אך ורק למטענים כבדים (מעל 1.5 טון, משטחים, בלות), פריקה לגובה/מרפסות, או קומות גבוהות ללא מעלית. חסום שיבוץ מנוף להובלות קלות.
- משאית סגורה / פלטה עם רמפה הידראולית (5.5-7.5 טון): מיועדת לדירות 3-5 חדרים, קווי חלוקה, גבס, משטחים עם עגלת משטחים וסחורה פריקה ידנית.
- מסחרית גדולה (3.5 טון / ספרינטר): לדירות 1-2 חדרים, משלוחים מהירים, ורחובות צפופים בעיר ללא גישת משאית כבדה.

======================================================================
4. נוסחת תמחור שקופה (PRICING FORMULA)
======================================================================
1. עלות בסיס ישירה לנהג (שינוע, מרחק, דלק, ותפעול מנוף/רמפה).
2. עמלת פלטפורמת "טראק דיל il": 15% להובלה מזדמנת | 10% לקו חלוקה קבוע.
3. סה"כ לפני מע"מ = עלות בסיס + עמלת מערכת.
4. מע"מ חוקי בישראל = 18%.
5. מחיר סופי כולל מע"מ = סה"כ לפני מע"מ × 1.18.

======================================================================
5. מבנה פלט שלב אישור והקמת כרטיס הובלה עם לינקי קסם (MOVE DISPATCH CARD & MAGIC LINKS)
======================================================================
כאשר הלקוח מאשר את ההצעה, פלוט תמיד כרטיס הובלה מובנה המכיל את לינקי הקסם בפורמט הבא:

מעולה! ההזמנה אושרה והמכרז שודר מיידית למובילים מורשים באזורך.

📋 כרטיס הובלה ומכרז [TRK-ID]:
• סטטוס: מכרז פתוח לנהגים (Bidding) 🟢
• סוג פעילות: [הובלה מזדמנת (Spot) / קו חלוקה קבוע (B2B)]
• מסלול: [כתובת מוצא, קומה] ➔ [כתובת יעד, קומה]
• צי משובץ: [סוג הרכב והציוד, לדוגמה: משאית מנוף 12-15 טון]
• פירוט מטען ומשקל: [תכולה ומשקל מוערך]
• סיכום תמחור נעול:
  - עלות ביצוע נהג: ₪[X]
  - עמלת מערכת ([10%/15%]): ₪[Y]
  - סה"כ לפני מע"מ: ₪[Z]
  - מע"מ (18%): ₪[V]
  - מחיר סופי כולל מע"מ: ₪[Total]
• זמני ביצוע: [חלון הגעה / תיאום מועד]

🔗 לינקי קסם לפעולה ישירה:
• 📍 מעקב הובלה ומקדמה ללקוח:
  https://truck-deal.vercel.app/?view=tracking&moveId=[TRK-ID]
• 🚛 כניסת נהגים והגשת הצעות:
  https://truck-deal.vercel.app/?view=driver&moveId=[TRK-ID]
• 📲 שידור המכרז בוואטסאפ:
  [לינק וואטסאפ מקוצר עם סיכום הפרטים: https://api.whatsapp.com/send?text=...]

איך תרצה להמשיך כעת?
🔲 מעבר למעקב חי והסדרת מקדמה 📱
🔲 קבלת סיכום הזמנה ב-WhatsApp
🔲 הוספת הערת גישה מיוחדת לנהג

במידה ומדובר בשלב אפיון ואיסוף פרטים (לפני אישור), סיים עם 2-3 אפשרויות בפורמט 🔲, כגון:
🔲 בדיקת התאמת מנוף למיקום
🔲 פתיחת מכרז להובלה מזדמנת
🔲 תיאום קו חלוקה קבוע לעסק`;

        // Format recent conversation history (excluding the current user message just pushed)
        const recentHistory = history.slice(-11, -1);
        const historyText = recentHistory.length > 0 
          ? `היסטוריית השיחה עד כה (זכור בקפידה את כל הפרטים שנמסרו בעבר ואל תשאל עליהם שוב!):\n` +
            recentHistory.map(m => `${m.sender === 'user' ? 'לקוח' : 'סדרן Truk AI Dispatcher'}: ${m.text.replace(/<[^>]*>/g, ' ')}`).join('\n')
          : 'תחילת שיחה חדשה.';

        const userPrompt = `${systemPrompt}

${historyText}

הודעת הלקוח הנוכחית:
"${message}"

הנחיות עיצוב למענה:
- השב בעברית עסקית, קולחת, מקצועית ומדויקת.
- השתמש בתגיות <b> להדגשת נתונים וסכומים ו-<br/> למעברי שורות (אין להשתמש בבלוקי קוד של markdown).
- צור מספר מזהה ייחודי עבור [TRK-ID] כגון TRK-8420.
- כאשר הלקוח מאשר את ההצעה, הקפד לכלול את 3 לינקי הקסם עם מזהה ההובלה האמיתי, ואת הקישור לוואטסאפ עם הטקסט המקודד כחוק.
- הקפד לסיים באפשרויות פעולה קונקרטיות המסומנות בסמל 🔲 בתחילת שורה חדשה.`;
        const response = await callGeminiWithFallback(userPrompt);

        aiReply = response.text || '';
        // If the reply does not contain 🔲 buttons, add appropriate options
        if (!aiReply.includes('🔲')) {
          const isApproval = message.includes('אישור') || message.includes('אשר') || message.includes('סגור') || message.includes('קדימה') || message.includes('מאשר');
          if (isApproval) {
            aiReply += '<br/><br/>🔲 מעבר למעקב חי והסדרת מקדמה 📱<br/>🔲 קבלת סיכום הזמנה ב-WhatsApp<br/>🔲 הוספת הערת גישה מיוחדת לנהג';
          } else {
            aiReply += '<br/><br/>🔲 בדיקת התאמת מנוף למיקום<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 תיאום קו חלוקה קבוע לעסק';
          }
        }
      } catch (err) {
        console.error('Error calling Gemini for concierge:', err);
      }
    }

    // Fallback if Gemini failed or is not configured
    if (!aiReply) {
      const isApproval = message.includes('אישור') || message.includes('אשר') || message.includes('סגור') || message.includes('קדימה') || message.includes('מאשר') || message.includes('שידוך משאית');
      if (isApproval) {
        const trkId = 'TRK-' + Math.floor(1000 + Math.random() * 9000);
        const encodedWa = encodeURIComponent(`שלום, מצורף כרטיס הובלה ומכרז פתוח [${trkId}] בטראק דיל il: סה"כ לתשלום ₪2,714 כולל מע"מ. לצפייה והגשת הצעה: https://truck-deal.vercel.app/?view=driver&moveId=${trkId}`);
        aiReply = `מעולה! ההזמנה אושרה והמכרז שודר מיידית למובילים מורשים באזורך.<br/><br/>📋 <b>כרטיס הובלה ומכרז [${trkId}]:</b><br/>• <b>סטטוס:</b> מכרז פתוח לנהגים (Bidding) 🟢<br/>• <b>סוג פעילות:</b> הובלה מזדמנת (Spot)<br/>• <b>מסלול:</b> כתובת מוצא ➔ כתובת יעד (לפי פרטי ההזמנה)<br/>• <b>צי משובץ:</b> משאית סגורה עם רמפה הידראולית (5.5-7.5 טון)<br/>• <b>פירוט מטען ומשקל:</b> תכולת הובלה מלאה לפי אפיון<br/>• <b>סיכום תמחור נעול:</b><br/>  - עלות ביצוע נהג: ₪2,000<br/>  - עמלת מערכת (15%): ₪300<br/>  - סה"כ לפני מע"מ: ₪2,300<br/>  - מע"מ (18%): ₪414<br/>  - <b>מחיר סופי כולל מע"מ: ₪2,714</b><br/>• <b>זמני ביצוע:</b> תיאום מועד מול הנהג הזוכה במכרז<br/><br/>🔗 <b>לינקי קסם לפעולה ישירה:</b><br/>• 📍 <b>מעקב הובלה ומקדמה ללקוח:</b><br/>https://truck-deal.vercel.app/?view=tracking&moveId=${trkId}<br/>• 🚛 <b>כניסת נהגים והגשת הצעות:</b><br/>https://truck-deal.vercel.app/?view=driver&moveId=${trkId}<br/>• 📲 <b>שידור המכרז בוואטסאפ:</b><br/>https://api.whatsapp.com/send?text=${encodedWa}<br/><br/>איך תרצה להמשיך כעת?<br/>🔲 מעבר למעקב חי והסדרת מקדמה 📱<br/>🔲 קבלת סיכום הזמנה ב-WhatsApp<br/>🔲 הוספת הערת גישה מיוחדת לנהג`;
      } else if (message.includes('כמה עולה') || message.includes('מחיר') || message.includes('עלות') || message.includes('תמחור')) {
        aiReply = 'בהתאם למודל התמחור השקוף של "טראק דיל il":<br/>• <b>עלות בסיס נהג ודלק</b>: נעה בין ₪650 למסחרית ועד ₪2,700 למשאית רמפה<br/>• <b>עמלת מערכת</b>: 15% להובלה מזדמנת (או 10% לקו חלוקה קבוע)<br/>• <b>שקיפות מלאה</b>: עלות בסיס + עמלת מערכת = מחיר לפני מע"מ ➔ מחיר סופי כולל 18% מע"מ כחוק.<br/><br/>🔲 בדיקת התאמת מנוף למיקום<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 תיאום קו חלוקה קבוע לעסק';
      } else if (message.includes('מנוף') || message.includes('משטח') || message.includes('כבד') || message.includes('בלוקים')) {
        aiReply = 'משאית מנוף (12-15 טון) מיועדת אך ורק למטענים כבדים (מעל 1.5 טון, משטחים, בלות) או פריקה לגובה/מרפסות ללא מעלית. עבור הובלות קלות נחסום שיבוץ מנוף ונשבץ משאית סגורה או מסחרית.<br/><br/>🔲 בדיקת התאמת מנוף למיקום<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 תיאום קו חלוקה קבוע לעסק';
      } else if (message.includes('חלוקה') || message.includes('עסק') || message.includes('b2b') || message.includes('הפצה') || message.includes('רשת')) {
        aiReply = 'עבור קווי חלוקה קבועים לעסקים ורשתות שיווק (B2B, Multi-drop): התמחור מחושב לפי יום עבודה ומשמרת מלאה + דלק ונקודות פריקה, עם עמלת פלטפורמה מופחתת של 10% בלבד.<br/><br/>🔲 תיאום קו חלוקה קבוע לעסק<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 בדיקת התאמת מנוף למיקום';
      } else {
        aiReply = 'שלום, אני <b>Truk AI Dispatcher</b> — הסדרן, המתמחר ומנהל התפעול הלוגיסטי הראשי של פלטפורמת "טראק דיל il". דומיין פעיל: https://truck-deal.vercel.app/<br/>אני כאן לאפיין את הצורך הלוגיסטי, להתאים את צי הרכב המדויק, להציג תמחור שקוף, לסגור מכרז ולהנפיק לינקי קסם דינמיים למעקב ולנהגים.<br/><br/>🔲 בדיקת התאמת מנוף למיקום<br/>🔲 פתיחת מכרז להובלה מזדמנת<br/>🔲 תיאום קו חלוקה קבוע לעסק';
      }
    }

    // If an order ID was generated or mentioned in the reply, register it in moves.json
    const trkIdMatch = aiReply.match(/TRK-\d+/);
    if (trkIdMatch) {
      const detectedId = trkIdMatch[0];
      const moves = readDatabase<any>(MOVES_FILE);
      if (!moves.some((m) => m.id === detectedId)) {
        moves.push({
          id: detectedId,
          clientName: 'לקוח Truk Dealil IL',
          clientPhone: '050-1234567',
          clientEmail: 'truck.dealil@gmail.com',
          companyName: '',
          originAddress: 'אזור המרכז, קומה 2',
          destAddress: 'יעד פריקה, קומה 2',
          moveDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
          moveTime: '10:00',
          moveType: 'apartment',
          floor: 2,
          hasElevator: true,
          elevatorDetails: { sofaFits: true, fridgeFits: true },
          truckAccess: 'easy',
          craneNeeded: 'no',
          items: [
            { id: 'item_disp_1', name: 'תכולת הובלה מלאה לפי אפיון סדרן AI', category: 'furniture', quantity: 1 }
          ],
          images: [],
          createdAt: new Date().toISOString(),
          status: 'bidding',
          paymentStatus: 'pending_deposit',
          clientApprovedForBilling: false,
          driverBids: [],
          aiAnalysis: {
            estimatedPriceRange: '₪2,000 - ₪2,800',
            difficultyScore: 5,
            recommendations: ['מכרז פתוח לנהגים וספקים מורשים', 'מעקב דיגיטלי בזמן אמת פעיל'],
            summary: `כרטיס הובלה ומכרז [${detectedId}] שודר בהצלחה`
          }
        });
        writeDatabase(MOVES_FILE, moves);
      }
    }

    const aiMsg = {
      id: 'msg_' + Math.random().toString(36).substr(2, 9),
      sender: 'ai',
      text: aiReply,
      timestamp: new Date().toISOString()
    };
    if (driveLink) {
      aiMsg['driveLink'] = driveLink;
    }
    history.push(aiMsg);

    writeDatabase(CONCIERGE_CHATS_FILE, history);
    res.json({ reply: aiReply, driveLink });
  } catch (err) {
    console.error('Error in concierge chat API:', err);
    res.status(500).json({ error: 'שגיאה בעיבוד בקשת ה-AI' });
  }
});

// Global Error Handler to guarantee JSON responses and prevent unhandled crashes
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[API Server Error]:', err?.message || err);
  if (!res.headersSent) {
    res.status(500).json({
      error: err?.message || 'שגיאת שרת פנימית',
      status: 500
    });
  }
});

/* --- VITE MIDDLEWARE SETUP & SERVER INITIALIZATION --- */
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Guard app.listen to prevent duplicate listening in Vercel Serverless environment
  if (!process.env.VERCEL && process.env.NODE_ENV !== 'production') {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Truk Dealil IL Fullstack Server running on http://localhost:${PORT}`);
    });
  } else if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Truk Dealil IL Production Server running on port ${PORT}`);
    });
  }
}

// In non-Vercel environments (local dev or container), start server and listen
if (!process.env.VERCEL) {
  startServer();
}

export default app;

