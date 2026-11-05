import test from "node:test";
import assert from "node:assert/strict";
import { QUESTIONS, CATEGORIES } from "../questions.js";
import {
  selectQuestions, shuffle, scoreSession, parseHistory, getMistakeIds,
  remainingSeconds, formatTime, HISTORY_LIMIT,
} from "../engine.js";

test("bank contains 60 unique, complete original questions, 20 per category", () => {
  assert.equal(QUESTIONS.length, 60);
  assert.equal(new Set(QUESTIONS.map((question) => question.id)).size, 60);
  for (const category of Object.keys(CATEGORIES)) {
    assert.equal(QUESTIONS.filter((question) => question.category === category).length, 20);
  }
  for (const question of QUESTIONS) {
    assert.ok(question.prompt.length > 10, question.id);
    assert.ok(question.explanation.length > 25, question.id);
    assert.equal(question.options.length, 4, question.id);
    assert.equal(new Set(question.options.map((option) => JSON.stringify(option))).size, 4, question.id);
    assert.ok(Number.isInteger(question.correct) && question.correct >= 0 && question.correct < 4, question.id);
    if (question.category === "visual") {
      assert.ok(question.panels.length > 2);
      const length = { matrix2: 4, matrix3: 9, matrix23: 6 }[question.layout];
      if (length) {
        assert.equal(question.panels.length, length, question.id);
        assert.equal(question.panels.filter((panel) => panel === null).length, 1, question.id);
      } else {
        assert.equal(question.layout, "sequence");
        assert.ok(!question.panels.includes(null));
      }
      for (const diagram of [...question.panels, ...question.options].filter(Boolean)) {
        assert.ok(["shapes", "arrow", "grid"].includes(diagram.kind), question.id);
        if (diagram.kind === "arrow") assert.ok(diagram.angle >= 0 && diagram.angle < 360 && diagram.angle % 45 === 0);
        if (diagram.kind === "shapes") {
          assert.ok(diagram.count >= 1 && diagram.count <= 5);
          assert.ok(["circle", "square", "triangle", "diamond"].includes(diagram.shape));
          assert.equal(typeof diagram.filled, "boolean");
        }
        if (diagram.kind === "grid") {
          assert.ok(diagram.cells.every((cell) => Number.isInteger(cell) && cell >= 0 && cell < 9));
          assert.equal(diagram.cells.length, new Set(diagram.cells).size);
        }
      }
    }
  }
});

test("quantitative answer keys match independently computed solutions", () => {
  const expected = [
    String(31 * 2 + 1), String(64 / 8 * 3), `${72 / 0.8} שקלים`, String(18 * 4 - 12 - 17 - 23),
    `${12 * 9} סמ״ר`, String(2 * 12 / 3), "⅖", String((3 * 6 - 6) / (4 - 3)),
    String(30 + 12), String(Math.floor(100 / 15)), String(30 * 2 / 3 / 4), "11:00",
    String(4 * 3), `${6 * 2.5} ק״מ`, String((16 + 4) * 3 / 2),
    String(2 * (2 * 3 + 4) + 2), String([12, 22, 17, 27].find((n) => n % 5 === 2 && n % 3 === 1)),
    "נמוך ב־1%", String(60 / ((1 - 1 / 4) * (1 - 1 / 3))), "שני",
  ];
  QUESTIONS.filter((question) => question.category === "quantitative").forEach((question, index) => {
    assert.equal(question.options[question.correct], expected[index], question.id);
  });
});

test("visual answer keys match stated transformations", () => {
  const expected = [
    { kind: "shapes", count: 4, shape: "circle", filled: true },
    { kind: "arrow", angle: 270 },
    { kind: "shapes", count: 3, shape: "square", filled: false },
    { kind: "shapes", count: 3, shape: "square", filled: true },
    { kind: "grid", cells: [8] },
    { kind: "shapes", count: 3, shape: "triangle", filled: true },
    { kind: "arrow", angle: 180 },
    { kind: "shapes", count: 5, shape: "circle", filled: true },
    { kind: "grid", cells: [2, 6] },
    { kind: "shapes", count: 2, shape: "triangle", filled: true },
    { kind: "arrow", angle: 270 },
    { kind: "shapes", count: 3, shape: "diamond", filled: true },
    { kind: "grid", cells: [8, 0] },
    { kind: "shapes", count: 2, shape: "square", filled: true },
    { kind: "arrow", angle: 0 },
    { kind: "grid", cells: [3, 4, 5] },
    { kind: "shapes", count: 5, shape: "triangle", filled: false },
    { kind: "grid", cells: [0, 1, 2, 3, 4] },
    { kind: "arrow", angle: 0 },
    { kind: "shapes", count: 3, shape: "triangle", filled: true },
  ];
  QUESTIONS.filter((question) => question.category === "visual").forEach((question, index) => {
    assert.deepEqual(question.options[question.correct], expected[index], question.id);
  });
});

test("timed tests are balanced and contain no repeated questions", () => {
  for (let attempt = 0; attempt < 30; attempt++) {
    const questions = selectQuestions("test");
    assert.equal(questions.length, 24);
    assert.equal(new Set(questions.map((question) => question.id)).size, 24);
    for (const category of Object.keys(CATEGORIES)) {
      assert.equal(questions.filter((question) => question.category === category).length, 8);
    }
  }
});

test("practice is filtered correctly and mistake sessions can be smaller", () => {
  assert.equal(selectQuestions("practice").length, 10);
  for (const category of Object.keys(CATEGORIES)) {
    assert.ok(selectQuestions("practice", category).every((question) => question.category === category));
  }
  assert.deepEqual(selectQuestions("mistakes", null, ["v1"]).map((question) => question.id), ["v1"]);
  assert.deepEqual(selectQuestions("mistakes", null, []), []);
});

test("shuffle copies its input without losing items", () => {
  const original = [1, 2, 3, 4];
  const shuffled = shuffle(original, () => 0);
  assert.deepEqual(original, [1, 2, 3, 4]);
  assert.notDeepEqual(shuffled, original);
  assert.deepEqual([...shuffled].sort(), original);
});

function entry(questions, answers) {
  return { ...scoreSession(questions, answers), date: "2026-11-05T12:00:00Z", duration: 12, mode: "practice" };
}

test("scoring counts skipped answers and computes category totals", () => {
  const questions = [QUESTIONS[0], QUESTIONS[20], QUESTIONS[40]];
  const result = scoreSession(questions, [questions[0].correct, null, (questions[2].correct + 1) % 4]);
  assert.equal(result.correct, 1);
  assert.equal(result.total, 3);
  assert.equal(result.categories.verbal.correct, 1);
  assert.equal(result.categories.quantitative.total, 1);
  assert.equal(result.responses[1].answer, null);
});

test("history restores valid results and rejects corrupt or inconsistent entries", () => {
  const valid = entry([QUESTIONS[0]], [QUESTIONS[0].correct]);
  assert.deepEqual(parseHistory(JSON.stringify([valid])), [valid]);
  assert.deepEqual(parseHistory(null), []);
  for (const raw of ["{", "{}", "null", JSON.stringify([{ ...valid, correct: 0 }]),
    JSON.stringify([{ ...valid, responses: [{ questionId: "unknown", answer: 0 }] }]),
    JSON.stringify([{ ...valid, responses: [null] }]),
    JSON.stringify([{ ...valid, responses: [{ questionId: "v1", answer: 4 }] }]),
    JSON.stringify([{ ...valid, date: "invalid" }]),
    JSON.stringify([{ ...valid, duration: -1 }]),
    JSON.stringify(Array(HISTORY_LIMIT + 1).fill(valid)),
  ]) assert.throws(() => parseHistory(raw));
});

test("mistake practice uses the latest result and includes skipped questions", () => {
  const question = QUESTIONS[0];
  const wrong = entry([question], [(question.correct + 1) % 4]);
  const correct = entry([question], [question.correct]);
  assert.deepEqual(getMistakeIds([wrong]), [question.id]);
  assert.deepEqual(getMistakeIds([wrong, correct]), []);
  assert.deepEqual(getMistakeIds([correct, wrong]), [question.id]);
  assert.deepEqual(getMistakeIds([entry([question], [null])]), [question.id]);
});

test("timer uses elapsed wall time and never becomes negative", () => {
  assert.equal(remainingSeconds(1800000, 0), 1800);
  assert.equal(remainingSeconds(1800000, 1799500), 1);
  assert.equal(remainingSeconds(1800000, 1800000), 0);
  assert.equal(remainingSeconds(1800000, 1900000), 0);
  assert.equal(formatTime(1800), "30:00");
  assert.equal(formatTime(65), "01:05");
  assert.equal(formatTime(0), "00:00");
});
