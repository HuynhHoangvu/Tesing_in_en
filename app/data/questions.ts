// ─────────────────────────────────────────────────────────────────────────────
// QUESTION DATA  –  Fly Immigration Placement Test
// 35 questions total: 10 Listening + 25 Reading
// ─────────────────────────────────────────────────────────────────────────────

export type ReadingPart = 'grammar' | 'cloze' | 'comprehension';

// ── Listening Types ───────────────────────────────────────────────────────────

export interface ListeningMCQ {
  id: number;           // 1-5
  text: string;
  options: string[];    // 3 options: A, B, C
  correct: number;      // 0=A, 1=B, 2=C
}

export interface ListeningMatching {
  id: number;           // 6-10
  text: string;         // department name
  correct: number;      // 0=A … 6=G
}

// ── Reading Types ─────────────────────────────────────────────────────────────

export interface GrammarQuestion {
  type: 'grammar';
  id: number;
  part: 1;
  text: string;
  options: string[];
  correct: number;
}

export interface ClozePassage {
  type: 'cloze';
  part: 2;
  passageTitle: string;
  passageBeforeAfter: ClozeSegment[];
  questions: ClozeQuestion[];
}

export interface ClozeSegment {
  kind: 'text' | 'blank';
  text?: string;
  questionId?: number;
}

export interface ClozeQuestion {
  id: number;
  options: string[];
  correct: number;
}

export interface ComprehensionPassage {
  type: 'comprehension';
  part: 3;
  passageId: string;
  title: string;
  body: string;
  questions: ComprehensionQuestion[];
}

export interface ComprehensionQuestion {
  id: number;
  text: string;
  options: string[];
  correct: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// LISTENING – Section 1: Multiple Choice  (Q1-Q5 → global indices 0-4)
// Audio: /listening_test.mp3
// ─────────────────────────────────────────────────────────────────────────────

export const LISTENING_MCQ: ListeningMCQ[] = [
  {
    id: 1,
    text: 'The company deals mostly with:',
    options: ['A. Big cities.', 'B. Nature holidays.', 'C. Nepal.'],
    correct: 1,   // B
  },
  {
    id: 2,
    text: 'The overseas consultants deal mostly with:',
    options: ['A. Asia.', 'B. North America.', 'C. Europe.'],
    correct: 2,   // C
  },
  {
    id: 3,
    text: 'For deserts and gorges, customers should come in the:',
    options: ['A. Morning.', 'B. Afternoon.', 'C. Night.'],
    correct: 0,   // A
  },
  {
    id: 4,
    text: 'Trips to regional locations are good because:',
    options: [
      'A. The buses are comfortable.',
      'B. There is storage for suitcases.',
      'C. They can be seen quickly.',
    ],
    correct: 2,   // C
  },
  {
    id: 5,
    text: 'SleekLine buses are particularly known for their:',
    options: ['A. Service.', 'B. Size.', 'C. Comfort.'],
    correct: 0,   // A
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// LISTENING – Section 2: Matching – Office Floor Plan  (Q6-Q10 → indices 5-9)
// Image: /listening_test_img.png   Rooms A-G
// ─────────────────────────────────────────────────────────────────────────────

export const ROOM_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

export const LISTENING_MATCHING: ListeningMatching[] = [
  { id: 6,  text: 'Local Tours',        correct: 4 },  // E
  { id: 7,  text: 'Interstate Tours',   correct: 6 },  // G
  { id: 8,  text: 'International Tours',correct: 3 },  // D
  { id: 9,  text: 'Asian Region',       correct: 5 },  // F
  { id: 10, text: 'General Office',     correct: 0 },  // A
];

// ─────────────────────────────────────────────────────────────────────────────
// READING PART 1 – Grammar & Vocabulary  (Q21-Q30 → global indices 10-19)
// ─────────────────────────────────────────────────────────────────────────────

export const READING_PART1: GrammarQuestion[] = [
  {
    type: 'grammar', id: 21, part: 1,
    text: 'She ________ to the office every day by bus.',
    options: ['A. go', 'B. goes', 'C. going', 'D. gone'],
    correct: 1,
  },
  {
    type: 'grammar', id: 22, part: 1,
    text: 'By the time we arrived at the venue, the meeting ________ already.',
    options: ['A. starts', 'B. has started', 'C. started', 'D. had started'],
    correct: 3,
  },
  {
    type: 'grammar', id: 23, part: 1,
    text: 'The project was completed ________ schedule, which greatly impressed the manager.',
    options: ['A. ahead of', 'B. instead of', 'C. in spite of', 'D. due to'],
    correct: 0,
  },
  {
    type: 'grammar', id: 24, part: 1,
    text: 'If I ________ more free time, I would travel around the world.',
    options: ['A. have', 'B. had', 'C. have had', 'D. would have'],
    correct: 1,
  },
  {
    type: 'grammar', id: 25, part: 1,
    text: 'The new employee is very ________ and always meets her deadlines without reminders.',
    options: ['A. rely', 'B. reliably', 'C. reliable', 'D. reliability'],
    correct: 2,
  },
  {
    type: 'grammar', id: 26, part: 1,
    text: 'We need to ________ a decision before the end of the working week.',
    options: ['A. do', 'B. have', 'C. make', 'D. take'],
    correct: 2,
  },
  {
    type: 'grammar', id: 27, part: 1,
    text: 'The annual international conference will be ________ in Singapore next March.',
    options: ['A. hold', 'B. held', 'C. holding', 'D. holds'],
    correct: 1,
  },
  {
    type: 'grammar', id: 28, part: 1,
    text: 'Despite ________ hard throughout the entire semester, she did not pass the final exam.',
    options: ['A. study', 'B. to study', 'C. studied', 'D. studying'],
    correct: 3,
  },
  {
    type: 'grammar', id: 29, part: 1,
    text: 'The quarterly report needs ________ carefully before it is submitted to the board.',
    options: ['A. review', 'B. to review', 'C. reviewing', 'D. reviewed'],
    correct: 2,
  },
  {
    type: 'grammar', id: 30, part: 1,
    text: 'Neither the manager nor the employees ________ informed about the upcoming changes.',
    options: ['A. was', 'B. were', 'C. is', 'D. has been'],
    correct: 1,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// READING PART 2 – Cloze Test  (Q31-Q35 → global indices 20-24)
// ─────────────────────────────────────────────────────────────────────────────

export const READING_PART2: ClozePassage = {
  type: 'cloze',
  part: 2,
  passageTitle: 'Remote Work Trends',
  passageBeforeAfter: [
    { kind: 'text', text: 'Working from home has become increasingly ' },
    { kind: 'blank', questionId: 31 },
    { kind: 'text', text: ' in recent years, particularly following the global pandemic. Many companies have ' },
    { kind: 'blank', questionId: 32 },
    { kind: 'text', text: ' that allowing staff to work remotely can significantly boost productivity. However, it is essential for employees to ' },
    { kind: 'blank', questionId: 33 },
    { kind: 'text', text: ' a healthy work-life balance. Setting up a ' },
    { kind: 'blank', questionId: 34 },
    { kind: 'text', text: ' workspace at home and maintaining regular working hours are key strategies for staying focused and motivated. Despite these benefits, some workers still miss the social ' },
    { kind: 'blank', questionId: 35 },
    { kind: 'text', text: ' that comes naturally from being in a shared office environment.' },
  ],
  questions: [
    { id: 31, options: ['A. rare', 'B. expensive', 'C. difficult', 'D. common'], correct: 3 },
    { id: 32, options: ['A. denied', 'B. prevented', 'C. discovered', 'D. forgotten'], correct: 2 },
    { id: 33, options: ['A. ignore', 'B. break', 'C. avoid', 'D. maintain'], correct: 3 },
    { id: 34, options: ['A. temporary', 'B. crowded', 'C. dedicated', 'D. noisy'], correct: 2 },
    { id: 35, options: ['A. isolation', 'B. competition', 'C. interaction', 'D. pressure'], correct: 2 },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// READING PART 3 – Comprehension  (Q36-Q45 → global indices 25-34)
// ─────────────────────────────────────────────────────────────────────────────

export const READING_PART3: ComprehensionPassage[] = [
  {
    type: 'comprehension', part: 3,
    passageId: 'smart-cities',
    title: 'The Rise of Smart Cities',
    body: `The concept of "smart cities" is rapidly transforming urban life around the world. A smart city uses digital technology and data analysis to improve the quality of services provided to its citizens. These include traffic management systems that automatically adjust signal timing to reduce congestion, energy grids that predict and respond to demand fluctuations, and waste management systems that notify collection teams when bins are full.

Singapore is often cited as one of the world's leading smart cities. The government has invested heavily in sensors and cameras throughout the city to monitor everything from traffic flow to the cleanliness of public spaces. Citizens can access hundreds of government services through a single mobile application. Privacy advocates, however, raise concerns about the extent of surveillance in such systems.

Despite these concerns, many city planners believe that smart technology is essential for managing the challenges of rapid urbanization. As more people move into cities, the demand for efficient public services will only increase.`,
    questions: [
      {
        id: 36,
        text: 'What is the main topic of the passage?',
        options: [
          "A. Singapore's government policies",
          'B. The problems of rapid urbanization',
          'C. How digital technology improves city services',
          'D. Privacy concerns in modern cities',
        ],
        correct: 2,
      },
      {
        id: 37,
        text: 'According to the passage, what can traffic management systems do?',
        options: [
          'A. Build new roads automatically',
          'B. Reduce the number of vehicles in a city',
          'C. Adjust traffic signal timing to reduce congestion',
          'D. Predict accidents before they happen',
        ],
        correct: 2,
      },
      {
        id: 38,
        text: 'Why is Singapore mentioned in the passage?',
        options: [
          'A. It was the first city to develop smart technology',
          'B. It is an example of a leading smart city',
          'C. It has the most serious urbanization problems',
          'D. It has banned surveillance cameras',
        ],
        correct: 1,
      },
      {
        id: 39,
        text: 'What concern do privacy advocates raise?',
        options: [
          'A. Smart cities are too expensive to build',
          'B. The technology does not work effectively',
          'C. Citizens cannot access government services',
          'D. The level of surveillance is too extensive',
        ],
        correct: 3,
      },
      {
        id: 40,
        text: 'The word "fluctuations" in paragraph 1 most likely means:',
        options: [
          'A. Steady increases over time',
          'B. Sudden complete stops',
          'C. Changes that go up and down',
          'D. Long-term downward trends',
        ],
        correct: 2,
      },
    ],
  },
  {
    type: 'comprehension', part: 3,
    passageId: 'workplace-tools',
    title: 'Workplace Communication Tools',
    body: `Email has been the backbone of business communication for decades, but its dominance is now being challenged by a new generation of workplace messaging tools. Applications such as Slack, Microsoft Teams, and similar platforms offer real-time communication, file sharing, and project organisation all within a single interface.

Proponents argue that these tools reduce the time employees spend searching through crowded inboxes and make it easier to collaborate on projects. A study by a leading productivity research firm found that companies using team messaging apps reported a 25% reduction in internal email volume.

Critics, however, warn that constant notifications from these apps can disrupt concentration and lead to what researchers call "digital fatigue." They suggest that employees should establish clear boundaries, such as setting specific hours for checking messages and turning off notifications during focused work sessions.

The most effective approach, according to workplace consultants, is not to replace email entirely but to use each tool for its most appropriate purpose — email for formal, documented communication and messaging apps for quick, informal exchanges.`,
    questions: [
      {
        id: 41,
        text: 'What is the main purpose of the passage?',
        options: [
          'A. To recommend that companies stop using email immediately',
          'B. To discuss the role of new messaging tools in the workplace',
          'C. To explain how email was originally invented',
          'D. To advertise specific messaging applications',
        ],
        correct: 1,
      },
      {
        id: 42,
        text: 'According to the study mentioned, what was the result of using team messaging apps?',
        options: [
          'A. Productivity decreased significantly',
          'B. Employee satisfaction improved greatly',
          'C. Internal email volume was reduced by 25%',
          'D. Companies saved money on IT infrastructure',
        ],
        correct: 2,
      },
      {
        id: 43,
        text: 'What do critics warn about messaging apps?',
        options: [
          'A. They are too expensive for small companies',
          'B. They are difficult to learn how to use',
          'C. Constant notifications can cause digital fatigue',
          'D. They are less secure than traditional email',
        ],
        correct: 2,
      },
      {
        id: 44,
        text: 'What do workplace consultants recommend?',
        options: [
          'A. Switch entirely to messaging apps',
          'B. Continue using only email for all communication',
          'C. Use both tools for their appropriate purposes',
          'D. Limit communication to one hour per day',
        ],
        correct: 2,
      },
      {
        id: 45,
        text: 'The word "proponents" in paragraph 2 is closest in meaning to:',
        options: ['A. Critics', 'B. Supporters', 'C. Employees', 'D. Researchers'],
        correct: 1,
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Flat answer key, 35 positions:
 *  0- 4  Listening MCQ  (Q1-5)
 *  5- 9  Listening Matching (Q6-10, index into A-G)
 * 10-19  Reading Part 1  (Q21-30)
 * 20-24  Reading Part 2  (Q31-35)
 * 25-29  Reading Part 3 passage 1 (Q36-40)
 * 30-34  Reading Part 3 passage 2 (Q41-45)
 */
export const ANSWER_KEY: number[] = [
  // Listening MCQ (0-4)
  ...LISTENING_MCQ.map((q) => q.correct),
  // Listening Matching (5-9)
  ...LISTENING_MATCHING.map((q) => q.correct),
  // Reading Part 1 (10-19)
  ...READING_PART1.map((q) => q.correct),
  // Reading Part 2 cloze (20-24)
  ...READING_PART2.questions.map((q) => q.correct),
  // Reading Part 3 passage 1 (25-29)
  ...READING_PART3[0].questions.map((q) => q.correct),
  // Reading Part 3 passage 2 (30-34)
  ...READING_PART3[1].questions.map((q) => q.correct),
];

export const TOTAL_QUESTIONS  = 35;
export const LISTENING_COUNT  = 10;
export const READING_COUNT    = 25;

export function calcLevel(pct: number): string {
  if (pct >= 90) return 'C1 – Advanced';
  if (pct >= 80) return 'B2 – Upper-Intermediate';
  if (pct >= 70) return 'B1 – Intermediate';
  if (pct >= 55) return 'A2 – Pre-Intermediate';
  if (pct >= 40) return 'A1 – Elementary';
  return 'A0 – Beginner';
}

export function levelColor(level: string): string {
  if (level.startsWith('C1')) return '#7c3aed';
  if (level.startsWith('B2')) return '#2563eb';
  if (level.startsWith('B1')) return '#16a34a';
  if (level.startsWith('A2')) return '#d97706';
  if (level.startsWith('A1')) return '#ea580c';
  return '#dc2626';
}

export function levelRecommendation(level: string): string {
  const map: Record<string, string> = {
    'C1 – Advanced': 'Lớp IELTS 7.0+ — Học viên có trình độ rất cao, phù hợp các khóa luyện thi nâng cao.',
    'B2 – Upper-Intermediate': 'Lớp IELTS 6.0–6.5 — Học viên có nền tảng vững, cần bổ sung kỹ năng học thuật.',
    'B1 – Intermediate': 'Lớp IELTS 5.0–5.5 — Học viên đã có kiến thức cơ bản, cần ôn luyện toàn diện.',
    'A2 – Pre-Intermediate': 'Lớp IELTS Foundation — Cần củng cố ngữ pháp và từ vựng nền tảng trước khi luyện thi.',
    'A1 – Elementary': 'Lớp tiếng Anh cơ bản — Cần học lại từ đầu theo chương trình có hệ thống.',
    'A0 – Beginner': 'Lớp tiếng Anh nhập môn — Chưa có nền tảng, cần bắt đầu từ giao tiếp cơ bản nhất.',
  };
  return map[level] ?? '';
}
