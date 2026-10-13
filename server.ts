import express from 'express';
import http from 'http';
import path from 'path';
import app from './api/index.ts';

const PORT = 3000;

/* --- VITE MIDDLEWARE SETUP & SERVER INITIALIZATION --- */
async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const hmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // Share the app's HTTP server so the HMR WebSocket is reachable through the
        // same origin/port as the page (a separate port is blocked by preview proxies).
        hmr: hmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Guard listen to prevent duplicate listening in Vercel Serverless environment
  if (!process.env.VERCEL) {
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log(`Truk Dealil IL Fullstack Server running on port ${PORT}`);
    });
  }
}

// In non-Vercel environments (local dev or container), start server and listen
if (!process.env.VERCEL) {
  startServer();
}

export default app;
