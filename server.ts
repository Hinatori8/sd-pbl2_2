/* ---------- server.ts すべて ---------- */
import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json());

/* ===== Gemini 設定 ===== */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const jobSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title:       { type: Type.STRING },
    startDate:   { type: Type.STRING },
    endDate:     { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['title', 'startDate', 'endDate'],
} as const;

/* ===== API ルート ===== */
app.post('/api/schedule', async (req: Request, res: Response) => {
  try {
    const userText = String(req.body?.text ?? '');
    const today    = new Date().toISOString().slice(0, 10);

  const resp = await ai.models.generateContent({
    model:            'gemini-2.5-flash',
    contents:         userText, // 文字列でも OK（SDK 内でラップされる）
    systemInstruction:`あなたはカレンダーアシスタントです。現在の日付は ${today} です。`,
    responseMimeType: 'application/json',
    responseSchema:   jobSchema,
  });

    res.json(JSON.parse(resp.text ?? '{}'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini 呼び出しに失敗しました' });
  }
});

/* ===== フロント配信 ===== */
const __dirname = path.dirname(fileURLToPath(import.meta.url)); // dist
app.use(express.static(__dirname));                             // /dist 配下を公開

// SPA 用フォールバック ― ★ワイルドカードに名前を付ける★
app.get('/*path', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

/* ===== サーバ起動 ===== */
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
/* ---------- ここまで ---------- */
