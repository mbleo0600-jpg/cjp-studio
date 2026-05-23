const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
// static removed//

const JWT_SECRET = process.env.JWT_SECRET || 'cjp-secret-2026';
const ANTHROPIC_KEY = process.env.ANTHROPIC_KEY || '';

// Single user auth
const USER = {
  email: 'Cockroachjantapartyorg@gmail.com',
  password: bcrypt.hashSync(process.env.PASSWORD || 'CJP@2026', 10)
};

// Auth middleware
function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (email.toLowerCase() !== USER.email.toLowerCase()) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const valid = await bcrypt.compare(password, USER.password);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token });
});

// GENERATE NEWS + POSTS
app.post('/api/generate', auth, async (req, res) => {
  const { type } = req.body; // 'news' or 'posts'

  try {
    const prompt = type === 'news'
      ? `You are a news aggregator for the Cockroach Janta Party (CJP) — India's biggest viral satirical political movement of 2026 with 18M+ Instagram followers. The movement was born after Chief Justice Surya Kant called unemployed youth "cockroaches" in the Supreme Court on May 15, 2026.

Generate 6 trending news items about CJP right now. Mix real-sounding news, political reactions, viral moments, and youth movements. 

Return ONLY a JSON array, no markdown. Each item:
{
  "headline": "punchy news headline",
  "source": "realistic Indian source (NDTV/The Wire/Scroll/India Today/ANI/Republic/Quint)",
  "summary": "2-3 sentence summary",
  "category": "one of: Politics / Viral / Youth / Legal / Celebrity / International",
  "time": "realistic time like '2 hours ago' or 'Just now'",
  "imagePrompt": "detailed prompt for generating a dark surreal political poster image about this story, cockroach theme, bold red and black, Indian political satire style"
}`
      : `You are the social media brain of Cockroach Janta Party (CJP) — India's biggest viral satirical movement with 18M+ Instagram followers. Style: dark, surreal, biting satire, bold graphics, like banksy meets Indian street politics.

Generate 4 complete ready-to-post Instagram content packages for today. Each should be about a different aspect of the CJP movement: political satire, youth unemployment, judicial system, viral moment.

Return ONLY a JSON array, no markdown. Each item:
{
  "title": "short punchy title",
  "category": "Satire / Manifesto / Rally / Viral",
  "hindi_caption": "full Instagram caption in Hindi (Devanagari script) — punchy, funny, political. 3-4 lines.",
  "english_caption": "full Instagram caption in English — same energy, sarcastic and powerful. 3-4 lines.",
  "hashtags": "#CJP #CockroachJantaParty #कॉकरोचजनतापार्टी plus 8 more relevant hashtags",
  "imagePrompt": "detailed prompt for dark surreal political poster: cockroach imagery, bold red/black/white, Indian political satire, protest art style, dramatic typography"
}`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    if (data.error) throw new Error(data.error.message);

    const text = data.content.map(i => i.text || '').join('');
    const clean = text.replace(/```json|```/g, '').trim();
    const s = clean.indexOf('['), e = clean.lastIndexOf(']');
    const items = JSON.parse(clean.slice(s, e + 1));

    res.json({ items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve frontend for all other routes
app.get('*', (req, res) => {
res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`CJP Studio running on port ${PORT}`));
