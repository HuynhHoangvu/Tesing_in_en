import pg from 'pg';

const { Pool } = pg;

let _pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!_pool) {
    const isProduction = process.env.NODE_ENV === 'production';
    _pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/placement_test',
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    });
  }
  return _pool;
}

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[]
): Promise<T[]> {
  const pool = getPool();
  const result = await pool.query(text, params);
  return result.rows as T[];
}

export async function initDB(): Promise<void> {
  await query(`
    CREATE TABLE IF NOT EXISTS test_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_name  VARCHAR(255) NOT NULL,
      student_email VARCHAR(255) DEFAULT '',
      student_phone VARCHAR(50)  DEFAULT '',
      started_at    TIMESTAMPTZ  DEFAULT NOW(),
      submitted_at  TIMESTAMPTZ,
      listening_score  INTEGER DEFAULT 0,
      reading_score    INTEGER DEFAULT 0,
      total_score      INTEGER DEFAULT 0,
      total_questions  INTEGER DEFAULT 45,
      pct              INTEGER DEFAULT 0,
      level            VARCHAR(100) DEFAULT '',
      answers          JSONB    DEFAULT '[]',
      time_taken_seconds INTEGER DEFAULT 0
    )
  `);
}

export type TestSession = {
  id: string;
  student_name: string;
  student_email: string;
  student_phone: string;
  started_at: string;
  submitted_at: string | null;
  listening_score: number;
  reading_score: number;
  total_score: number;
  total_questions: number;
  pct: number;
  level: string;
  answers: number[];
  time_taken_seconds: number;
};
