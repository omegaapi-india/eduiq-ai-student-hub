import test from 'node:test';
import assert from 'node:assert/strict';

import { TOOLS, analyze } from '../lib/engines.js';
import { buildPrompt } from '../lib/prompt.js';

const SAMPLE = {
  study: {
    subjects: 'Math 40, Physics 30, Chemistry 30',
    examDate: '',
    hours: '2',
    level: 'Beginner'
  },
  placement: {
    role: 'Frontend Developer',
    minutes: '10',
    level: 'Fresher',
    answer: ''
  },
  resume: {
    targetRole: 'Software Engineer',
    resume: 'Education BTech Computer Science. Experience built a dashboard. Projects created a local notes tool. Skills JavaScript SQL testing. Improved load time by 40 percent and reduced manual work for 120 students.'
  },
  code: {
    language: 'JavaScript',
    code: 'function add(a, b) {\n  return a + b;\n}\nconsole.log(add(2, 3));'
  },
  research: {
    abstract: 'Many students struggle to revise effectively. We propose a spacedRecall method using local notes. The results improve accuracy by 12 percent. However, the study only covers one semester.'
  },
  campus: {
    query: 'library timing',
    notes: ''
  },
  spark: {
    idea: 'The problem is that final-year students struggle to practise interviews. This simple local prototype offers an offline first mock test. I will test it with a survey and five interviews.',
    target: 'Final-year students'
  },
  green: {
    students: '1000',
    commute: 'Bus',
    energy: '120',
    waste: '25'
  }
};

test('all eight tools are declared with unique ids', () => {
  const ids = TOOLS.map((tool) => tool.id);
  assert.equal(ids.length, 8);
  assert.equal(new Set(ids).size, 8);
  assert.deepEqual(ids, ['study', 'placement', 'resume', 'code', 'research', 'campus', 'spark', 'green']);
});

test('every tool returns a complete, local result', () => {
  for (const tool of TOOLS) {
    const result = analyze(tool.id, SAMPLE[tool.id]);
    assert.equal(result.tool, tool.id);
    assert.equal(result.toolName, tool.name);
    assert.ok(result.title);
    assert.ok(result.summary);
    assert.ok(result.explanation);
    assert.ok(result.score === null || (result.score >= 0 && result.score <= 100));
    assert.ok(result.metrics.length >= 3);
    assert.ok(result.sections.length >= 2);
    for (const section of result.sections) assert.ok(section.items.length > 0);
  }
});

test('unknown tools and empty objects are rejected', () => {
  assert.throws(() => analyze('unknown', {}), /Unknown tool/);
  assert.throws(() => analyze('research', { abstract: 'short' }), /slightly longer/);
  assert.throws(() => analyze('code', { code: 'x' }), /small code sample/);
});

test('study allocation percentages add up to about 100', () => {
  const result = analyze('study', SAMPLE.study);
  const allocation = result.sections.find((section) => section.title === 'Hour allocation').items;
  const total = allocation.reduce((sum, item) => sum + Number(item.match(/(\d+)%/)[1]), 0);
  assert.ok(Math.abs(total - 100) <= 2);
});

test('study result includes spaced revision days', () => {
  const result = analyze('study', SAMPLE.study);
  const revision = result.sections.find((section) => section.title === 'Revision schedule').items;
  assert.ok(revision.some((item) => item.includes('Day 1')));
});

test('placement questions follow the target role', () => {
  const result = analyze('placement', SAMPLE.placement);
  const questions = result.sections.find((section) => section.title === 'Practice questions').items.join(' ');
  assert.match(questions, /React|event bubbling|state/i);
});

test('a structured interview answer scores higher than no answer', () => {
  const answer = [
    'Situation: our college club had a slow registration form.',
    'Task: I owned the frontend fix in one weekend.',
    'Action: I profiled the page, removed two unused scripts, and added local validation.',
    'Result: the form became 30 percent faster and 120 students completed it.',
    'I worked with a peer mentor to review the change before launch.'
  ].join(' ');

  const emptyScore = analyze('placement', SAMPLE.placement).score;
  const answeredScore = analyze('placement', { ...SAMPLE.placement, answer }).score;

  assert.equal(emptyScore, null);
  assert.ok(answeredScore >= 80);
});

test('resume score improves when sections and metrics are present', () => {
  const weak = analyze('resume', {
    targetRole: 'Software Engineer',
    resume: 'I did some work on a website and helped my team with college assignments and small tasks for a local shop.'
  });
  const strong = analyze('resume', SAMPLE.resume);

  assert.ok(strong.score > weak.score);
  assert.ok(strong.sections.some((section) => section.title === 'Keyword gaps for this role'));
});

test('resume result redacts email and long digit patterns', () => {
  const result = analyze('resume', {
    targetRole: 'Software Engineer',
    resume: 'Education BTech Computer Science with projects and skills. Experience building a small student dashboard. Contact student@example.com or 999888777666. Built a dashboard and improved it by 20 percent for more than 50 users.'
  });
  const text = JSON.stringify(result);

  assert.doesNotMatch(text, /student@example\.com/);
  assert.doesNotMatch(text, /999888777666/);
  assert.match(text, /Remove personal contact details/);
});

test('code finding detects a credential pattern without echoing it', () => {
  const result = analyze('code', {
    language: 'JavaScript',
    code: "function load() {\n  const apiKey = 'supersecretvalue';\n  return apiKey;\n}"
  });
  const text = JSON.stringify(result);

  assert.doesNotMatch(text, /supersecretvalue/);
  assert.ok(result.sections[0].items.some((item) => /credential pattern/i.test(item)));
});

test('research result reports a missing limitation', () => {
  const result = analyze('research', {
    abstract: 'Students need better revision tools. We propose a local method. The result improves recall by 12 percent.'
  });
  const gaps = result.sections.find((section) => section.title === 'Gaps to check').items.join(' ');

  assert.match(gaps, /limitation/i);
});

test('campus search finds a matching local note', () => {
  const result = analyze('campus', {
    query: 'library timing',
    notes: 'Library opens at 8 AM.\nExam form date is Friday.'
  });
  const notes = result.sections.find((section) => section.title === 'From your notes').items.join(' ');

  assert.match(notes, /Library opens at 8 AM/);
});

test('spark score stays in range and includes a seven-day plan', () => {
  const result = analyze('spark', SAMPLE.spark);
  const plan = result.sections.find((section) => section.title === 'Next seven days');

  assert.ok(result.score >= 0 && result.score <= 100);
  assert.equal(plan.items.length, 3);
});

test('green score rewards walking over car commuting', () => {
  const walk = analyze('green', { ...SAMPLE.green, commute: 'Walk' });
  const car = analyze('green', { ...SAMPLE.green, commute: 'Car' });

  assert.ok(walk.score > car.score);
});

test('buildPrompt uses redacted computed highlights only', () => {
  const tool = TOOLS.find((item) => item.id === 'resume');
  const input = {
    targetRole: 'Software Engineer',
    resume: 'Education BTech Computer Science with projects and skills. Experience building a small student dashboard. Contact student@example.com or 999888777666. Built a dashboard and reduced load time by 20 percent for more than 50 users.'
  };
  const result = analyze('resume', input);
  const prompt = buildPrompt(tool, input, result);

  assert.ok(prompt.includes(result.toolName));
  assert.ok(prompt.includes(result.summary));
  assert.doesNotMatch(prompt, /student@example\.com/);
  assert.doesNotMatch(prompt, /999888777666/);
  assert.ok(prompt.length <= 3500);
});
