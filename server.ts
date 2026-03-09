import express from "express";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Logging middleware for ALL requests
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  const apiRouter = express.Router();

  // API Logging
  apiRouter.use((req, res, next) => {
    console.log(`[API] ${req.method} ${req.path}`);
    next();
  });

  const BIN_ID = (process.env.JSONBIN_BIN_ID || "69af06d2ae596e708f71a0ef").trim();
  const MASTER_KEY = (process.env.JSONBIN_MASTER_KEY || "$2a$10$RxtN.VwYLRsGcmoCji08oeL2di9W0D4tyrBZe/vIV77N665ALQ9Vi").trim();

  console.log(`Configured JSONBin - ID: ${BIN_ID.substring(0, 4)}... Key: ${MASTER_KEY.substring(0, 10)}...`);

  // Health check
  app.get("/api/ping", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  app.get("/api/test", (req, res) => {
    res.json({ message: "API is working!", timestamp: new Date().toISOString() });
  });

  // JSONBin Proxy Endpoints
  const handleGetData = async (req, res) => {
    console.log("GET /api/data - Fetching from JSONBin...");
    try {
      if (!BIN_ID || !MASTER_KEY) {
        throw new Error("JSONBin credentials missing");
      }

      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}/latest`, {
        headers: {
          "X-Master-Key": MASTER_KEY,
        },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorDetails = "Unknown error";
        if (contentType && contentType.includes("application/json")) {
          const errJson = await response.json();
          errorDetails = JSON.stringify(errJson);
        } else {
          errorDetails = await response.text();
        }
        console.error(`JSONBin GET error: ${response.status} - ${errorDetails}`);
        return res.status(response.status).json({ 
          error: "JSONBin API Error", 
          status: response.status,
          details: errorDetails 
        });
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("JSONBin returned non-JSON response");
      }

      const data = await response.json();
      console.log("GET /api/data - Success");
      res.json(data.record || { players: [], finances: [] });
    } catch (error: any) {
      console.error("GET /api/data - Exception:", error);
      res.status(500).json({ error: error.message });
    }
  };

  const handlePutData = async (req, res) => {
    const bodySize = JSON.stringify(req.body).length;
    console.log(`PUT /api/data - Saving to JSONBin... (Size: ${bodySize} bytes)`);
    try {
      if (!BIN_ID || !MASTER_KEY) {
        throw new Error("JSONBin credentials missing");
      }

      const response = await fetch(`https://api.jsonbin.io/v3/b/${BIN_ID}`, {
        method: "PUT",
        headers: {
          "X-Master-Key": MASTER_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(req.body),
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
        let errorDetails = "Unknown error";
        if (contentType && contentType.includes("application/json")) {
          const errJson = await response.json();
          errorDetails = JSON.stringify(errJson);
        } else {
          errorDetails = await response.text();
        }
        console.error(`JSONBin PUT error: ${response.status} - ${errorDetails}`);
        return res.status(response.status).json({ 
          error: "JSONBin API Error", 
          status: response.status,
          details: errorDetails 
        });
      }

      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("JSONBin returned non-JSON response");
      }

      const data = await response.json();
      console.log("PUT /api/data - Success");
      res.json(data.record);
    } catch (error: any) {
      console.error("PUT /api/data - Exception:", error);
      res.status(500).json({ error: error.message });
    }
  };

  // Mount routes to Router
  apiRouter.get("/ping", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
  apiRouter.get("/test", (req, res) => res.json({ message: "API is working!" }));
  apiRouter.get("/data", handleGetData);
  apiRouter.put("/data", handlePutData);

  // Catch-all for API Router
  apiRouter.all("*", (req, res) => {
    console.warn(`[API Router] 404 - Not Found: ${req.method} ${req.path}`);
    res.status(404).json({ error: "API Route not found", path: req.path });
  });

  // Mount API Router to App
  app.use("/api", apiRouter);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
