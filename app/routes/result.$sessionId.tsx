import type { Route } from './+types/result.$sessionId';
import { query, initDB, type TestSession } from '~/lib/db.server';
import {
  ANSWER_KEY, LISTENING_COUNT, READING_COUNT, TOTAL_QUESTIONS,
  calcLevel, levelColor, levelRecommendation,
  LISTENING_MCQ, LISTENING_MATCHING, ROOM_LETTERS,
  READING_PART1, READING_PART2, READING_PART3,
} from '~/data/questions';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Kết quả – Fly Immigration Placement Test' }];
}

export async function loader({ params }: Route.LoaderArgs) {
  await initDB();
  const rows = await query<TestSession>(
    'SELECT * FROM test_sessions WHERE id = $1',
    [params.sessionId]
  );
  if (!rows.length) throw new Response('Not found', { status: 404 });
  return { session: rows[0] };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScoreRing({ pct }: { pct: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="#f3f4f6" strokeWidth="12" />
      <circle
        cx="70" cy="70" r={r}
        fill="none"
        stroke="url(#goldGrad)"
        strokeWidth="12"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform="rotate(-90 70 70)"
      />
      <defs>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#E5B800" />
          <stop offset="100%" stopColor="#C8960C" />
        </linearGradient>
      </defs>
      <text x="70" y="65" textAnchor="middle" className="text-2xl font-bold" style={{ font: 'bold 28px Inter,sans-serif', fill: '#1a1200' }}>
        {pct}%
      </text>
      <text x="70" y="85" textAnchor="middle" style={{ font: '12px Inter,sans-serif', fill: '#7a6a3a' }}>
        điểm số
      </text>
    </svg>
  );
}

function StatCard({ label, value, subtext, color }: { label: string; value: string; subtext?: string; color?: string }) {
  return (
    <div className="fly-card rounded-2xl p-4 text-center shadow-sm">
      <p className="text-xs text-slate mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color || 'inherit' }}>{value}</p>
      {subtext && <p className="text-xs text-slate mt-0.5">{subtext}</p>}
    </div>
  );
}

function QuestionReview({ idx, answers }: { idx: number; answers: number[] }) {
  const correct = ANSWER_KEY[idx];
  const given = answers[idx];
  const isCorrect = given === correct;

  // Determine label
  let questionLabel = '';
  let options: string[] = [];

  if (idx < 5) {
    const q = LISTENING_MCQ[idx];
    questionLabel = `Câu ${idx + 1} – Listening MCQ: ${q.text}`;
    options = q.options;
  } else if (idx < 10) {
    const q = LISTENING_MATCHING[idx - 5];
    questionLabel = `Câu ${idx + 1} – Listening Matching: ${q.text}`;
    options = ROOM_LETTERS.map(r => `Room ${r}`);
  } else if (idx < 20) {
    const q = READING_PART1[idx - 10];
    questionLabel = `Câu ${idx + 1} – Reading P1: "${q.text.slice(0, 50)}..."`;
    options = q.options;
  } else if (idx < 25) {
    const cq = READING_PART2.questions[idx - 20];
    questionLabel = `Câu ${cq.id} – Reading P2 (Cloze)`;
    options = cq.options;
  } else if (idx < 30) {
    const pq = READING_PART3[0].questions[idx - 25];
    questionLabel = `Câu ${pq.id} – Reading P3 Passage 1: ${pq.text}`;
    options = pq.options;
  } else {
    const pq = READING_PART3[1].questions[idx - 30];
    questionLabel = `Câu ${pq.id} – Reading P3 Passage 2: ${pq.text}`;
    options = pq.options;
  }

  return (
    <div className={`rounded-xl border p-4 text-sm ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
      <div className="flex items-start gap-2 mb-2">
        <span className={`shrink-0 font-bold ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
          {isCorrect ? '✓' : '✗'}
        </span>
        <p className="text-xs font-semibold text-ink">{questionLabel}</p>
      </div>
      {!isCorrect && (
        <div className="pl-5 space-y-0.5 text-xs">
          <p className="text-red-600">
            Bạn chọn: {given >= 0 ? options[given] : '(Không trả lời)'}
          </p>
          <p className="text-green-700">Đáp án đúng: {options[correct]}</p>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function ResultPage({ loaderData }: Route.ComponentProps) {
  const { session } = loaderData;
  const answers: number[] = Array.isArray(session.answers) ? session.answers : JSON.parse(session.answers as unknown as string);

  const pct = session.pct;
  const level = session.level || calcLevel(pct);
  const recommendation = levelRecommendation(level);
  const color = levelColor(level);

  const listeningPct = Math.round((session.listening_score / LISTENING_COUNT) * 100);
  const readingPct = Math.round((session.reading_score / READING_COUNT) * 100);

  const wrongIndices = answers.map((a, i) => i).filter(i => answers[i] !== ANSWER_KEY[i]);
  const timeTaken = session.time_taken_seconds || 0;
  const mins = Math.floor(timeTaken / 60);
  const secs = timeTaken % 60;

  return (
    <div className="min-h-screen fly-bg flex flex-col">
      {/* Header */}
      <header className="fly-header">
        <img src="/logo.jpg" alt="Fly Immigration" className="fly-logo" />
      </header>

      <main className="flex-1 px-4 py-8 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-5">

          {/* Hero card */}
          <div className="fly-card rounded-3xl p-8 shadow-gold text-center">
            <div className="inline-flex items-center gap-2 bg-gold-soft rounded-full px-4 py-1.5 mb-5">
              <span className="text-sm font-semibold text-gold-dark">Kết quả bài kiểm tra</span>
            </div>

            <ScoreRing pct={pct} />

            <div className="mt-4 mb-2">
              <span
                className="inline-block px-5 py-2 rounded-full text-white text-sm font-bold shadow"
                style={{ backgroundColor: color }}
              >
                {level}
              </span>
            </div>

            <p className="text-ink font-bold text-lg mt-3">{session.student_name}</p>
            <p className="text-slate text-sm">{recommendation}</p>

            <div className="grid grid-cols-3 gap-3 mt-6">
              <StatCard
                label="Tổng điểm"
                value={`${session.total_score}/${TOTAL_QUESTIONS}`}
                subtext={`${pct}%`}
                color="#C8960C"
              />
              <StatCard
                label="Listening"
                value={`${session.listening_score}/${LISTENING_COUNT}`}
                subtext={`${listeningPct}%`}
              />
              <StatCard
                label="Reading"
                value={`${session.reading_score}/${READING_COUNT}`}
                subtext={`${readingPct}%`}
              />
            </div>

            <p className="text-xs text-slate mt-4">
              Thời gian làm bài: {mins}ph {secs}s
              {session.student_email && ` · ${session.student_email}`}
            </p>
          </div>

          {/* Score bars */}
          <div className="fly-card rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-4">Phân tích điểm số</p>
            {[
              { label: '🎧 Listening', score: session.listening_score, total: LISTENING_COUNT, pct: listeningPct },
              { label: '📖 Reading', score: session.reading_score, total: READING_COUNT, pct: readingPct },
            ].map(bar => (
              <div key={bar.label} className="mb-4">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-medium text-ink">{bar.label}</span>
                  <span className="text-slate text-xs">{bar.score}/{bar.total} ({bar.pct}%)</span>
                </div>
                <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${bar.pct}%`, background: 'linear-gradient(90deg,#E5B800,#C8960C)' }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Level scale */}
          <div className="fly-card rounded-2xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-3">Thang trình độ</p>
            {[
              { lvl: 'A0 – Beginner', range: '0–39%', color: '#dc2626' },
              { lvl: 'A1 – Elementary', range: '40–54%', color: '#ea580c' },
              { lvl: 'A2 – Pre-Intermediate', range: '55–69%', color: '#d97706' },
              { lvl: 'B1 – Intermediate', range: '70–79%', color: '#16a34a' },
              { lvl: 'B2 – Upper-Intermediate', range: '80–89%', color: '#2563eb' },
              { lvl: 'C1 – Advanced', range: '90–100%', color: '#7c3aed' },
            ].map(row => (
              <div key={row.lvl} className={`flex justify-between items-center py-2 px-3 rounded-lg mb-1 text-sm
                ${row.lvl === level ? 'bg-gold-soft border border-gold' : 'bg-transparent'}`}>
                <span style={{ color: row.color }} className="font-semibold">{row.lvl}</span>
                <span className="text-slate text-xs">{row.range}</span>
              </div>
            ))}
          </div>

          {/* Wrong answers review */}
          {wrongIndices.length > 0 && (
            <div className="fly-card rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-3">
                Câu sai ({wrongIndices.length} câu)
              </p>
              <div className="space-y-2">
                {wrongIndices.slice(0, 20).map(i => (
                  <QuestionReview key={i} idx={i} answers={answers} />
                ))}
                {wrongIndices.length > 20 && (
                  <p className="text-xs text-slate text-center pt-2">
                    ... và {wrongIndices.length - 20} câu sai khác
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pb-6">
            <a href="/" className="fly-btn-secondary flex-1 text-center">
              Làm bài mới
            </a>
            <button onClick={() => window.print()} className="fly-btn-primary flex-1">
              🖨️ In kết quả
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
