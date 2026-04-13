import { redirect } from 'react-router';
import type { Route } from './+types/admin';
import { adminCookie, checkPassword, requireAdmin } from '~/lib/auth.server';
import { query, initDB, type TestSession } from '~/lib/db.server';
import { calcLevel, levelColor, TOTAL_QUESTIONS, LISTENING_COUNT, READING_COUNT } from '~/data/questions';

export function meta({}: Route.MetaArgs) {
  return [{ title: 'Admin – Fly Immigration Placement Test' }];
}

// ── Loader ────────────────────────────────────────────────────────────────────

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const cookieHeader = request.headers.get('Cookie');
  const value = await adminCookie.parse(cookieHeader);
  const isAuth = value === 'authenticated';

  if (!isAuth) return { isAuth: false, sessions: [] };

  await initDB();

  // Filters
  const levelFilter = url.searchParams.get('level') || '';
  const dateFilter = url.searchParams.get('date') || '';
  const search = url.searchParams.get('search') || '';

  let queryStr = `
    SELECT * FROM test_sessions
    WHERE submitted_at IS NOT NULL
  `;
  const params: unknown[] = [];

  if (levelFilter) {
    params.push(levelFilter);
    queryStr += ` AND level = $${params.length}`;
  }
  if (dateFilter) {
    params.push(dateFilter);
    queryStr += ` AND DATE(submitted_at) = $${params.length}`;
  }
  if (search) {
    params.push(`%${search}%`);
    queryStr += ` AND (student_name ILIKE $${params.length} OR student_email ILIKE $${params.length})`;
  }

  queryStr += ' ORDER BY submitted_at DESC LIMIT 200';

  const sessions = await query<TestSession>(queryStr, params);

  // Summary stats
  const stats = await query<{ total: string; avg_pct: string; avg_l: string; avg_r: string }>(
    `SELECT
       COUNT(*) as total,
       ROUND(AVG(pct)) as avg_pct,
       ROUND(AVG(listening_score)) as avg_l,
       ROUND(AVG(reading_score)) as avg_r
     FROM test_sessions WHERE submitted_at IS NOT NULL`
  );

  const levelDist = await query<{ level: string; cnt: string }>(
    `SELECT level, COUNT(*) as cnt FROM test_sessions
     WHERE submitted_at IS NOT NULL GROUP BY level ORDER BY cnt DESC`
  );

  return { isAuth: true, sessions, stats: stats[0], levelDist };
}

// ── Action ────────────────────────────────────────────────────────────────────

export async function action({ request }: Route.ActionArgs) {
  const form = await request.formData();
  const intent = form.get('intent') as string;

  // Login
  if (intent === 'login') {
    const password = form.get('password') as string;
    if (checkPassword(password)) {
      const cookieHeader = await adminCookie.serialize('authenticated');
      throw redirect('/admin', { headers: { 'Set-Cookie': cookieHeader } });
    }
    return { error: 'Mật khẩu không đúng.' };
  }

  // Logout
  if (intent === 'logout') {
    const cookieHeader = await adminCookie.serialize('', { maxAge: 0 });
    throw redirect('/admin', { headers: { 'Set-Cookie': cookieHeader } });
  }

  // Delete session
  if (intent === 'delete') {
    await requireAdmin(request);
    const id = form.get('id') as string;
    await query('DELETE FROM test_sessions WHERE id = $1', [id]);
    throw redirect('/admin');
  }

  return null;
}

// ── Components ────────────────────────────────────────────────────────────────

function LevelBadge({ level }: { level: string }) {
  const color = levelColor(level);
  return (
    <span
      className="text-xs font-bold px-2 py-0.5 rounded-full text-white whitespace-nowrap"
      style={{ backgroundColor: color }}
    >
      {level.split('–')[0].trim()}
    </span>
  );
}

function ScoreBar({ score, total }: { score: number; total: number }) {
  const pct = Math.round((score / total) * 100);
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#E5B800,#C8960C)' }}
        />
      </div>
      <span className="text-xs text-slate">{score}/{total}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPage({ loaderData, actionData }: Route.ComponentProps) {
  const data = loaderData as {
    isAuth: boolean;
    sessions: TestSession[];
    stats?: { total: string; avg_pct: string; avg_l: string; avg_r: string };
    levelDist?: { level: string; cnt: string }[];
  };

  const error = actionData && 'error' in actionData ? actionData.error : null;

  // ── Login screen ──
  if (!data.isAuth) {
    return (
      <div className="min-h-screen fly-bg flex flex-col items-center justify-center p-4">
        <div className="fly-card rounded-3xl p-8 w-full max-w-sm shadow-gold text-center">
          <img src="/logo.jpg" alt="Fly Immigration" className="fly-logo mx-auto mb-6" />
          <h1 className="text-xl font-bold text-ink mb-1">Admin Dashboard</h1>
          <p className="text-sm text-slate mb-6">Fly Immigration Placement Test</p>

          <form method="post" className="space-y-4 text-left">
            <input type="hidden" name="intent" value="login" />
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Mật khẩu</label>
              <input
                name="password"
                type="password"
                placeholder="••••••••"
                required
                className="fly-input"
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                {error}
              </p>
            )}
            <button type="submit" className="fly-btn-primary w-full">Đăng nhập</button>
          </form>
        </div>
      </div>
    );
  }

  // ── Dashboard ──
  const { sessions, stats, levelDist } = data;

  return (
    <div className="min-h-screen fly-bg flex flex-col">
      {/* Topbar */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gold-border px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <img src="/logo.jpg" alt="" className="fly-logo-sm" />
            <div>
              <p className="text-sm font-bold text-ink">Admin Dashboard</p>
              <p className="text-xs text-slate">Fly Immigration – Placement Test</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/admin?export=csv"
              className="fly-btn-secondary text-xs"
              onClick={(e) => {
                e.preventDefault();
                exportCSV(sessions);
              }}
            >
              📥 Xuất CSV
            </a>
            <form method="post">
              <input type="hidden" name="intent" value="logout" />
              <button type="submit" className="text-xs text-slate hover:text-red-500 transition-colors">
                Đăng xuất
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 py-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-5">

          {/* Summary stats */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Tổng học viên', value: stats.total, icon: '👥' },
                { label: 'Điểm TB (%)', value: `${stats.avg_pct}%`, icon: '📊' },
                { label: 'Listening TB', value: `${stats.avg_l}/${LISTENING_COUNT}`, icon: '🎧' },
                { label: 'Reading TB', value: `${stats.avg_r}/${READING_COUNT}`, icon: '📖' },
              ].map(s => (
                <div key={s.label} className="fly-card rounded-2xl p-4 shadow-sm text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-bold text-ink">{s.value}</div>
                  <div className="text-xs text-slate">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {/* Level distribution */}
          {levelDist && levelDist.length > 0 && (
            <div className="fly-card rounded-2xl p-5 shadow-sm">
              <p className="text-xs font-semibold text-slate uppercase tracking-wider mb-4">Phân bổ trình độ</p>
              <div className="space-y-2">
                {levelDist.map(({ level, cnt }) => {
                  const total = parseInt(stats?.total || '1', 10);
                  const pct = Math.round((parseInt(cnt) / total) * 100);
                  return (
                    <div key={level} className="flex items-center gap-3">
                      <LevelBadge level={level} />
                      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: levelColor(level) }}
                        />
                      </div>
                      <span className="text-xs text-slate w-16 text-right">{cnt} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="fly-card rounded-2xl p-4 shadow-sm">
            <form className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[160px]">
                <label className="text-xs text-slate block mb-1">Tìm kiếm (tên / email)</label>
                <input name="search" placeholder="Nguyễn Văn A..." className="fly-input py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-slate block mb-1">Trình độ</label>
                <select name="level" className="fly-input py-2 text-sm">
                  <option value="">Tất cả</option>
                  {['A0 – Beginner', 'A1 – Elementary', 'A2 – Pre-Intermediate', 'B1 – Intermediate', 'B2 – Upper-Intermediate', 'C1 – Advanced']
                    .map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate block mb-1">Ngày</label>
                <input name="date" type="date" className="fly-input py-2 text-sm" />
              </div>
              <button type="submit" className="fly-btn-primary text-sm py-2">Lọc</button>
              <a href="/admin" className="fly-btn-secondary text-sm py-2">Reset</a>
            </form>
          </div>

          {/* Sessions table */}
          <div className="fly-card rounded-2xl shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gold-border flex justify-between items-center">
              <p className="text-sm font-semibold text-ink">
                Danh sách học viên ({sessions.length})
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gold-soft text-xs text-slate uppercase tracking-wider">
                    <th className="px-4 py-3 text-left">Học viên</th>
                    <th className="px-4 py-3 text-left">Trình độ</th>
                    <th className="px-4 py-3 text-left">Tổng</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Listening</th>
                    <th className="px-4 py-3 text-left hidden md:table-cell">Reading</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Thời gian</th>
                    <th className="px-4 py-3 text-left hidden lg:table-cell">Ngày thi</th>
                    <th className="px-4 py-3 text-right">Xóa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-10 text-slate text-sm">
                        Chưa có dữ liệu nào.
                      </td>
                    </tr>
                  ) : sessions.map((s) => {
                    const level = s.level || calcLevel(s.pct);
                    const timeMins = Math.floor((s.time_taken_seconds || 0) / 60);
                    const timeSecs = (s.time_taken_seconds || 0) % 60;
                    const date = s.submitted_at
                      ? new Date(s.submitted_at).toLocaleDateString('vi-VN')
                      : '—';

                    return (
                      <tr key={s.id} className="hover:bg-gold-soft/30 transition-colors">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ink">{s.student_name}</p>
                          <p className="text-xs text-slate">{s.student_email || s.student_phone || '—'}</p>
                        </td>
                        <td className="px-4 py-3">
                          <LevelBadge level={level} />
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-ink">{s.total_score}/{TOTAL_QUESTIONS}</span>
                          <span className="text-xs text-slate ml-1">({s.pct}%)</span>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <ScoreBar score={s.listening_score} total={LISTENING_COUNT} />
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <ScoreBar score={s.reading_score} total={READING_COUNT} />
                        </td>
                        <td className="px-4 py-3 text-xs text-slate hidden lg:table-cell">
                          {timeMins}ph {timeSecs}s
                        </td>
                        <td className="px-4 py-3 text-xs text-slate hidden lg:table-cell">
                          {date}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <form method="post">
                            <input type="hidden" name="intent" value="delete" />
                            <input type="hidden" name="id" value={s.id} />
                            <button
                              type="submit"
                              className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              onClick={(e) => {
                                if (!confirm(`Xóa bài của "${s.student_name}"?`)) e.preventDefault();
                              }}
                            >
                              Xóa
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── CSV Export (client-side) ──────────────────────────────────────────────────

function exportCSV(sessions: TestSession[]) {
  const headers = ['Họ tên', 'Email', 'Điện thoại', 'Trình độ', 'Tổng', '%', 'Listening', 'Reading', 'Thời gian (giây)', 'Ngày nộp'];
  const rows = sessions.map(s => [
    s.student_name,
    s.student_email || '',
    s.student_phone || '',
    s.level,
    s.total_score,
    s.pct,
    s.listening_score,
    s.reading_score,
    s.time_taken_seconds || 0,
    s.submitted_at ? new Date(s.submitted_at).toLocaleString('vi-VN') : '',
  ]);
  const csvContent = [headers, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `fly-placement-test-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
