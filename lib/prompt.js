// Builds a small, redacted prompt from computed results only.
// Raw resumes, code, and notes are never included here.

import { safePromptFocus } from './engines.js';

export function buildPrompt(tool, input, result) {
  const highlights = safePromptFocus(result);
  const scoreText = result.score === null
    ? 'not scored'
    : result.score + '/100 (' + result.scoreLabel + ')';

  const lines = [
    'You are EduIQ, a careful tutor helping a student understand a deterministic demo result.',
    'Do not invent personal details, prices, guarantees, or credentials.',
    'Answer in exactly five short bullet points in plain English.',
    '',
    'Tool: ' + result.toolName,
    'Focus: ' + result.promptFocus,
    'Score: ' + scoreText,
    'Summary: ' + result.summary,
    '',
    'Computed highlights:'
  ];

  if (highlights.length) {
    lines.push(...highlights);
  } else {
    lines.push('- No extra highlights available.');
  }

  lines.push('', 'Explanation to refine:', result.explanation);

  return lines.join('\n').slice(0, 3500);
}
