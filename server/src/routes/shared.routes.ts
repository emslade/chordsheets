import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';
import { presenceManager } from '../presence.js';

const router = Router();

export function sharedMapRow(row: any) {
  return {
    id: row.id,
    title: row.title,
    artist: row.artist,
    key: row.key,
    capo: row.capo,
    tuning: row.tuning,
    chordsAsShapes: row.chords_as_shapes,
    customChords: row.custom_chords,
    content: row.content,
    nashvilleContent: row.nashville_content,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// SSE endpoint for live updates (must be before /:token)
router.get('/:token/events', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT id FROM chord_sheets WHERE share_token = $1',
    [req.params['token']]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  const sheetId = result.rows[0].id;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  const viewer = presenceManager.addViewer(sheetId, res);
  sendSSE(res, 'connected', { viewer });

  req.on('close', () => {
    presenceManager.removeViewer(sheetId, viewer.id);
  });
});

function sendSSE(res: Response, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// Get a shared sheet by token (no auth required)
router.get('/:token', async (req: Request, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM chord_sheets WHERE share_token = $1',
    [req.params['token']]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  res.json(sharedMapRow(result.rows[0]));
});

export default router;
