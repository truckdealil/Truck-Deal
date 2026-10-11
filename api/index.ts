import app from '../server.ts';

export default function handler(req: any, res: any) {
  try {
    if (req.url && !req.url.startsWith('/api') && req.url !== '/sw.js' && req.url !== '/manifest.json') {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
    return app(req, res);
  } catch (err: any) {
    console.error('[Vercel Serverless Handler Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Serverless Handler Exception' });
    }
  }
}
