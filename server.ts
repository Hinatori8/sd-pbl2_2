
import express, { Request, Response } from 'express';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
// Render provides the PORT environment variable.
const port = process.env.PORT || 3000;

// Middleware to parse JSON request bodies
app.use(express.json());

// Serve static files (index.html, index.css, index.tsx) from the project root
const staticPath = path.join(__dirname, '..');
app.use(express.static(staticPath));


// API Key from environment variables.
if (!process.env.API_KEY) {
    // In a real app, you'd want more robust error handling or logging.
    // For this example, we'll log an error and exit if the key is missing.
    console.error("FATAL ERROR: API_KEY environment variable not set.");
    throw new Error("FATAL ERROR: API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const jobSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: '予定の簡潔なタイトル' },
    startDate: { type: Type.STRING, description: '予定の開始日 (YYYY-MM-DD形式)' },
    endDate: {
      type: Type.STRING,
      description: '予定の終了日 (YYYY-MM-DD形式)。一日のみの予定の場合はstartDateと同じ日付。'
    },
    description: { type: Type.STRING, description: '予定の詳細な内容' }
  },
  required: ['title', 'startDate', 'endDate', 'description']
};

// API endpoint for generating calendar jobs
app.post('/api/generate', async (req: Request, res: Response) => {
    const { userInput, today } = req.body;

    if (!userInput || !today) {
        return res.status(400).json({ error: 'Missing userInput or today date' });
    }

    const systemInstruction = `あなたは、テキストからスケジュール情報を抽出し、指定されたJSONスキーマに従って構造化するインテリジェントアシスタントです。現在の日付は ${today} です。これを基に「明日」や「来週」などの相対的な日付を解釈してください。`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: userInput,
            config: {
                systemInstruction: systemInstruction,
                responseMimeType: "application/json",
                responseSchema: jobSchema,
            },
        });
        
        // The response.text is a JSON string, which we can directly send back
        res.setHeader('Content-Type', 'application/json');
        res.send(response.text);

    } catch (error) {
        console.error('Error calling Gemini API:', error);
        res.status(500).json({ error: 'AIとの通信中にエラーが発生しました。' });
    }
});


// Serve the main HTML file for the root path
app.get('/', (req: Request, res: Response) => {
    res.sendFile(path.join(staticPath, 'index.html'));
});

app.listen(port, () => {
    console.log(`Server listening on http://localhost:${port}`);
});
