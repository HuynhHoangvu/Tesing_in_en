import nodemailer from 'nodemailer';
import {
  ANSWER_KEY, TOTAL_QUESTIONS, LISTENING_COUNT, READING_COUNT,
  LISTENING_MCQ, LISTENING_MATCHING, ROOM_LETTERS,
  READING_PART1, READING_PART2, READING_PART3,
  calcLevel, levelColor, levelRecommendation,
} from '~/data/questions';

// ── Transport ─────────────────────────────────────────────────────────────────

function getTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.gmail.com',
    port:   parseInt(process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true',   // true for port 465
    auth: {
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getQuestionLabel(idx: number): string {
  if (idx < 5)  return `L Q${idx + 1} (MCQ): ${LISTENING_MCQ[idx].text.slice(0, 45)}`;
  if (idx < 10) return `L Q${idx + 1} (Match): ${LISTENING_MATCHING[idx - 5].text}`;
  if (idx < 20) return `R-P1 Q${idx + 1}: "${READING_PART1[idx - 10].text.slice(0, 45)}..."`;
  if (idx < 25) return `R-P2 Q${idx + 1} (Cloze #${idx - 19})`;
  if (idx < 30) return `R-P3a Q${idx + 1}: ${READING_PART3[0].questions[idx - 25].text.slice(0, 45)}...`;
  return              `R-P3b Q${idx + 1}: ${READING_PART3[1].questions[idx - 30].text.slice(0, 45)}...`;
}

function getOptions(idx: number): string[] {
  if (idx < 5)  return LISTENING_MCQ[idx].options;
  if (idx < 10) return ROOM_LETTERS.map(r => `Room ${r}`);
  if (idx < 20) return READING_PART1[idx - 10].options;
  if (idx < 25) return READING_PART2.questions[idx - 20].options;
  if (idx < 30) return READING_PART3[0].questions[idx - 25].options;
  return              READING_PART3[1].questions[idx - 30].options;
}

// ── Email template ────────────────────────────────────────────────────────────

interface ResultPayload {
  sessionId:      string;
  studentName:    string;
  studentEmail:   string;
  studentPhone:   string;
  listeningScore: number;
  readingScore:   number;
  totalScore:     number;
  pct:            number;
  level:          string;
  answers:        number[];
  timeTakenSeconds: number;
  submittedAt:    Date;
}

function buildHTML(r: ResultPayload): string {
  const color = levelColor(r.level);
  const recommendation = levelRecommendation(r.level);
  const listeningPct = Math.round((r.listeningScore / LISTENING_COUNT) * 100);
  const readingPct   = Math.round((r.readingScore   / READING_COUNT)   * 100);
  const mins = Math.floor(r.timeTakenSeconds / 60);
  const secs = r.timeTakenSeconds % 60;
  const date = r.submittedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });

  // Wrong answers
  const wrongRows = r.answers
    .map((given, idx) => ({ idx, given, correct: ANSWER_KEY[idx] }))
    .filter(x => x.given !== x.correct)
    .map(({ idx, given, correct }) => {
      const opts = getOptions(idx);
      const givenText  = given  >= 0 ? opts[given]  : '(Không trả lời)';
      const correctText = opts[correct];
      return `
        <tr style="border-bottom:1px solid #f0e8cc">
          <td style="padding:8px 12px;font-size:12px;color:#444;max-width:300px">${getQuestionLabel(idx)}</td>
          <td style="padding:8px 12px;font-size:12px;color:#dc2626">${givenText}</td>
          <td style="padding:8px 12px;font-size:12px;color:#16a34a">${correctText}</td>
        </tr>`;
    }).join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#fdf5d8;font-family:Inter,Arial,sans-serif">

<div style="max-width:680px;margin:24px auto;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(180,130,0,.12)">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#E5B800,#C8960C);padding:28px 32px;text-align:center">
    <p style="margin:0;color:#3b2000;font-size:22px;font-weight:800;letter-spacing:-0.5px">Fly Immigration</p>
    <p style="margin:4px 0 0;color:#3b2000;font-size:13px;opacity:.8">English Placement Test — Kết quả bài thi</p>
  </div>

  <!-- Score hero -->
  <div style="padding:32px;text-align:center;border-bottom:1px solid #ede5cc">
    <p style="margin:0 0 4px;font-size:14px;color:#7a6a3a">Học viên</p>
    <p style="margin:0 0 20px;font-size:22px;font-weight:700;color:#1a1200">${r.studentName}</p>

    <div style="display:inline-block;width:110px;height:110px;border-radius:50%;
                background:linear-gradient(135deg,#E5B800,#C8960C);
                line-height:110px;font-size:32px;font-weight:800;color:#3b2000;
                box-shadow:0 6px 20px rgba(200,150,12,.3)">
      ${r.pct}%
    </div>

    <div style="margin-top:16px">
      <span style="display:inline-block;background:${color};color:#fff;
                   font-size:14px;font-weight:700;padding:6px 20px;border-radius:999px">
        ${r.level}
      </span>
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#7a6a3a;max-width:420px;display:inline-block;line-height:1.5">
      ${recommendation}
    </p>
  </div>

  <!-- Score breakdown -->
  <div style="padding:24px 32px;border-bottom:1px solid #ede5cc">
    <p style="margin:0 0 16px;font-size:11px;font-weight:700;color:#7a6a3a;text-transform:uppercase;letter-spacing:.08em">
      Chi tiết điểm số
    </p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding:0 8px 0 0;width:33%">
          <div style="background:#fdf3d0;border-radius:14px;padding:16px;text-align:center">
            <p style="margin:0;font-size:11px;color:#7a6a3a">Tổng điểm</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#C8960C">
              ${r.totalScore}<span style="font-size:13px;color:#7a6a3a">/${TOTAL_QUESTIONS}</span>
            </p>
          </div>
        </td>
        <td style="padding:0 4px;width:33%">
          <div style="background:#fdf3d0;border-radius:14px;padding:16px;text-align:center">
            <p style="margin:0;font-size:11px;color:#7a6a3a">🎧 Listening</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#1a1200">
              ${r.listeningScore}<span style="font-size:13px;color:#7a6a3a">/${LISTENING_COUNT}</span>
            </p>
            <p style="margin:2px 0 0;font-size:11px;color:#7a6a3a">${listeningPct}%</p>
          </div>
        </td>
        <td style="padding:0 0 0 8px;width:33%">
          <div style="background:#fdf3d0;border-radius:14px;padding:16px;text-align:center">
            <p style="margin:0;font-size:11px;color:#7a6a3a">📖 Reading</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:800;color:#1a1200">
              ${r.readingScore}<span style="font-size:13px;color:#7a6a3a">/${READING_COUNT}</span>
            </p>
            <p style="margin:2px 0 0;font-size:11px;color:#7a6a3a">${readingPct}%</p>
          </div>
        </td>
      </tr>
    </table>

    <!-- Score bars -->
    <div style="margin-top:16px">
      ${[
        { label: '🎧 Listening', pct: listeningPct },
        { label: '📖 Reading',   pct: readingPct   },
      ].map(b => `
        <div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;margin-bottom:5px">
            <span style="font-size:12px;font-weight:600;color:#1a1200">${b.label}</span>
            <span style="font-size:12px;color:#7a6a3a">${b.pct}%</span>
          </div>
          <div style="background:#f3f4f6;border-radius:999px;height:8px;overflow:hidden">
            <div style="width:${b.pct}%;height:100%;background:linear-gradient(90deg,#E5B800,#C8960C);border-radius:999px"></div>
          </div>
        </div>`).join('')}
    </div>
  </div>

  <!-- Student info -->
  <div style="padding:20px 32px;border-bottom:1px solid #ede5cc;background:#fffef9">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#7a6a3a;text-transform:uppercase;letter-spacing:.08em">
      Thông tin học viên
    </p>
    <table cellpadding="0" cellspacing="0">
      ${[
        ['Họ tên',       r.studentName],
        ['Email',        r.studentEmail  || '—'],
        ['Điện thoại',   r.studentPhone  || '—'],
        ['Thời gian làm',`${mins} phút ${secs} giây`],
        ['Nộp bài lúc',  date],
        ['Session ID',   r.sessionId],
      ].map(([k, v]) => `
        <tr>
          <td style="padding:3px 16px 3px 0;font-size:12px;color:#7a6a3a;white-space:nowrap">${k}</td>
          <td style="padding:3px 0;font-size:12px;font-weight:600;color:#1a1200">${v}</td>
        </tr>`).join('')}
    </table>
  </div>

  <!-- Wrong answers -->
  ${wrongRows ? `
  <div style="padding:20px 32px">
    <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#7a6a3a;text-transform:uppercase;letter-spacing:.08em">
      Câu trả lời sai (${r.answers.filter((a, i) => a !== ANSWER_KEY[i]).length} câu)
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
           style="border:1px solid #f0e8cc;border-radius:10px;overflow:hidden;font-size:12px">
      <thead>
        <tr style="background:#fdf3d0">
          <th style="padding:8px 12px;text-align:left;color:#7a6a3a;font-weight:700">Câu hỏi</th>
          <th style="padding:8px 12px;text-align:left;color:#dc2626;font-weight:700">Học viên chọn</th>
          <th style="padding:8px 12px;text-align:left;color:#16a34a;font-weight:700">Đáp án đúng</th>
        </tr>
      </thead>
      <tbody>${wrongRows}</tbody>
    </table>
  </div>` : `
  <div style="padding:24px 32px;text-align:center">
    <p style="font-size:14px;color:#16a34a;font-weight:600">🎉 Học viên trả lời đúng tất cả câu hỏi!</p>
  </div>`}

  <!-- Footer -->
  <div style="background:#fdf3d0;padding:16px 32px;text-align:center;border-top:1px solid #ede5cc">
    <p style="margin:0;font-size:11px;color:#7a6a3a">
      Fly Immigration &nbsp;·&nbsp; English Placement Test &nbsp;·&nbsp;
      Email tự động — vui lòng không trả lời
    </p>
  </div>

</div>
</body>
</html>`;
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function sendResultEmail(payload: ResultPayload): Promise<void> {
  const smtpUser  = process.env.SMTP_USER;
  const smtpPass  = process.env.SMTP_PASS;
  const notifyTo  = process.env.NOTIFY_EMAIL || 'elysia.huynh@flymigration.vn';

  // Skip silently if SMTP not configured
  if (!smtpUser || !smtpPass) {
    console.warn('[email] SMTP_USER / SMTP_PASS chưa được cấu hình — bỏ qua gửi email.');
    return;
  }

  console.log(`[email] Đang gửi tới ${notifyTo} từ ${smtpUser}...`);

  const transport = getTransport();
  const html = buildHTML(payload);
  const mins = Math.floor(payload.timeTakenSeconds / 60);

  await transport.sendMail({
    from:    process.env.SMTP_FROM || `"Fly Immigration Test" <${smtpUser}>`,
    to:      notifyTo,
    subject: `[Kết quả thi] ${payload.studentName} — ${payload.pct}% — ${payload.level}`,
    html,
    text: [
      `Học viên: ${payload.studentName}`,
      `Email: ${payload.studentEmail || '—'}`,
      `Điện thoại: ${payload.studentPhone || '—'}`,
      `Trình độ: ${payload.level}`,
      `Tổng điểm: ${payload.totalScore}/${TOTAL_QUESTIONS} (${payload.pct}%)`,
      `Listening: ${payload.listeningScore}/${LISTENING_COUNT}`,
      `Reading:   ${payload.readingScore}/${READING_COUNT}`,
      `Thời gian làm: ${mins} phút`,
      `Nộp lúc: ${payload.submittedAt.toLocaleString('vi-VN')}`,
    ].join('\n'),
  });

  console.log(`[email] Đã gửi kết quả của "${payload.studentName}" tới ${notifyTo}`);
}
