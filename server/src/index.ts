import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import authRoutes from './routes/auth.routes.js';
import sheetsRoutes from './routes/sheets.routes.js';
import sharedRoutes from './routes/shared.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/shared', sharedRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use(errorMiddleware);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
