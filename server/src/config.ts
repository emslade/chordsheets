import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env['PORT'] || '5200', 10),
  databaseUrl: process.env['DATABASE_URL'] || 'postgresql://postgres:postgres@localhost:5432/chordsheets',
  jwtSecret: process.env['JWT_SECRET'] || 'dev-secret-change-me',
  jwtExpiresIn: 86400, // 24 hours in seconds
};
