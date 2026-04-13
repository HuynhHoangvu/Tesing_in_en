import { redirect, Form, useActionData } from 'react-router';
import type { Route } from './+types/home';
import { initDB, query } from '~/lib/db.server';
import { randomUUID } from 'crypto';

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Fly Immigration – English Placement Test' },
    { name: 'description', content: 'Bài kiểm tra đầu vào tiếng Anh – Fly Immigration' },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  await initDB();
  const form = await request.formData();
  const name  = (form.get('name')  as string | null)?.trim() ?? '';
  const email = (form.get('email') as string | null)?.trim() ?? '';
  const phone = (form.get('phone') as string | null)?.trim() ?? '';

  if (!name) return { error: 'Vui lòng nhập họ và tên.' };

  const id = randomUUID();
  await query(
    `INSERT INTO test_sessions (id, student_name, student_email, student_phone)
     VALUES ($1, $2, $3, $4)`,
    [id, name, email, phone]
  );

  throw redirect(`/test/${id}`);
}

export default function Home() {
  const actionData = useActionData<typeof action>();
  const error = actionData && 'error' in actionData ? actionData.error : null;

  return (
    <div className="min-h-screen fly-bg flex flex-col">
      {/* Header */}
      <header className="fly-header">
        <img src="/logo.jpg" alt="Fly Immigration" className="fly-logo" />
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-lg">
          <div className="fly-card rounded-3xl p-8 shadow-gold">

            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-2 bg-gold-soft rounded-full px-4 py-1.5 mb-4">
                <span className="text-sm font-semibold text-gold-dark">English Placement Test</span>
              </div>
              <h1 className="text-3xl font-bold text-ink mb-2">Kiểm tra đầu vào</h1>
              <p className="text-slate text-sm leading-relaxed">
                Bài kiểm tra gồm <b>45 câu</b> chia thành 2 phần:<br />
                <b>Listening</b> (20 câu) và <b>Reading</b> (25 câu).<br />
                Thời gian làm bài: <b>60 phút</b>.
              </p>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {[
                { icon: '🎧', label: 'Listening', val: '20 câu' },
                { icon: '📖', label: 'Reading', val: '25 câu' },
                { icon: '⏱️', label: 'Thời gian', val: '60 phút' },
              ].map((item) => (
                <div key={item.label} className="bg-gold-soft rounded-2xl p-3 text-center">
                  <div className="text-2xl mb-1">{item.icon}</div>
                  <div className="text-xs text-slate">{item.label}</div>
                  <div className="text-sm font-bold text-ink">{item.val}</div>
                </div>
              ))}
            </div>

            {/* Form */}
            <Form method="post" className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <input
                  name="name"
                  required
                  placeholder="Nguyễn Văn A"
                  className="fly-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Email <span className="text-slate text-xs font-normal">(không bắt buộc)</span>
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="example@email.com"
                  className="fly-input"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink mb-1.5">
                  Số điện thoại <span className="text-slate text-xs font-normal">(không bắt buộc)</span>
                </label>
                <input
                  name="phone"
                  type="tel"
                  placeholder="0912 345 678"
                  className="fly-input"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-xl px-4 py-2">
                  {error}
                </p>
              )}

              <button type="submit" className="fly-btn-primary w-full mt-2">
                Bắt đầu làm bài →
              </button>
            </Form>

            {/* Instructions */}
            <div className="mt-6 border-t border-gold-border pt-5 space-y-2 text-sm text-slate">
              <p className="font-semibold text-ink text-xs uppercase tracking-wider mb-3">Lưu ý trước khi thi</p>
              {[
                'Sử dụng tai nghe để nghe phần Listening rõ nhất.',
                'Mỗi đoạn âm thanh có thể nghe lại tối đa 2 lần.',
                'Không được thoát khỏi trang trong khi làm bài.',
                'Bài thi sẽ tự nộp khi hết giờ.',
              ].map((note, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-gold shrink-0">•</span>
                  <span>{note}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="text-center py-4 text-xs text-slate">
        © 2025 Fly Immigration. All rights reserved.
      </footer>
    </div>
  );
}
