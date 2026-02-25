import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("shares.db");
db.exec(`
  CREATE TABLE IF NOT EXISTS shares (
    id TEXT PRIMARY KEY,
    image TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API to save image and get a shareable ID
  app.post("/api/share", (req, res) => {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "No image provided" });
    
    const id = uuidv4();
    const stmt = db.prepare("INSERT INTO shares (id, image) VALUES (?, ?)");
    stmt.run(id, image);
    
    res.json({ id });
  });

  // Page to view and download the shared image
  app.get("/share/:id", (req, res) => {
    const { id } = req.params;
    const row = db.prepare("SELECT image FROM shares WHERE id = ?").get(id) as { image: string } | undefined;
    
    if (!row) return res.status(404).send("Image not found");

    res.send(`
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Future Occupation</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
          body { background-color: #09090b; color: #f4f4f5; font-family: sans-serif; }
        </style>
      </head>
      <body class="min-h-screen flex flex-col items-center justify-center p-4">
        <div class="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center shadow-2xl">
          <h1 class="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">Your Future Self</h1>
          <div class="rounded-xl overflow-hidden mb-6 shadow-lg">
            <img src="${row.image}" alt="Future Occupation" class="w-full h-auto" />
          </div>
          <a href="${row.image}" download="my-future.png" class="inline-flex items-center justify-center gap-2 w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold rounded-xl transition-all">
            Download Image
          </a>
          <p class="mt-4 text-zinc-500 text-sm">Created with Reimagine My Future</p>
        </div>
      </body>
      </html>
    `);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
