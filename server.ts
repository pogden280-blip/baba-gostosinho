import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const BIN_ID = process.env.JSONBIN_BIN_ID;
  const MASTER_KEY = process.env.JSONBIN_MASTER_KEY;

  // JSONBin Proxy Endpoints
  app.get("/api/data", async (req, res) => {
    try {
      if (!BIN_ID || !MASTER_KEY) {
        return res.status(500).json({ error: "JSONBin credentials not configured" });
      }

      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          "X-Master-Key": MASTER_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`JSONBin error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data.record);
    } catch (error: any) {
      console.error("Error fetching from JSONBin:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/data", async (req, res) => {
    try {
      if (!BIN_ID || !MASTER_KEY) {
        return res.status(500).json({ error: "JSONBin credentials not configured" });
      }

      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "X-Master-Key": MASTER_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        throw new Error(`JSONBin error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data.record);
    } catch (error: any) {
      console.error("Error saving to JSONBin:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
