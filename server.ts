import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

import apiRouter from "./server/routes";

// 3. Setup Vercel App (also acts as the base express app)
const app = express();
app.use("/api", apiRouter);

async function startLocalServer() {
  const PORT = process.env.PORT || 3000;

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// In local environment, start the server immediately
if (!process.env.VERCEL) {
  startLocalServer();
}

// For Vercel, we need to export the configured Express app
export default app;
