// EduIQ deterministic student-tool engines.
// Every result is computed in the browser. Raw input is never stored, uploaded,
// or sent to a paid service. The optional LLM only receives redacted, computed text.

export const TOOLS = [
  {
    id: 'study',
    name: 'StudyIQ',
    mark: 'SQ',
    tag: 'Planning',
    description: 'Build a spaced revision timetable and instant quiz from your subjects.',
    fields: [
      { name: 'subjects', label: 'Subjects and weightage', type: 'textarea', placeholder: 'Math 40, Physics 30, Chemistry 30', defaultValue: 'Math 40, Physics 30, Chemistry 30', limit: 3000 },
      { name: 'examDate', label: 'Exam date', type: 'date', defaultValue: '', limit: 40 },
      { name: 'hours', label: 'Study hours per day', type: 'number', defaultValue: '2', min: '0.5', max: '12', step: '0.5', limit: 20 },
      { name: 'level', label: 'Level', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], defaultValue: 'Intermediate', limit: 40 }
    ]
  },
  {
    id: 'placement',
    name: 'PlacementIQ',
    mark: 'PI',
    tag: 'Career',
    description: 'Practise a timed mock interview with role questions and a rubric score.',
    fields: [
      { name: 'role', label: 'Target role', type: 'text', placeholder: 'Frontend Developer', defaultValue: 'Frontend Developer', limit: 160 },
      { name: 'minutes', label: 'Mock duration (minutes)', type: 'number', defaultValue: '10', min: '5', max: '60', step: '5', limit: 20 },
      { name: 'level', label: 'Level', type: 'select', options: ['Fresher', 'Mid-level', 'Senior'], defaultValue: 'Fresher', limit: 40 },
      { name: 'answer', label: 'Your practice answer (optional)', type: 'textarea', placeholder: 'Paste your answer to the first question. It stays in this browser.', defaultValue: '', limit: 8000 }
    ]
  },
  {
    id: 'resume',
    name: 'ResumeIQ',
    mark: 'RI',
    tag: 'Career',
    description: 'Paste a resume to get a keyword-gap and structure review. No upload.',
    fields: [
      { name: 'targetRole', label: 'Target role', type: 'text', placeholder: 'Software Engineer', defaultValue: 'Software Engineer', limit: 160 },
      { name: 'resume', label: 'Resume text', type: 'textarea', placeholder: 'Paste your resume text here. Contact details are automatically redacted from the result.', defaultValue: '', limit: 12000 }
    ]
  },
  {
    id: 'code',
    name: 'CodeMentor',
    mark: 'CM',
    tag: 'Coding',
    description: 'Get a deterministic code review with clear, beginner-friendly suggestions.',
    fields: [
      { name: 'language', label: 'Language', type: 'select', options: ['JavaScript', 'Python', 'Java', 'C++', 'Other'], defaultValue: 'JavaScript', limit: 40 },
      { name: 'code', label: 'Paste your code', type: 'textarea', placeholder: 'Paste a small function. Nothing is stored or uploaded.', defaultValue: '', limit: 12000 }
    ]
  },
  {
    id: 'research',
    name: 'ResearchIQ',
    mark: 'RQ',
    tag: 'Research',
    description: 'Summarise an abstract and surface missing method, result, and limitation details.',
    fields: [
      { name: 'abstract', label: 'Abstract', type: 'textarea', placeholder: 'Paste a paper abstract here.', defaultValue: '', limit: 12000 }
    ]
  },
  {
    id: 'campus',
    name: 'CampusIQ',
    mark: 'CI',
    tag: 'Campus',
    description: 'Search your notes and a built-in campus FAQ in one clean workspace.',
    fields: [
      { name: 'query', label: 'What are you looking for?', type: 'text', placeholder: 'library timing', defaultValue: 'library timing', limit: 240 },
      { name: 'notes', label: 'Your notes (optional)', type: 'textarea', placeholder: 'Paste class notes. Each line is treated as one searchable note.', defaultValue: '', limit: 12000 }
    ]
  },
  {
    id: 'spark',
    name: 'SparkIQ',
    mark: 'SP',
    tag: 'Startup',
    description: 'Score a student startup idea on clarity, uniqueness, and testability.',
    fields: [
      { name: 'idea', label: 'Your idea in one paragraph', type: 'textarea', placeholder: 'Describe the problem, who faces it, and your proposed solution.', defaultValue: '', limit: 6000 },
      { name: 'target', label: 'First user group', type: 'text', placeholder: 'Final-year engineering students', defaultValue: 'Final-year students', limit: 160 }
    ]
  },
  {
    id: 'green',
    name: 'GreenIQ',
    mark: 'GI',
    tag: 'Climate',
    description: 'Estimate a campus carbon footprint and get practical reduction ideas.',
    fields: [
      { name: 'students', label: 'Number of students', type: 'number', defaultValue: '1000', min: '1', max: '100000', step: '1', limit: 20 },
      { name: 'commute', label: 'Main commute mode', type: 'select', options: ['Bus', 'Walk', 'Cycle', 'Car', 'Bike'], defaultValue: 'Bus', limit: 40 },
      { name: 'energy', label: 'Campus energy use (kWh/day)', type: 'number', defaultValue: '120', min: '0', max: '100000', step: '1', limit: 20 },
      { name: 'waste', label: 'Campus waste (kg/day)', type: 'number', defaultValue: '25', min: '0', max: '100000', step: '1', limit: 20 }
    ]
  }
];

const MAX_TEXT = 12000;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function redact(text) {
  return String(text)
    .replace(/https?:\/\/\S+/gi, '[link]')
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[email]')
    .replace(/\+?\d[\d\s().-]{8,}\d/g, '[number]')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

function clean(value, limit = MAX_TEXT) {
  return redact(String(value ?? '').slice(0, limit));
}

function words(text) {
  return clean(text).split(/\s+/).filter(Boolean);
}

function sentences(text) {
  return clean(text).split(/[.!?]+\s+/).map((part) => part.trim()).filter(Boolean);
}

function bulletList(items, cap = 6) {
  return items.filter(Boolean).slice(0, cap).map((item) => '- ' + clean(item));
}

function parseNumber(value, fallback, min, max) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(number, min, max) : fallback;
}

function parseSubjects(raw) {
  const parts = clean(raw, 3000).split(/[\n,;]+/).map((part) => part.trim()).filter(Boolean).slice(0, 8);
  if (!parts.length) return [{ name: 'General', weight: 1 }];

  const parsed = parts.map((part) => {
    const match = part.match(/^(.*?)\s+(\d+(?:\.\d+)?)\s*$/);
    if (match) return { name: clean(match[1]) || 'Subject', weight: Number(match[2]) || 1 };
    return { name: part, weight: 1 };
  });

  const total = parsed.reduce((sum, item) => sum + item.weight, 0) || 1;
  return parsed.map((item) => ({ name: item.name, weight: item.weight / total }));
}

function daysUntil(raw) {
  if (!raw) return 21;
  const target = new Date(raw + 'T00:00:00Z');
  if (Number.isNaN(target.getTime())) return 21;
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return clamp(Math.round((target.getTime() - todayUtc) / 86400000), 1, 180);
}

function studyEngine(input) {
  const subjects = parseSubjects(input.subjects);
  const days = daysUntil(input.examDate);
  const hours = parseNumber(input.hours, 2, 0.5, 12);
  const level = input.level || 'Intermediate';
  const totalHours = days * hours;
  const cycles = [1, 3, 7, 14].filter((day) => day <= days);
  if (!cycles.length) cycles.push(1);

  const allocation = subjects.map((subject) => {
    const share = subject.weight * totalHours;
    return subject.name + ': ' + share.toFixed(1) + ' h (' + Math.round(subject.weight * 100) + '%)';
  });

  const revision = cycles.map((day) => {
    const recall = subjects.slice(0, 3).map((subject) => subject.name).join(', ');
    return 'Day ' + day + ': recall ' + recall + ' without notes, then check errors.';
  });

  const quiz = subjects.slice(0, 3).flatMap((subject) => [
    'Explain one core idea from ' + subject.name + ' in two sentences.',
    'List three common mistakes in ' + subject.name + ' and one fix for each.'
  ]);

  const levelBoost = level === 'Advanced' ? 8 : level === 'Beginner' ? 2 : 5;
  const score = clamp(58 + subjects.length * 4 + Math.min(18, hours * 3) + levelBoost, 30, 98);

  return {
    title: 'Study plan ready',
    score,
    scoreLabel: 'Plan strength',
    summary: subjects.length + ' subjects across ' + days + ' days with ' + totalHours.toFixed(1) + ' planned hours.',
    explanation: 'The timetable gives the most hours to the heaviest subjects and repeats recall on days 1, 3, 7, and 14 so revision is spaced instead of crammed.',
    promptFocus: 'spaced repetition and exam preparation',
    metrics: [
      { label: 'Daily load', value: hours + ' h', hint: 'Keep it realistic' },
      { label: 'Days left', value: String(days), hint: 'Until your exam' },
      { label: 'Revision cycles', value: String(cycles.length), hint: 'Spaced recall' }
    ],
    sections: [
      { title: 'Hour allocation', items: allocation },
      { title: 'Revision schedule', items: revision },
      { title: 'Instant quiz', items: quiz }
    ]
  };
}

function roleQuestions(role) {
  const text = (role || '').toLowerCase();
  if (/front|ui|react|web/.test(text)) {
    return [
      'Explain event bubbling and one situation where you would stop propagation.',
      'How would you make a long React list feel fast?',
      'Describe a time you debugged a layout issue across browsers.',
      'What is the difference between accessibility and usability?',
      'How do you decide between local state and a shared store?'
    ];
  }
  if (/data|analyst|sql|machine|ml/.test(text)) {
    return [
      'Walk through a SQL query with a join and an aggregate.',
      'How do you handle missing values in a dataset?',
      'Explain precision and recall with a simple example.',
      'Describe one chart you would use for a trend over time.',
      'How do you avoid leaking test data into training?'
    ];
  }
  if (/back|api|node|python|java|server/.test(text)) {
    return [
      'Design a simple REST endpoint for creating a student record.',
      'How would you handle rate limiting on a public API?',
      'Explain one way to avoid an N+1 query problem.',
      'Describe how you would log errors without exposing personal data.',
      'What makes an API response safe to cache?'
    ];
  }
  return [
    'Tell me about a project you finished and what you personally owned.',
    'Describe a difficult bug and how you found the root cause.',
    'How do you prioritise tasks when everything seems urgent?',
    'Explain a technical idea to a non-technical teammate.',
    'What would you improve in your last college project?'
  ];
}

function placementEngine(input) {
  const role = clean(input.role, 160) || 'General Role';
  const minutes = parseNumber(input.minutes, 10, 5, 60);
  const level = input.level || 'Fresher';
  const answer = clean(input.answer, 8000);
  const bank = roleQuestions(role);
  const questions = bank.slice(0, minutes >= 20 ? 5 : 3);

  let score = null;
  let hasMetric = false;
  let hasTeamwork = false;
  const rubric = [
    'Situation, Task, Action, Result structure: up to 20 points',
    'Specific numbers or outcomes: up to 15 points',
    'Clear personal ownership with "I" statements: up to 10 points',
    'Teamwork or stakeholder awareness: up to 10 points',
    'Concise answer within two minutes: up to 10 points'
  ];

  if (answer) {
    const body = words(answer);
    const star = /situation|task|action|result|first|then|finally/i.test(answer);
    hasMetric = /\d/.test(answer);
    const ownership = /\bI\b/.test(answer);
    hasTeamwork = /team|stakeholder|mentor|peer/i.test(answer);
    const concise = body.length >= 60 && body.length <= 320;

    score = 30;
    if (body.length >= 80) score += 20;
    else if (body.length >= 40) score += 12;
    if (star) score += 15;
    if (hasMetric) score += 12;
    if (ownership) score += 8;
    if (hasTeamwork) score += 8;
    if (concise) score += 7;
    score = clamp(score, 35, 98);
  }

  const feedback = score === null
    ? ['Answer the first question aloud, then run this tool again to get a rubric score.', 'Aim for 120 to 180 words and one concrete result.']
    : [
        score >= 80 ? 'Strong structure. Tighten the opening sentence.' : 'Add a Situation, Task, Action, Result structure.',
        hasMetric ? 'Good use of a concrete number.' : 'Add one measurable outcome, such as time saved or users helped.',
        hasTeamwork ? 'Good teamwork signal.' : 'Mention one teammate, mentor, or stakeholder you coordinated with.'
      ];

  return {
    title: 'Mock interview ready',
    score,
    scoreLabel: 'Answer score',
    summary: role + ' • ' + minutes + ' minute drill • ' + level + ' level.',
    explanation: score === null
      ? 'The mock is question-first. Practise one answer, then paste it here for a transparent rubric score.'
      : 'The score rewards structure, a measurable result, personal ownership, and a concise answer. It is practice feedback, not a hiring decision.',
    promptFocus: 'mock interview practice feedback',
    metrics: [
      { label: 'Role', value: role.slice(0, 24), hint: 'Question bank focus' },
      { label: 'Duration', value: minutes + ' min', hint: 'Timer starts on run' },
      { label: 'Questions', value: String(questions.length), hint: 'Pick one and answer' }
    ],
    sections: [
      { title: 'Practice questions', items: questions },
      { title: 'Scoring rubric', items: rubric },
      { title: 'Feedback', items: feedback }
    ]
  };
}

const RESUME_SECTIONS = ['education', 'experience', 'projects', 'skills', 'achievements', 'summary'];
const ACTION_VERBS = ['built', 'led', 'improved', 'designed', 'shipped', 'reduced', 'created', 'launched', 'automated', 'mentored'];

function roleKeywords(role) {
  const text = (role || '').toLowerCase();
  if (/front|ui|react|web/.test(text)) return ['react', 'accessibility', 'javascript', 'css', 'testing'];
  if (/data|analyst|sql|machine|ml/.test(text)) return ['sql', 'python', 'statistics', 'visualization', 'model'];
  if (/back|api|node|python|java|server/.test(text)) return ['api', 'database', 'testing', 'caching', 'deployment'];
  return ['communication', 'problem solving', 'teamwork', 'projects', 'results'];
}

function resumeEngine(input) {
  const role = clean(input.targetRole, 160) || 'Software Engineer';
  const resume = clean(input.resume, 12000);
  const body = words(resume);
  const lower = resume.toLowerCase();

  if (body.length < 20) throw new Error('Paste at least a short resume summary to review.');

  const foundSections = RESUME_SECTIONS.filter((section) => lower.includes(section));
  const foundVerbs = ACTION_VERBS.filter((verb) => lower.includes(verb));
  const hasMetrics = /\b\d+(\.\d+)?\s?%|\b\d+\s?(users|clients|students|hours|days|projects)\b/i.test(resume);

  let score = 18;
  if (body.length >= 250 && body.length <= 900) score += 24;
  else if (body.length >= 120) score += 14;
  score += Math.min(28, foundSections.length * 7);
  score += Math.min(18, foundVerbs.length * 3);
  if (hasMetrics) score += 12;
  score = clamp(score, 30, 98);

  const missing = roleKeywords(role).filter((keyword) => !lower.includes(keyword)).slice(0, 5);

  return {
    title: 'Resume structure review',
    score,
    scoreLabel: 'ATS-style score',
    summary: role + ' • ' + body.length + ' words • ' + foundSections.length + ' clear sections found.',
    explanation: 'This is a transparent structure check, not a real Applicant Tracking System. It looks for readable sections, action verbs, and measurable outcomes.',
    promptFocus: 'resume clarity and keyword gaps',
    metrics: [
      { label: 'Sections', value: String(foundSections.length), hint: 'Of six useful headings' },
      { label: 'Action verbs', value: String(foundVerbs.length), hint: 'Ownership signals' },
      { label: 'Metrics', value: hasMetrics ? 'Yes' : 'No', hint: 'Measured impact' }
    ],
    sections: [
      { title: 'What is working', items: [
        foundSections.length ? 'Clear headings found: ' + foundSections.join(', ') + '.' : 'Add simple headings such as Education, Projects, and Skills.',
        foundVerbs.length ? 'Action verbs found: ' + foundVerbs.slice(0, 5).join(', ') + '.' : 'Start bullets with verbs like built, led, or improved.',
        hasMetrics ? 'At least one measurable result found.' : 'Add one number, such as a percentage or number of users.'
      ] },
      { title: 'Keyword gaps for this role', items: missing.length ? missing.map((keyword) => 'Add genuine experience with: ' + keyword + '.') : ['Strong keyword coverage for this demo role.'] },
      { title: 'Quick fixes', items: [
        'Keep the resume to one page for a fresher profile.',
        'Use reverse-chronological order for experience and projects.',
        'Remove personal contact details before sharing a public copy.'
      ] }
    ]
  };
}

function codeEngine(input) {
  const language = clean(input.language, 40) || 'JavaScript';
  const code = clean(input.code, 12000);
  if (code.length < 12) throw new Error('Paste a small code sample to review.');

  const lines = code.split('\n');
  const functionCount = (code.match(/\b(function|def|class|=>)\b/g) || []).length;
  const loopCount = (code.match(/\b(for|while|forEach|map)\b/g) || []).length;
  const debugCount = (code.match(/console\.|print\(|debugger/g) || []).length;
  const todoCount = (code.match(/TODO|FIXME|HACK/g) || []).length;
  const longLines = lines.filter((line) => line.length > 120).length;
  const secretPattern = /(api[_-]?key|password|secret|token)\s*[:=]\s*['"][^'"]+['"]/i.test(code);

  const findings = [];
  if (functionCount === 0) findings.push('No clear function or class boundary found. Split the logic into named units.');
  if (loopCount > 3) findings.push('Several loops detected. Check whether a built-in map or filter would read better.');
  if (debugCount > 0) findings.push('Debug statements found. Remove them before sharing or shipping.');
  if (todoCount > 0) findings.push('TODO markers found. Convert them into small tracked tasks.');
  if (longLines > 0) findings.push(longLines + ' long line(s) found. Wrap them for readability.');
  if (secretPattern) findings.push('A hardcoded credential pattern was detected. Replace it with a local environment value.');
  if (!findings.length) findings.push('No obvious structure or hygiene issue in this small sample.');

  let score = 88 - debugCount * 6 - todoCount * 4 - longLines * 3 - Math.max(0, loopCount - 3) * 3;
  if (functionCount > 0) score += 5;
  if (secretPattern) score -= 18;
  score = clamp(score, 25, 98);

  return {
    title: 'Code review notes',
    score,
    scoreLabel: 'Readability score',
    summary: language + ' • ' + lines.length + ' lines • ' + functionCount + ' function-like block(s).',
    explanation: 'The review checks structure and hygiene only. It never prints your code back and never claims to find every bug.',
    promptFocus: 'code readability and safe refactoring',
    metrics: [
      { label: 'Lines', value: String(lines.length), hint: 'Sample size' },
      { label: 'Blocks', value: String(functionCount), hint: 'Named units' },
      { label: 'Debug lines', value: String(debugCount), hint: 'Cleanup target' }
    ],
    sections: [
      { title: 'Findings', items: findings },
      { title: 'Suggestions', items: [
        'Give each function one clear job and a descriptive name.',
        'Handle invalid input early so the happy path stays simple.',
        'Add one small test for the trickiest branch.'
      ] },
      { title: 'Practice drill', items: [
        'Rewrite one long function into two smaller ones.',
        'Replace one magic value with a named constant.',
        'Explain your change in three sentences.'
      ] }
    ]
  };
}

function researchEngine(input) {
  const abstract = clean(input.abstract, 12000);
  const parts = sentences(abstract);
  if (parts.length < 2) throw new Error('Paste a slightly longer abstract to summarise.');

  const lower = abstract.toLowerCase();
  const hasProblem = /problem|gap|challenge|need|question/.test(lower);
  const hasMethod = /method|approach|dataset|experiment|model|we use|we propose/.test(lower);
  const hasResult = /result|accuracy|improve|outperform|significant|found/.test(lower);
  const hasLimit = /limit|however|future|only|cannot|not generalize/.test(lower);

  const checks = [
    { ok: hasProblem, label: 'Problem statement' },
    { ok: hasMethod, label: 'Method or dataset' },
    { ok: hasResult, label: 'Clear result' },
    { ok: hasLimit, label: 'Limitation or future work' }
  ];

  const missing = checks.filter((check) => !check.ok).map((check) => 'Add or look for a clear ' + check.label.toLowerCase() + '.');
  const present = checks.filter((check) => check.ok).length;
  const score = clamp(38 + present * 12 + Math.min(12, parts.length * 2), 30, 96);

  const summary = parts.slice(0, 2).join('. ').slice(0, 360);

  return {
    title: 'Abstract critique',
    score,
    scoreLabel: 'Reporting clarity',
    summary: parts.length + ' sentence(s) reviewed with ' + present + ' of 4 key elements present.',
    explanation: 'The critique checks whether the abstract states a problem, method, result, and limitation. It does not judge whether the research is correct.',
    promptFocus: 'research abstract clarity',
    metrics: [
      { label: 'Elements', value: present + '/4', hint: 'Core reporting checks' },
      { label: 'Sentences', value: String(parts.length), hint: 'Abstract length' },
      { label: 'Summary', value: summary.length + ' chars', hint: 'Condensed view' }
    ],
    sections: [
      { title: 'Short summary', items: [summary] },
      { title: 'Gaps to check', items: missing.length ? missing : ['All four reporting elements appear to be present.'] },
      { title: 'Questions to ask', items: [
        'Which assumption would most change the result?',
        'What baseline comparison is missing?',
        'How would you reproduce this with a smaller dataset?'
      ] }
    ]
  };
}

const DEMO_NOTES = [
  'Library opens at 8 AM and closes at 10 PM on weekdays.',
  'Attendance below 75 percent may block the final exam form.',
  'Placement cell conducts mock interviews every Friday at 4 PM.',
  'Exam hall tickets are released seven days before the semester exam.'
];

const DEMO_FAQ = [
  { q: 'library timing', a: 'The library is open 8 AM to 10 PM on weekdays.' },
  { q: 'attendance rule', a: 'Keep attendance at or above 75 percent to appear for the final exam.' },
  { q: 'placement cell', a: 'Mock interviews are held every Friday at 4 PM.' },
  { q: 'hall ticket', a: 'Hall tickets are released seven days before the exam.' }
];

function overlapScore(query, text) {
  const tokens = words(query).map((word) => word.toLowerCase()).filter((word) => word.length > 2);
  const lower = text.toLowerCase();
  if (!tokens.length) return 0;
  return tokens.reduce((score, token) => score + (lower.includes(token) ? 1 : 0), 0) / tokens.length;
}

function campusEngine(input) {
  const query = clean(input.query, 240) || 'library timing';
  const notes = clean(input.notes, 12000);
  const noteLines = notes ? notes.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, 60) : DEMO_NOTES;

  const noteHits = noteLines
    .map((note) => ({ text: note, score: overlapScore(query, note) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const faqHits = DEMO_FAQ
    .map((item) => ({ text: item.q + ': ' + item.a, score: overlapScore(query, item.q + ' ' + item.a) }))
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const best = Math.max(0, ...noteHits.map((hit) => hit.score), ...faqHits.map((hit) => hit.score));
  const score = clamp(Math.round(best * 100), 20, 98);

  return {
    title: 'Campus answers',
    score,
    scoreLabel: 'Match confidence',
    summary: noteHits.length + ' note match(es) and ' + faqHits.length + ' FAQ match(es) for "' + query.slice(0, 48) + '".',
    explanation: 'CampusIQ matches words locally against your notes and a small built-in FAQ. It does not send your notes anywhere.',
    promptFocus: 'campus information lookup',
    metrics: [
      { label: 'Notes scanned', value: String(noteLines.length), hint: 'Local only' },
      { label: 'Note hits', value: String(noteHits.length), hint: 'Best matches' },
      { label: 'FAQ hits', value: String(faqHits.length), hint: 'Built-in answers' }
    ],
    sections: [
      { title: 'From your notes', items: noteHits.length ? noteHits.map((hit) => hit.text) : ['No note matched. Try a shorter keyword.'] },
      { title: 'Campus FAQ', items: faqHits.length ? faqHits.map((hit) => hit.text) : ['No built-in FAQ match for this query.'] },
      { title: 'Tip', items: ['Keep each note on one line to make search results easier to read.'] }
    ]
  };
}

function sparkEngine(input) {
  const idea = clean(input.idea, 6000);
  const target = clean(input.target, 160) || 'Students';
  if (idea.length < 30) throw new Error('Describe the idea in a little more detail first.');

  const lower = idea.toLowerCase();
  const checks = [
    { label: 'Problem clarity', ok: /problem|because|need|struggle|difficult|for /.test(lower) },
    { label: 'Specific first user', ok: target.length > 3 },
    { label: 'Different angle', ok: /unlike|different|only|first|local|offline|simple|open/.test(lower) },
    { label: 'Buildable scope', ok: /weekend|simple|no key|local|one|small|prototype/.test(lower) },
    { label: 'Test plan', ok: /survey|test|pilot|interview|ask|feedback/.test(lower) }
  ];

  const score = clamp(checks.filter((check) => check.ok).length * 20, 20, 100);
  const missing = checks.filter((check) => !check.ok).map((check) => 'Add a clear ' + check.label.toLowerCase() + '.');

  return {
    title: 'Idea validation snapshot',
    score,
    scoreLabel: 'Validation score',
    summary: 'Five student-friendly checks applied to an idea for ' + target.slice(0, 48) + '.',
    explanation: 'This is a idea-screening demo, not investment advice. A high score means the idea is described clearly and can be tested cheaply.',
    promptFocus: 'lean startup idea validation',
    metrics: [
      { label: 'Checks passed', value: checks.filter((check) => check.ok).length + '/5', hint: 'Simple signals' },
      { label: 'Audience', value: target.slice(0, 22), hint: 'First user group' },
      { label: 'Cost', value: '₹0', hint: 'Demo build' }
    ],
    sections: [
      { title: 'Scorecard', items: checks.map((check) => (check.ok ? 'Passed: ' : 'Missing: ') + check.label) },
      { title: 'Strengthen the idea', items: missing.length ? missing : ['The pitch is clear. Move straight to a small test.'] },
      { title: 'Next seven days', items: [
        'Interview five students who have the exact problem.',
        'Build the smallest possible demo with no paid service.',
        'Ask for one concrete commitment, such as a sign-up or a review.'
      ] }
    ]
  };
}

const COMMUTE_FACTORS = { walk: 0, cycle: 0, bus: 1.2, bike: 1.8, car: 4.6 };

function greenEngine(input) {
  const students = parseNumber(input.students, 1000, 1, 100000);
  const commute = clean(input.commute, 40).toLowerCase();
  const factor = COMMUTE_FACTORS[commute] ?? 1.2;
  const energy = parseNumber(input.energy, 120, 0, 100000);
  const waste = parseNumber(input.waste, 25, 0, 100000);

  const commuteKg = students * factor;
  const energyKg = energy * 0.7;
  const wasteKg = waste * 2.5;
  const dailyKg = commuteKg + energyKg + wasteKg;
  const annualKg = dailyKg * 220;
  const trees = Math.max(1, Math.ceil(annualKg / 21));
  const perStudent = annualKg / students;
  const score = clamp(100 - Math.min(70, perStudent * 1.6), 30, 98);

  const biggest = commuteKg >= energyKg && commuteKg >= wasteKg ? 'commute' : energyKg >= wasteKg ? 'energy' : 'waste';
  const tips = {
    commute: ['Promote a campus bus or cycle pool.', 'Add a carpool board for students who live nearby.'],
    energy: ['Switch common-area lights to efficient fixtures.', 'Set a shared AC temperature policy.'],
    waste: ['Place clearly labelled recycling bins.', 'Run a weekly book and supply exchange stall.']
  };

  return {
    title: 'Campus footprint estimate',
    score,
    scoreLabel: 'Green score',
    summary: 'About ' + Math.round(annualKg).toLocaleString('en-IN') + ' kg CO2e per year across ' + students + ' students.',
    explanation: 'The estimate uses simple public factors for commuting, energy, and waste. It is for awareness and comparison, not formal carbon accounting.',
    promptFocus: 'low-cost campus sustainability',
    metrics: [
      { label: 'Daily', value: Math.round(dailyKg) + ' kg', hint: 'Estimated CO2e' },
      { label: 'Annual', value: Math.round(annualKg / 1000) + ' t', hint: '220 campus days' },
      { label: 'Tree years', value: String(trees), hint: 'Rough equivalent' }
    ],
    sections: [
      { title: 'Sources', items: [
        'Commute: ' + Math.round(commuteKg) + ' kg/day',
        'Energy: ' + Math.round(energyKg) + ' kg/day',
        'Waste: ' + Math.round(wasteKg) + ' kg/day'
      ] },
      { title: 'Biggest lever', items: ['Your largest source is ' + biggest + '. Start there for the fastest visible change.'] },
      { title: 'Student actions', items: tips[biggest] }
    ]
  };
}

const ENGINES = {
  study: studyEngine,
  placement: placementEngine,
  resume: resumeEngine,
  code: codeEngine,
  research: researchEngine,
  campus: campusEngine,
  spark: sparkEngine,
  green: greenEngine
};

export function analyze(toolId, rawInput = {}) {
  const tool = TOOLS.find((item) => item.id === toolId);
  if (!tool) throw new Error('Unknown tool: ' + String(toolId));
  if (!rawInput || typeof rawInput !== 'object') throw new Error('Invalid input.');

  const input = {};
  for (const field of tool.fields) {
    input[field.name] = clean(rawInput[field.name], field.limit || MAX_TEXT);
  }

  const result = ENGINES[toolId](input);

  return {
    tool: tool.id,
    toolName: tool.name,
    title: clean(result.title),
    score: typeof result.score === 'number' ? Math.round(result.score) : null,
    scoreLabel: clean(result.scoreLabel || 'Score'),
    summary: clean(result.summary),
    explanation: clean(result.explanation),
    promptFocus: clean(result.promptFocus || tool.name),
    metrics: result.metrics.map((metric) => ({
      label: clean(metric.label),
      value: clean(metric.value),
      hint: clean(metric.hint || '')
    })),
    sections: result.sections.map((section) => ({
      title: clean(section.title),
      items: section.items.map((item) => clean(item)).filter(Boolean)
    }))
  };
}

export function safePromptFocus(result) {
  return bulletList(result.sections.flatMap((section) => section.items), 6);
}
