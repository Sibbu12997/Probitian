import express from 'express';

export function apiErrorHandler(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
  console.error('[API Unhandled Error]', {
    path: req.path,
    method: req.method,
    error: err?.message || String(err),
    stack: process.env.NODE_ENV !== 'production' ? err?.stack : undefined
  });

  if (res.headersSent) {
    return next(err);
  }

  return res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' ? { details: err.stack } : {})
  });
}

export function apiNotFoundHandler(req: express.Request, res: express.Response) {
  return res.status(404).json({ error: `Endpoint ${req.method} ${req.path} not found` });
}
