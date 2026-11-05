import { CATEGORIES, QUESTIONS } from "./questions.js";

export const TEST_MINUTES = 30;
export const HISTORY_LIMIT = 100;
export const STORAGE_KEY = "gifted-practice-il.history.v1";

export function shuffle(items, random = Math.random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function selectQuestions(mode, category, mistakeIds = []) {
  if (mode === "test") {
    return shuffle(Object.keys(CATEGORIES).flatMap((key) =>
      shuffle(QUESTIONS.filter((question) => question.category === key)).slice(0, 8)));
  }
  const pool = QUESTIONS.filter((question) =>
    mode === "mistakes" ? mistakeIds.includes(question.id) : !category || question.category === category);
  return shuffle(pool).slice(0, 10);
}

export function scoreSession(questions, answers) {
  const categories = Object.fromEntries(Object.keys(CATEGORIES).map((key) =>
    [key, { correct: 0, total: 0 }]));
  let correct = 0;
  const responses = questions.map((question, index) => {
    const answer = answers[index] ?? null;
    const isCorrect = answer === question.correct;
    categories[question.category].total++;
    if (isCorrect) {
      correct++;
      categories[question.category].correct++;
    }
    return { questionId: question.id, answer };
  });
  return { correct, total: questions.length, categories, responses };
}

export function remainingSeconds(deadline, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}

export function formatTime(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;
}

export function getMistakeIds(history) {
  const latest = new Map();
  for (const entry of history) {
    for (const response of entry.responses) {
      const question = QUESTIONS.find((item) => item.id === response.questionId);
      if (question) latest.set(question.id, response.answer !== question.correct);
    }
  }
  return [...latest].filter(([, incorrect]) => incorrect).map(([id]) => id);
}

export function parseHistory(raw) {
  if (raw === null) return [];
  const history = JSON.parse(raw);
  const questionIds = new Set(QUESTIONS.map((question) => question.id));
  if (!Array.isArray(history) || history.length > HISTORY_LIMIT || !history.every((entry) =>
    entry && ["practice", "test", "mistakes"].includes(entry.mode) &&
    typeof entry.date === "string" && Number.isFinite(Date.parse(entry.date)) &&
    Number.isInteger(entry.total) && entry.total > 0 && entry.total <= QUESTIONS.length &&
    Number.isInteger(entry.correct) && entry.correct >= 0 && entry.correct <= entry.total &&
    Number.isFinite(entry.duration) && entry.duration >= 0 &&
    Array.isArray(entry.responses) && entry.responses.length === entry.total &&
    new Set(entry.responses.map((response) => response?.questionId)).size === entry.total &&
    entry.responses.every((response) => response && questionIds.has(response.questionId) &&
      (response.answer === null || (Number.isInteger(response.answer) && response.answer >= 0 && response.answer < 4))) &&
    scoreSession(entry.responses.map((response) => QUESTIONS.find((question) => question.id === response.questionId)),
      entry.responses.map((response) => response.answer)).correct === entry.correct
  )) throw new Error("Invalid practice history");
  return history;
}
