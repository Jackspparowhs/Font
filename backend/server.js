import express from "express";
import axios from "axios";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(helmet());
app.use(cors({
  origin: true // adjust for your frontend domain in production
}));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROVIDER_BASE = process.env.PROVIDER_BASE || "https://www.pornhub.com/webmasters/search";

// rate limiter to protect provider and your server
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60, // tune to your provider's rate limits
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Simple proxy for search
// frontend calls: /api/search?q=blonde
app.get("/api/search", async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q) return res.status(400).json({ error: "missing query q" });

    // Build provider URL (strip/encode user input)
    const encoded = encodeURIComponent(q);
    const providerUrl = `${PROVIDER_BASE}?search=${encoded}`;

    // If provider needs headers or keys, add here using process.env
    const resp = await axios.get(providerUrl, {
      headers: {
        Accept: "application/json",
        // Example: 'Authorization': `Bearer ${process.env.PROVIDER_KEY}`
      },
      timeout: 15000
    });

    // Forward provider response body directly (or sanitize below)
    const data = resp.data;

    // Optional: sanitize and only return required fields
    // For now, return provider data under `items`
    return res.json({ ok: true, provider: data });
  } catch (err) {
    console.error("Provider proxy error:", err?.response?.status, err?.message);
    const status = err?.response?.status || 502;
    return res.status(status).json({ error: "Upstream provider error" });
  }
});

// Simple video proxy if you want to fetch single video metadata via provider id
app.get("/api/video", async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: "missing id" });
  try {
    // Adjust to provider's single-video endpoint if exists
    const providerUrl = `${PROVIDER_BASE}?search=${encodeURIComponent(id)}`;
    const resp = await axios.get(providerUrl, { timeout: 15000 });
    return res.json({ ok: true, provider: resp.data });
  } catch (err) {
    console.error("Video proxy error:", err?.message);
    return res.status(502).json({ error: "Upstream provider error" });
  }
});

app.listen(PORT, () => console.log(`Proxy listening on http://localhost:${PORT}`));
