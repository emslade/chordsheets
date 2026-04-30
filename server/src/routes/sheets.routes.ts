import { Router, Response } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import { config } from '../config.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.middleware.js';
import { presenceManager } from '../presence.js';
import { sharedMapRow } from './shared.routes.js';

const router = Router();

// SSE presence endpoint — registered before authMiddleware so we can
// accept the JWT as a query parameter (EventSource doesn't support headers)
router.get('/:id/presence', async (req: AuthRequest, res: Response) => {
  const token = (req.query['token'] as string) || req.headers.authorization?.slice(7);
  if (!token) {
    res.status(401).json({ error: 'No token provided' });
    return;
  }

  let userId: string;
  try {
    const decoded = jwt.verify(token, config.jwtSecret) as { sub: string };
    userId = decoded.sub;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  const result = await pool.query(
    'SELECT id FROM chord_sheets WHERE id = $1 AND user_id = $2',
    [req.params['id'], userId]
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

  const editorId = presenceManager.addEditor(sheetId, res);

  req.on('close', () => {
    presenceManager.removeEditor(sheetId, editorId);
  });
});

router.use(authMiddleware);

const tuningEnum = z.enum(['standard', 'drop-d', 'open-g', 'open-d', 'open-e', 'dadgad', 'half-step-down', 'full-step-down']);

const customChordSchema = z.object({
  name: z.string().min(1).max(20),
  frets: z.array(z.number().int().min(-1).max(24)).length(6),
  baseFret: z.number().int().min(1).max(20),
});

const createSchema = z.object({
  title: z.string().min(1).max(255),
  artist: z.string().max(255).optional(),
  key: z.string().max(10).optional(),
  capo: z.number().int().min(0).max(12).optional(),
  tuning: tuningEnum.optional(),
  chordsAsShapes: z.boolean().optional(),
  customChords: z.array(customChordSchema).optional(),
  content: z.string(),
  nashvilleContent: z.string().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  artist: z.string().max(255).optional().nullable(),
  key: z.string().max(10).optional().nullable(),
  capo: z.number().int().min(0).max(12).optional().nullable(),
  tuning: tuningEnum.optional().nullable(),
  chordsAsShapes: z.boolean().optional().nullable(),
  customChords: z.array(customChordSchema).optional().nullable(),
  content: z.string().optional(),
  nashvilleContent: z.string().optional().nullable(),
});

function mapRow(row: any) {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    artist: row.artist,
    key: row.key,
    capo: row.capo,
    tuning: row.tuning,
    chordsAsShapes: row.chords_as_shapes,
    customChords: row.custom_chords,
    content: row.content,
    nashvilleContent: row.nashville_content,
    shareToken: row.share_token || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// List all sheets for the authenticated user
router.get('/', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM chord_sheets WHERE user_id = $1 ORDER BY updated_at DESC',
    [req.userId]
  );
  res.json(result.rows.map(mapRow));
});

// Get a single sheet
router.get('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'SELECT * FROM chord_sheets WHERE id = $1 AND user_id = $2',
    [req.params['id'], req.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  res.json(mapRow(result.rows[0]));
});

// Create a new sheet
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const body = createSchema.parse(req.body);

    const result = await pool.query(
      `INSERT INTO chord_sheets (user_id, title, artist, key, capo, tuning, chords_as_shapes, custom_chords, content, nashville_content)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.userId, body.title, body.artist || null, body.key || null, body.capo ?? null, body.tuning || null, body.chordsAsShapes ?? true, body.customChords ? JSON.stringify(body.customChords) : null, body.content, body.nashvilleContent || null]
    );

    res.status(201).json(mapRow(result.rows[0]));
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// Update a sheet
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const body = updateSchema.parse(req.body);

    // Build dynamic update query
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.title !== undefined) {
      fields.push(`title = $${paramIndex++}`);
      values.push(body.title);
    }
    if (body.artist !== undefined) {
      fields.push(`artist = $${paramIndex++}`);
      values.push(body.artist);
    }
    if (body.key !== undefined) {
      fields.push(`key = $${paramIndex++}`);
      values.push(body.key);
    }
    if (body.capo !== undefined) {
      fields.push(`capo = $${paramIndex++}`);
      values.push(body.capo);
    }
    if (body.tuning !== undefined) {
      fields.push(`tuning = $${paramIndex++}`);
      values.push(body.tuning);
    }
    if (body.customChords !== undefined) {
      fields.push(`custom_chords = $${paramIndex++}`);
      values.push(body.customChords ? JSON.stringify(body.customChords) : null);
    }
    if (body.chordsAsShapes !== undefined) {
      fields.push(`chords_as_shapes = $${paramIndex++}`);
      values.push(body.chordsAsShapes);
    }
    if (body.content !== undefined) {
      fields.push(`content = $${paramIndex++}`);
      values.push(body.content);
    }
    if (body.nashvilleContent !== undefined) {
      fields.push(`nashville_content = $${paramIndex++}`);
      values.push(body.nashvilleContent);
    }

    if (fields.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    fields.push(`updated_at = NOW()`);
    values.push(req.params['id'], req.userId);

    const result = await pool.query(
      `UPDATE chord_sheets SET ${fields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Sheet not found' });
      return;
    }

    const row = result.rows[0];
    res.json(mapRow(row));

    // Notify live viewers if sheet is shared
    if (row.share_token) {
      presenceManager.notifyViewers(row.id, sharedMapRow(row));
    }
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: err.errors });
      return;
    }
    throw err;
  }
});

// Delete a sheet
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'DELETE FROM chord_sheets WHERE id = $1 AND user_id = $2',
    [req.params['id'], req.userId]
  );

  if (result.rowCount === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  res.status(204).send();
});

// Enable sharing (generate token if not already set)
router.post('/:id/share', async (req: AuthRequest, res: Response) => {
  const token = crypto.randomBytes(16).toString('hex');
  const result = await pool.query(
    'UPDATE chord_sheets SET share_token = COALESCE(share_token, $1) WHERE id = $2 AND user_id = $3 RETURNING *',
    [token, req.params['id'], req.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  res.json(mapRow(result.rows[0]));
});

// Disable sharing (remove token)
router.delete('/:id/share', async (req: AuthRequest, res: Response) => {
  const result = await pool.query(
    'UPDATE chord_sheets SET share_token = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
    [req.params['id'], req.userId]
  );

  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Sheet not found' });
    return;
  }

  presenceManager.disconnectAllViewers(req.params['id'] as string);
  res.json(mapRow(result.rows[0]));
});

export default router;
