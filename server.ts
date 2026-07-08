import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware for parsing JSON with a limit of 10mb for image uploads (KTP base64)
app.use(express.json({ limit: '10mb' }));

// Lazy load Gemini Client to handle missing keys gracefully
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error('GEMINI_API_KEY environment variable is required but not configured.');
    }
    aiClient = new GoogleGenAI({ apiKey: key });
  }
  return aiClient;
}

// Store WhatsApp logs in memory (and sync to Firestore if required)
interface WhatsAppLog {
  id: string;
  phone: string;
  message: string;
  type: 'bill' | 'reminder' | 'custom';
  status: 'sent' | 'failed';
  timestamp: string;
  tenantName: string;
  roomNumber: string;
}
const whatsappLogs: WhatsAppLog[] = [];

// API Route: Verify ID Card / KTP using Gemini API
app.post('/api/verify-ktp', async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    // Clean base64 string from data URL prefix if present
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');

    const ai = getGeminiClient();
    
    const prompt = `Extract details from this Indonesian National ID Card (KTP). 
Return a valid JSON object matching this schema exactly:
{
  "nik": "string NIK (16 digits)",
  "nama": "string (Full Name in CAPITALS)",
  "alamat": "string (Complete Address)",
  "ttl": "string (Place, Date of Birth)",
  "jenisKelamin": "string ('LAKI-LAKI' or 'PEREMPUAN')",
  "isAuthentic": true/false (evaluate if this is a real KTP card/mock KTP or random photo),
  "confidenceScore": number (0.0 to 1.0 indicating clarity),
  "notes": "string (observations, e.g. image blurry, valid KTP, etc.)"
}
Ensure output is ONLY a raw valid JSON object. Do not wrap in markdown or any other text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: cleanBase64,
            mimeType: mimeType || 'image/jpeg'
          }
        },
        prompt
      ]
    });

    const responseText = response.text || '';
    
    // Clean up response text to ensure it's parseable JSON
    let jsonText = responseText.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.substring(7);
    }
    if (jsonText.endsWith('```')) {
      jsonText = jsonText.substring(0, jsonText.length - 3);
    }
    jsonText = jsonText.trim();

    try {
      const result = JSON.parse(jsonText);
      res.json({ success: true, data: result });
    } catch (parseError) {
      console.error('Failed to parse Gemini response as JSON:', responseText);
      // Fallback extraction
      res.json({
        success: true,
        data: {
          nik: '3171XXXXXXXXXXXX',
          nama: 'PENGHUNI MOCK (Gagal parse JSON)',
          alamat: 'Alamat lengkap KTP',
          ttl: 'JAKARTA, 01-01-1990',
          jenisKelamin: 'LAKI-LAKI',
          isAuthentic: false,
          confidenceScore: 0.5,
          notes: 'Gagal parse JSON hasil scan AI: ' + responseText
        }
      });
    }
  } catch (error: any) {
    console.error('KTP Verification Error:', error);
    res.status(500).json({ error: error.message || 'KTP Verification failed' });
  }
});

// API Route: Send Simulated WhatsApp
app.post('/api/send-whatsapp', (req, res) => {
  try {
    const { phone, message, tenantName, roomNumber, type } = req.body;
    if (!phone || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const newLog: WhatsAppLog = {
      id: 'wa_' + Math.random().toString(36).substr(2, 9),
      phone,
      message,
      type: type || 'reminder',
      status: 'sent',
      timestamp: new Date().toISOString(),
      tenantName: tenantName || 'Umum',
      roomNumber: roomNumber || '-'
    };

    whatsappLogs.unshift(newLog);

    res.json({
      success: true,
      message: 'Notifikasi WhatsApp berhasil dikirim (simulasi)',
      log: newLog
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Gagal mengirim WhatsApp' });
  }
});

// API Route: Get WhatsApp Logs
app.get('/api/whatsapp-logs', (req, res) => {
  res.json({ success: true, logs: whatsappLogs });
});

// API Route: Cloud Sync Endpoint (Demonstrating API Integration for administrators and owners)
app.get('/api/sync/rooms', (req, res) => {
  const apiKey = req.headers['authorization'];
  if (!apiKey || apiKey !== 'Bearer hananny-secret-token-123') {
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  // Dummy mock dataset representing a secure live snapshot for multi-device sync
  res.json({
    success: true,
    syncedAt: new Date().toISOString(),
    device: "Multi-device Cloud Sync Server",
    data: {
      summary: {
        totalRooms: 60,
        occupiedRooms: 48,
        availableRooms: 10,
        maintenanceRooms: 2,
        totalRevenueThisMonth: 108000000,
        pendingPayments: 15200000
      },
      kosLocations: [
        { id: "kos-1", name: "Kos Melati", address: "Jl. Melati No. 12", totalRooms: 10 },
        { id: "kos-2", name: "Kos Mawar", address: "Jl. Mawar No. 45", totalRooms: 10 },
        { id: "kos-3", name: "Kos Tulip", address: "Jl. Tulip No. 8", totalRooms: 10 },
        { id: "kos-4", name: "Kos Kamboja", address: "Jl. Kamboja No. 19", totalRooms: 10 },
        { id: "kos-5", name: "Kos Anggrek", address: "Jl. Anggrek No. 3", totalRooms: 10 },
        { id: "kos-6", name: "Kos Lavender", address: "Jl. Lavender No. 27", totalRooms: 10 }
      ]
    }
  });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
