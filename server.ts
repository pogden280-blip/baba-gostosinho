import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  const BIN_ID = process.env.JSONBIN_BIN_ID || "69af06d2ae596e708f71a0ef";
  const MASTER_KEY = process.env.JSONBIN_MASTER_KEY || "$2a$10$RxtN.VwYLRsGcmoCji08oeL2di9W0D4tyrBZe/vIV77N665ALQ9Vi";

  console.log(`Configured JSONBin - ID: ${BIN_ID.substring(0, 4)}... Key: ${MASTER_KEY.substring(0, 10)}...`);

  // JSONBin Proxy Endpoints
  app.get("/api/data", async (req, res) => {
    console.log("GET /api/data - Fetching from JSONBin...");
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          "X-Master-Key": MASTER_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JSONBin GET error: ${response.status} - ${errorText}`);
        return res.status(response.status).json({ error: "JSONBin API Error", details: errorText });
      }

      const data = await response.json();
      console.log("GET /api/data - Success");
      res.json(data.record || { players: [], finances: [] });
    } catch (error: any) {
      console.error("GET /api/data - Exception:", error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put("/api/data", async (req, res) => {
    console.log("PUT /api/data - Saving to JSONBin...");
    try {
      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "X-Master-Key": MASTER_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`JSONBin PUT error: ${response.status} - ${errorText}`);
        return res.status(response.status).json({ error: "JSONBin API Error", details: errorText });
      }

      const data = await response.json();
      console.log("PUT /api/data - Success");
      res.json(data.record);
    } catch (error: any) {
      console.error("PUT /api/data - Exception:", error);
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
