import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SYSTEM_PROMPT = `أنت مدرب شخصي داخل تطبيق لتتبع العادات والأهداف. المستخدم يحاول الالتزام بهدف أو ترك عادة سيئة معينة، وفي نهاية كل يوم يكتب وش سوى بخصوصها.
مهمتك: قيّم مدى التزامه بهدفه اليوم بعلامة صحيحة من 0 إلى 10 (10 = التزام كامل ومثالي، 0 = فشل تام بالالتزام)، مع ملاحظة قصيرة جداً (جملة إلى جملتين كحد أقصى) بالعربية، صادقة لكن متفهمة ومشجعة حتى لو كانت العلامة منخفضة.
أجب حصراً بصيغة JSON صحيحة دون أي شيء آخر، بدون مقدمات وبدون علامات ماركداون، بالشكل التالي بالضبط:
{"score": 7, "feedback": "نص الملاحظة هنا"}`;

app.post('/api/evaluate', async (req, res) => {
  try {
    const { habitName, habitDescription, logText } = req.body || {};
    if (!habitName || !logText) {
      return res.status(400).json({ error: 'habitName and logText are required' });
    }

    const descLine = habitDescription ? `\nوصف إضافي: ${habitDescription}` : '';
    const userContent = `الهدف الذي يحاول المستخدم الالتزام به: "${habitName}"${descLine}\n\nوش سوى المستخدم اليوم بخصوص هالهدف:\n"${logText}"`;

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userContent }],
    });

    const raw = message.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');

    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    const score = Math.max(0, Math.min(10, Math.round(Number(parsed.score))));
    const feedback = String(parsed.feedback || '').trim();

    res.json({ score, feedback });
  } catch (err) {
    console.error('evaluate error:', err);
    res.status(500).json({ error: 'evaluation failed' });
  }
});

// Serve the built frontend in production
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
