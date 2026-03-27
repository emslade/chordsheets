import { Router, Request, Response } from 'express';
import { pool } from '../db/pool.js';

const router = Router();

function mapRow(row: any) {
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

  res.json(mapRow(result.rows[0]));
});

export default router;
