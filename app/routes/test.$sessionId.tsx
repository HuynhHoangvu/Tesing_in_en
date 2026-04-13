import { useEffect, useRef, useReducer, useState } from 'react';
import { redirect, useFetcher } from 'react-router';
import type { Route } from './+types/test.$sessionId';
import { query, initDB } from '~/lib/db.server';
import { sendResultEmail } from '~/lib/email.server';
import {
  LISTENING_MCQ, LISTENING_MATCHING, ROOM_LETTERS,
  READING_PART1, READING_PART2, READING_PART3,
  ANSWER_KEY, TOTAL_QUESTIONS, LISTENING_COUNT, READING_COUNT,
  calcLevel,
} from '~/data/questions';

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ params }: Route.LoaderArgs) {
  await initDB();
  const rows = await query<{ student_name: string; submitted_at: string | null }>(
    'SELECT student_name, submitted_at FROM test_sessions WHERE id = $1',
    [params.sessionId]
  );
  if (!rows.length) throw new Response('Session not found', { status: 404 });
  if (rows[0].submitted_at) throw redirect(`/result/${params.sessionId}`);
  return { sessionId: params.sessionId, studentName: rows[0].student_name };
}

// ── Action (submit) ───────────────────────────────────────────────────────────

export async function action({ request, params }: Route.ActionArgs) {
  console.log('[action] Submit nhận được, sessionId:', params.sessionId);
  const form = await request.formData();
  const rawAnswers = form.get('answers') as string;
  const timeTaken  = parseInt(form.get('timeTaken') as string, 10) || 0;
  const answers: number[] = JSON.parse(rawAnswers);
  console.log('[action] answers length:', answers.length, '| timeTaken:', timeTaken);

  let listeningScore = 0;
  let readingScore   = 0;
  for (let i = 0; i < TOTAL_QUESTIONS; i++) {
    if (answers[i] === ANSWER_KEY[i]) {
      if (i < LISTENING_COUNT) listeningScore++;
      else readingScore++;
    }
  }
  const totalScore = listeningScore + readingScore;
  const pct        = Math.round((totalScore / TOTAL_QUESTIONS) * 100);
  const level      = calcLevel(pct);
  const submittedAt = new Date();

  await query(
    `UPDATE test_sessions SET
       submitted_at = $9, answers = $2, listening_score = $3,
       reading_score = $4, total_score = $5, pct = $6,
       level = $7, time_taken_seconds = $8
     WHERE id = $1`,
    [params.sessionId, JSON.stringify(answers), listeningScore, readingScore,
     totalScore, pct, level, timeTaken, submittedAt]
  );

  const rows = await query<{ student_name: string; student_email: string; student_phone: string }>(
    'SELECT student_name, student_email, student_phone FROM test_sessions WHERE id = $1',
    [params.sessionId]
  );
  console.log('[action] rows từ DB:', rows.length, '| SMTP_USER:', process.env.SMTP_USER || 'CHƯA SET');
  if (rows.length) {
    console.log('[action] Gọi sendResultEmail...');
    sendResultEmail({
      sessionId: params.sessionId!, studentName: rows[0].student_name,
      studentEmail: rows[0].student_email, studentPhone: rows[0].student_phone,
      listeningScore, readingScore, totalScore, pct, level, answers,
      timeTakenSeconds: timeTaken, submittedAt,
    }).catch(err => console.error('[email] error:', err));
  }

  throw redirect(`/result/${params.sessionId}`);
}

// ── State machine ─────────────────────────────────────────────────────────────

type Phase = 'l-intro' | 'l-questions' | 'r-intro' | 'r-p1' | 'r-p2' | 'r-p3' | 'review';

type State = {
  phase:    Phase;
  qIndex:   number;       // used inside r-p1 (0-9) and r-p3 (0|1)
  answers:  (number | null)[];
  secsLeft: number;
};

type Act =
  | { type: 'ANSWER'; idx: number; choice: number }
  | { type: 'GOTO'; phase: Phase }
  | { type: 'NEXT' }
  | { type: 'PREV' }
  | { type: 'TICK' };

function init(): State {
  return { phase: 'l-intro', qIndex: 0, answers: new Array(TOTAL_QUESTIONS).fill(null), secsLeft: 60 * 60 };
}

function reducer(s: State, a: Act): State {
  switch (a.type) {
    case 'ANSWER': {
      const ans = [...s.answers];
      ans[a.idx] = a.choice;
      return { ...s, answers: ans };
    }
    case 'GOTO':   return { ...s, phase: a.phase, qIndex: 0 };
    case 'NEXT':   return { ...s, qIndex: s.qIndex + 1 };
    case 'PREV':   return { ...s, qIndex: Math.max(0, s.qIndex - 1) };
    case 'TICK':   return { ...s, secsLeft: Math.max(0, s.secsLeft - 1) };
    default:       return s;
  }
}

// ── Shared UI ─────────────────────────────────────────────────────────────────

function Timer({ secs }: { secs: number }) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  const urgent = secs <= 300;
  return (
    <span className={`font-mono font-bold text-base ${urgent ? 'text-red-600 animate-pulse' : 'text-ink'}`}>
      {m}:{s}
    </span>
  );
}

function ProgressBar({ answered, total }: { answered: number; total: number }) {
  const pct = Math.round((answered / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#E5B800,#C8960C)' }} />
      </div>
      <span className="text-xs text-slate whitespace-nowrap">{answered}/{total}</span>
    </div>
  );
}

function TestHeader({ name, secsLeft, answered }: { name: string; secsLeft: number; answered: number }) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gold-border px-4 py-3">
      <div className="max-w-2xl mx-auto flex items-center gap-3">
        <img src="/logo.jpg" alt="Fly Immigration" className="fly-logo-sm" />
        <div className="flex-1 min-w-0"><ProgressBar answered={answered} total={TOTAL_QUESTIONS} /></div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate hidden sm:inline">{name}</span>
          <span className="text-xs text-slate">|</span>
          <Timer secs={secsLeft} />
        </div>
      </div>
    </header>
  );
}

function PartBadge({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <span className="bg-gold-soft border border-gold-border text-gold-dark text-xs font-bold px-3 py-1 rounded-full">
        {label}
      </span>
      {sub && <span className="text-xs text-slate">{sub}</span>}
    </div>
  );
}

function OptBtn({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className={`w-full text-left rounded-2xl border px-4 py-3 text-sm transition-all duration-150 cursor-pointer
        ${selected
          ? 'bg-gold-soft border-gold text-ink font-semibold shadow-inner'
          : 'bg-white border-gray-200 text-ink hover:border-gold hover:bg-gold-soft/40'}`}>
      {label}
    </button>
  );
}

function SectionIntro({ icon, section, description, parts, onStart }: {
  icon: string; section: string; description: string;
  parts: { label: string; count: string }[];
  onStart: () => void;
}) {
  return (
    <div className="fly-card rounded-3xl p-8 text-center shadow-gold max-w-lg mx-auto">
      <div className="text-6xl mb-4">{icon}</div>
      <h2 className="text-2xl font-bold text-ink mb-2">{section}</h2>
      <p className="text-slate text-sm mb-6">{description}</p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {parts.map(p => (
          <div key={p.label} className="bg-gold-soft rounded-2xl p-3">
            <div className="text-xs text-slate">{p.label}</div>
            <div className="text-sm font-bold text-ink">{p.count}</div>
          </div>
        ))}
      </div>
      <button onClick={onStart} className="fly-btn-primary">Bắt đầu →</button>
    </div>
  );
}

// ── Audio Player Component ────────────────────────────────────────────────────

function AudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playCount, setPlayCount]   = useState(0);
  const [isPlaying, setIsPlaying]   = useState(false);
  const MAX_PLAYS = 2;

  function handlePlay() {
    if (!audioRef.current || playCount >= MAX_PLAYS) return;
    if (isPlaying) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlayCount(c => c + 1);
    setIsPlaying(true);
    audioRef.current.play();
  }

  function handleEnded() { setIsPlaying(false); }

  const remaining = MAX_PLAYS - playCount;

  return (
    <div className="bg-gold-soft border border-gold-border rounded-2xl p-4 mb-5">
      <div className="flex items-center gap-4">
        <div className="text-3xl">🎧</div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-ink mb-1">Audio – Section 1</p>
          <p className="text-xs text-slate">
            {playCount === 0
              ? 'Nhấn Play để bắt đầu nghe. Tối đa 2 lần phát.'
              : remaining > 0
              ? `Còn ${remaining} lần phát lại.`
              : 'Đã hết lượt phát lại.'}
          </p>
        </div>
        <button
          onClick={handlePlay}
          disabled={playCount >= MAX_PLAYS}
          className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all
            ${playCount >= MAX_PLAYS
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'fly-btn-primary'}`}>
          {isPlaying ? '⏹ Dừng' : playCount === 0 ? '▶ Play' : '↺ Phát lại'}
        </button>
      </div>

      {/* Native audio (hidden controls, we use custom button) */}
      <audio
        ref={audioRef}
        src="/listening_test.mp3"
        onEnded={handleEnded}
        className="w-full mt-3"
        controls
        style={{ height: 36 }}
      />
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function TestPage({ loaderData }: Route.ComponentProps) {
  const { sessionId, studentName } = loaderData;
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const fetcher = useFetcher();
  const timerRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef(Date.now());

  // Timer
  useEffect(() => {
    timerRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // Auto-submit when time runs out
  useEffect(() => {
    if (state.secsLeft === 0) submit();
  }, [state.secsLeft]);

  function submit() {
    if (timerRef.current) clearInterval(timerRef.current);
    const timeTaken = Math.round((Date.now() - startTimeRef.current) / 1000);
    const form = new FormData();
    form.append('answers', JSON.stringify(state.answers.map(a => a ?? -1)));
    form.append('timeTaken', String(timeTaken));
    fetcher.submit(form, { method: 'post' });
  }

  const answeredCount = state.answers.filter(a => a !== null).length;

  // ── LISTENING INTRO ──────────────────────────────────────────────────────────
  if (state.phase === 'l-intro') {
    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 flex items-center justify-center p-4">
          <SectionIntro
            icon="🎧"
            section="Phần 1: Listening – Nghe hiểu"
            description="Nghe đoạn audio và trả lời các câu hỏi bên dưới. Audio có thể phát tối đa 2 lần."
            parts={[
              { label: 'Questions 1–5', count: 'Chọn A / B / C' },
              { label: 'Questions 6–10', count: 'Matching A–G (sơ đồ)' },
            ]}
            onStart={() => dispatch({ type: 'GOTO', phase: 'l-questions' })}
          />
        </main>
      </div>
    );
  }

  // ── LISTENING QUESTIONS (all 10 on one scrollable page) ──────────────────────
  if (state.phase === 'l-questions') {
    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">

            {/* Sticky audio player */}
            <div className="fly-card rounded-3xl p-5 shadow-gold">
              <PartBadge label="LISTENING – Section 1" />
              <AudioPlayer />
              <p className="text-xs text-slate">
                Nghe audio rồi trả lời <b>10 câu</b> bên dưới. Bạn có thể cuộn xuống trong khi nghe.
              </p>
            </div>

            {/* Q1–5 Multiple Choice */}
            <div className="fly-card rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gold-dark uppercase tracking-wider mb-4">
                Questions 1–5 &nbsp;·&nbsp; Choose the correct letter, A, B, or C.
              </p>
              <div className="space-y-5">
                {LISTENING_MCQ.map((q, qi) => {
                  const globalIdx = qi; // 0-4
                  const ans = state.answers[globalIdx];
                  return (
                    <div key={q.id}>
                      <p className="text-sm font-semibold text-ink mb-2">
                        {q.id}.&nbsp; {q.text}
                      </p>
                      <div className="space-y-1.5">
                        {q.options.map((opt, oi) => (
                          <OptBtn key={oi} label={opt} selected={ans === oi}
                            onClick={() => dispatch({ type: 'ANSWER', idx: globalIdx, choice: oi })} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Q6–10 Matching */}
            <div className="fly-card rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-bold text-gold-dark uppercase tracking-wider mb-1">
                Questions 6–10 &nbsp;·&nbsp; Identify the rooms in the office plan.
              </p>
              <p className="text-xs text-slate mb-4">
                Write the correct letter, <b>A–G</b>, next to each department.
              </p>

              {/* Floor plan image */}
              <div className="rounded-xl overflow-hidden border border-gold-border mb-5 bg-white">
                <img src="/listening_test_img.png" alt="Office floor plan" className="w-full h-auto" />
              </div>

              <div className="space-y-4">
                {LISTENING_MATCHING.map((q, qi) => {
                  const globalIdx = 5 + qi; // 5-9
                  const ans = state.answers[globalIdx];
                  return (
                    <div key={q.id}>
                      <p className="text-sm font-semibold text-ink mb-2">
                        {q.id}.&nbsp; {q.text}
                      </p>
                      {/* A-G pill buttons */}
                      <div className="flex flex-wrap gap-2">
                        {ROOM_LETTERS.map((letter, li) => (
                          <button
                            key={letter}
                            onClick={() => dispatch({ type: 'ANSWER', idx: globalIdx, choice: li })}
                            className={`w-10 h-10 rounded-full text-sm font-bold border transition-all cursor-pointer
                              ${ans === li
                                ? 'bg-gold border-gold text-ink shadow-inner'
                                : 'bg-white border-gray-200 text-ink hover:border-gold hover:bg-gold-soft'}`}>
                            {letter}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pb-4">
              <button onClick={() => dispatch({ type: 'GOTO', phase: 'r-intro' })}
                className="fly-btn-primary">
                Sang Reading →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── READING INTRO ────────────────────────────────────────────────────────────
  if (state.phase === 'r-intro') {
    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 flex items-center justify-center p-4">
          <SectionIntro
            icon="📖"
            section="Phần 2: Reading – Đọc hiểu"
            description="Đọc câu hỏi và chọn đáp án đúng nhất. Có thể làm tự do, bỏ câu rồi quay lại."
            parts={[
              { label: 'Part 1', count: '10 câu ngữ pháp' },
              { label: 'Part 2', count: '5 câu cloze' },
              { label: 'Part 3', count: '10 câu đọc hiểu' },
            ]}
            onStart={() => dispatch({ type: 'GOTO', phase: 'r-p1' })}
          />
        </main>
      </div>
    );
  }

  // ── READING PART 1 – Grammar (one by one) ───────────────────────────────────
  if (state.phase === 'r-p1') {
    const q = READING_PART1[state.qIndex];
    const globalIdx = 10 + state.qIndex; // 10-19
    const ans  = state.answers[globalIdx];
    const isLast = state.qIndex === READING_PART1.length - 1;

    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="fly-card rounded-3xl p-6 shadow-gold w-full max-w-xl">
            <PartBadge label="READING – Part 1 (Grammar & Vocabulary)" sub={`${state.qIndex + 1}/10`} />
            <p className="text-xs text-slate mb-4">Chọn từ/cụm từ phù hợp nhất để điền vào chỗ trống.</p>
            <div className="bg-gold-soft border border-gold-border rounded-xl px-5 py-4 mb-5 text-sm font-medium text-ink leading-relaxed">
              {q.text}
            </div>
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <OptBtn key={i} label={opt} selected={ans === i}
                  onClick={() => dispatch({ type: 'ANSWER', idx: globalIdx, choice: i })} />
              ))}
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => dispatch({ type: 'PREV' })} disabled={state.qIndex === 0}
                className={`fly-btn-secondary flex-1 ${state.qIndex === 0 ? 'opacity-30 cursor-not-allowed' : ''}`}>
                ← Trước
              </button>
              {isLast
                ? <button onClick={() => dispatch({ type: 'GOTO', phase: 'r-p2' })} className="fly-btn-primary flex-1">Part 2 →</button>
                : <button onClick={() => dispatch({ type: 'NEXT' })} className="fly-btn-primary flex-1">Tiếp →</button>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── READING PART 2 – Cloze ──────────────────────────────────────────────────
  if (state.phase === 'r-p2') {
    const passage = READING_PART2;
    const qIdToGlobal: Record<number, number> = { 31: 20, 32: 21, 33: 22, 34: 23, 35: 24 };

    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="fly-card rounded-3xl p-6 shadow-gold mb-4">
              <PartBadge label="READING – Part 2 (Cloze Test)" />
              <p className="text-xs text-slate mb-4">Đọc đoạn văn và chọn từ phù hợp điền vào chỗ trống (31–35).</p>
              <h3 className="text-sm font-bold text-ink mb-3">{passage.passageTitle}</h3>
              <div className="text-sm text-ink leading-8 bg-gold-soft border border-gold-border rounded-xl px-5 py-4">
                {passage.passageBeforeAfter.map((seg, i) => {
                  if (seg.kind === 'text') return <span key={i}>{seg.text}</span>;
                  const gIdx = qIdToGlobal[seg.questionId!];
                  const chosen = state.answers[gIdx];
                  const opts = passage.questions.find(q => q.id === seg.questionId!)!.options;
                  return (
                    <span key={i}
                      className={`inline-flex items-center mx-1 px-3 py-0.5 rounded-full border text-xs font-bold
                        ${chosen !== null ? 'bg-gold text-ink border-gold' : 'bg-white border-gray-300 text-gray-400'}`}>
                      {chosen !== null ? opts[chosen].slice(3) : `(${seg.questionId})`}
                    </span>
                  );
                })}
              </div>
            </div>
            <div className="space-y-4">
              {passage.questions.map(cq => {
                const gIdx = qIdToGlobal[cq.id];
                const ans  = state.answers[gIdx];
                return (
                  <div key={cq.id} className="fly-card rounded-2xl p-5 shadow-sm">
                    <p className="text-sm font-semibold text-ink mb-3">Câu {cq.id}:</p>
                    <div className="grid grid-cols-2 gap-2">
                      {cq.options.map((opt, i) => (
                        <OptBtn key={i} label={opt} selected={ans === i}
                          onClick={() => dispatch({ type: 'ANSWER', idx: gIdx, choice: i })} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => dispatch({ type: 'GOTO', phase: 'r-p3' })} className="fly-btn-primary">
                Part 3 →
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── READING PART 3 – Comprehension ──────────────────────────────────────────
  if (state.phase === 'r-p3') {
    const pIdx   = state.qIndex;          // 0 or 1
    const passage = READING_PART3[pIdx];
    const baseG  = pIdx === 0 ? 25 : 30; // global start index
    const isLast = pIdx === READING_PART3.length - 1;

    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="fly-card rounded-3xl p-6 shadow-gold">
              <PartBadge label={`READING – Part 3 (Passage ${pIdx + 1}/2)`} />
              <p className="text-xs text-slate mb-4">Đọc bài và trả lời các câu hỏi bên dưới.</p>
              <h3 className="text-base font-bold text-ink mb-3">{passage.title}</h3>
              <div className="text-sm text-ink leading-7 bg-gold-soft border border-gold-border rounded-xl px-5 py-4 whitespace-pre-line">
                {passage.body}
              </div>
            </div>
            {passage.questions.map((pq, qi) => {
              const gIdx = baseG + qi;
              const ans  = state.answers[gIdx];
              return (
                <div key={pq.id} className="fly-card rounded-2xl p-5 shadow-sm">
                  <p className="text-sm font-semibold text-ink mb-3">Câu {pq.id}: {pq.text}</p>
                  <div className="space-y-2">
                    {pq.options.map((opt, i) => (
                      <OptBtn key={i} label={opt} selected={ans === i}
                        onClick={() => dispatch({ type: 'ANSWER', idx: gIdx, choice: i })} />
                    ))}
                  </div>
                </div>
              );
            })}
            <div className="flex gap-3 justify-end mt-2 pb-4">
              {pIdx > 0 && (
                <button onClick={() => dispatch({ type: 'PREV' })} className="fly-btn-secondary">← Passage 1</button>
              )}
              {!isLast
                ? <button onClick={() => dispatch({ type: 'NEXT' })} className="fly-btn-primary">Passage 2 →</button>
                : <button onClick={() => dispatch({ type: 'GOTO', phase: 'review' })} className="fly-btn-primary">Xem lại & Nộp →</button>}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── REVIEW & SUBMIT ──────────────────────────────────────────────────────────
  if (state.phase === 'review') {
    const sections = [
      { label: 'Listening (Q1–5 MCQ)',       range: [0, 4]   as [number,number], phase: 'l-questions' as Phase },
      { label: 'Listening (Q6–10 Matching)', range: [5, 9]   as [number,number], phase: 'l-questions' as Phase },
      { label: 'Reading Part 1',             range: [10, 19] as [number,number], phase: 'r-p1'        as Phase },
      { label: 'Reading Part 2',             range: [20, 24] as [number,number], phase: 'r-p2'        as Phase },
      { label: 'Reading Part 3',             range: [25, 34] as [number,number], phase: 'r-p3'        as Phase },
    ];

    return (
      <div className="min-h-screen fly-bg flex flex-col">
        <TestHeader name={studentName} secsLeft={state.secsLeft} answered={answeredCount} />
        <main className="flex-1 px-4 py-6 overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <div className="fly-card rounded-3xl p-6 shadow-gold mb-5">
              <h2 className="text-lg font-bold text-ink mb-1">Xem lại bài làm</h2>
              <p className="text-sm text-slate">
                Đã trả lời <b>{answeredCount}/{TOTAL_QUESTIONS}</b> câu.
                {answeredCount < TOTAL_QUESTIONS && (
                  <span className="text-amber-600"> Còn {TOTAL_QUESTIONS - answeredCount} câu chưa chọn.</span>
                )}
              </p>
            </div>

            {sections.map(({ label, range, phase }) => {
              const [s, e] = range;
              const total  = e - s + 1;
              const done   = state.answers.slice(s, e + 1).filter(a => a !== null).length;
              return (
                <div key={label} className="fly-card rounded-2xl p-4 shadow-sm mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-ink">{label}</p>
                    <p className={`text-xs mt-0.5 ${done === total ? 'text-green-600' : 'text-amber-600'}`}>
                      {done}/{total} câu đã trả lời
                    </p>
                  </div>
                  <button onClick={() => dispatch({ type: 'GOTO', phase })}
                    className="text-gold text-xs font-semibold hover:underline">Xem lại</button>
                </div>
              );
            })}

            {/* Answer grid */}
            <div className="fly-card rounded-2xl p-4 shadow-sm mb-5">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-3">Tổng quan</p>
              <div className="flex flex-wrap gap-1.5">
                {state.answers.map((a, i) => (
                  <div key={i}
                    className={`w-8 h-8 rounded-lg text-xs flex items-center justify-center font-bold
                      ${a !== null ? 'bg-gold text-ink' : 'bg-gray-100 text-gray-400'}`}>
                    {i + 1}
                  </div>
                ))}
              </div>
            </div>

            <fetcher.Form method="post">
              <input type="hidden" name="answers" value={JSON.stringify(state.answers.map(a => a ?? -1))} />
              <input type="hidden" name="timeTaken" value={String(Math.round((Date.now() - startTimeRef.current) / 1000))} />
              <button type="submit" disabled={fetcher.state !== 'idle'} className="fly-btn-primary w-full py-4 text-base">
                {fetcher.state !== 'idle' ? 'Đang nộp bài...' : '✓ Nộp bài'}
              </button>
            </fetcher.Form>
          </div>
        </main>
      </div>
    );
  }

  return null;
}
