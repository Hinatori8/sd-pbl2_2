
import express, { Request, Response } from 'express';
import cors from 'cors';
import { GoogleGenAI, Type, Schema } from '@google/genai';

const app = express();
app.use(cors());
app.use(express.json());

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/** JSON Schema（Type enum を使うと型推論が通る） */
const jobSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    title:       { type: Type.STRING },
    startDate:   { type: Type.STRING },
    endDate:     { type: Type.STRING },
    description: { type: Type.STRING },
  },
  required: ['title', 'startDate', 'endDate'],
} as const;               // ← satisfies Schema でも可

app.post('/api/schedule', async (req: Request, res: Response) => {
  try {
    const userText = String(req.body?.text ?? '');
    const today = new Date().toISOString().slice(0, 10);

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: userText,
      config: {
        systemInstruction: `あなたは…現在の日付は ${today} です。`,
        responseMimeType:  'application/json',
        responseSchema:    jobSchema,     // ← もう赤線は出ない
      },
    });

    res.json(JSON.parse(response.text ?? '{}'));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Gemini 呼び出しに失敗しました' });
  }
});

const port = Number(process.env.PORT) || 8080;
app.listen(port, () => console.log(`API server listening on ${port}`));
