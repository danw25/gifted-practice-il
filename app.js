import { CATEGORIES, QUESTIONS } from "./questions.js";
import {
  TEST_MINUTES, HISTORY_LIMIT, STORAGE_KEY, selectQuestions, scoreSession,
  remainingSeconds, formatTime, getMistakeIds, parseHistory,
} from "./engine.js";

const main = document.querySelector("#main");
const modal = document.querySelector("#modal");
const warning = document.querySelector("#storage-warning");
let history = [];
let canSave = true;
let session = null;
let timer = null;

function storageError(message) {
  warning.textContent = message;
  warning.hidden = false;
}

try {
  history = parseHistory(localStorage.getItem(STORAGE_KEY));
} catch (error) {
  canSave = false;
  storageError("לא ניתן לקרוא את ההתקדמות השמורה. אפשר להמשיך לתרגל ללא שמירה. לאיפוס הנתונים, עברו אל ״ההתקדמות שלי״.");
  console.warn("Could not load local practice history.", error);
}

function el(tag, className = "", text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function button(text, className, action) {
  const node = el("button", className, text);
  node.type = "button";
  node.addEventListener("click", action);
  return node;
}

function focusMain() {
  main.focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
}

function setNav(view) {
  for (const name of ["home", "history"]) {
    const node = document.querySelector(`#${name}-nav`);
    node.classList.toggle("active", view === name);
    if (view === name) node.setAttribute("aria-current", "page");
    else node.removeAttribute("aria-current");
  }
}

function showDialog(title, message, actions) {
  const content = document.querySelector("#modal-content");
  content.replaceChildren(el("h2", "", title));
  content.firstChild.id = "modal-title";
  if (typeof message === "string") content.append(el("p", "", message));
  else content.append(message);
  const controls = el("div", "dialog-actions");
  for (const action of actions) {
    controls.append(button(action.label, action.primary ? "primary-button" : "secondary-button", () => {
      modal.close();
      action.run?.();
    }));
  }
  content.append(controls);
  modal.showModal();
}

function navigate(action) {
  if (!session) return action();
  showDialog("לצאת מהתרגול?", "התשובות בתרגול הנוכחי לא יישמרו. תרגולים שכבר סיימתם יישארו בהיסטוריה.", [
    { label: "להמשיך לתרגל", primary: true },
    { label: "לצאת", run: () => { stopSession(); action(); } },
  ]);
}

function renderHome(focus = true) {
  setNav("home");
  main.innerHTML = `
    <section class="hero">
      <div class="hero-copy">
        <p class="eyebrow"><span class="status-dot"></span> מרחב קטן לרעיונות גדולים</p>
        <h1>כל אתגר מתחיל<br>ב<span class="underlined">צעד קטן.</span></h1>
        <p class="hero-description">מגלים דפוסים, מפצחים שאלות ובונים ביטחון.<br>תרגול אישי לקראת מבחני המחוננים, בקצב שלכם.</p>
        <div class="hero-actions" id="hero-actions"></div>
        <p class="hero-note">בלי הרשמה. בלי לחץ. עם מקום לנסות שוב.</p>
      </div>
      <div class="hero-art" aria-hidden="true">
        <div class="art-orbit orbit-one"></div><div class="art-orbit orbit-two"></div>
        <span class="art-spark spark-one">✦</span><span class="art-spark spark-two">✧</span>
        <div class="art-card art-card-back"><span>2 → 6 → 12</span><span class="art-question">?</span></div>
        <div class="art-card art-card-front"><div class="art-shapes"><i></i><i></i><i></i></div><span class="art-line"></span><span class="art-line short"></span><span class="art-check">✓</span></div>
        <span class="art-sticker">יש יותר מדרך אחת לחשוב.</span>
      </div>
    </section>
    <section class="stats-strip" aria-label="התרגול במספרים">
      <div><strong>60</strong><span>שאלות מקוריות</span></div>
      <div><strong>3</strong><span>עולמות של חשיבה</span></div>
      <div><strong id="completed-count">0</strong><span>תרגולים שהשלמתם</span></div>
      <div><span class="stat-symbol" aria-hidden="true">↗</span><span>כל ניסיון הוא התקדמות</span></div>
    </section>
    <section class="topics-section" aria-labelledby="topics-heading">
      <div class="section-heading"><div><p class="eyebrow">במה נתרגל היום?</p><h2 id="topics-heading">בוחרים כיוון. מתחילים לגלות.</h2></div><span class="section-meta">10 שאלות · ללא הגבלת זמן</span></div>
      <div id="topic-cards" class="topic-cards"></div>
    </section>
    <section class="bottom-cards">
      <div class="exam-card">
        <span class="small-label">מוכנים לאתגר משולב?</span>
        <h2>מבחן תרגול, צעד אחד קדימה.</h2>
        <p>24 שאלות משלושת התחומים, 30 דקות, והסברים מלאים בסיום. הזדמנות לתרגל גם את ניהול הזמן.</p>
        <div id="exam-action"></div>
        <small>זהו מבנה תרגול עצמאי, לא העתק של המבחן הרשמי.</small>
      </div>
      <div class="tip-card"><span class="tip-icon" aria-hidden="true">✦</span><p class="eyebrow">מחשבה לדרך</p><h2>לא רק התשובה.<br>גם הדרך חשובה.</h2><p>טעיתם? מצוין, מצאתם הזדמנות ללמוד. קראו את ההסבר ונסו לזהות מה תוכלו לעשות אחרת בפעם הבאה.</p><div id="mistakes-action"></div></div>
    </section>`;
  document.querySelector("#completed-count").textContent = history.length;
  document.querySelector("#hero-actions").append(
    button("מתחילים לתרגל ←", "primary-button", () => startSession("practice")),
    button("ההתקדמות שלי", "text-button", renderHistory),
  );
  const cards = document.querySelector("#topic-cards");
  for (const [key, category] of Object.entries(CATEGORIES)) {
    const card = el("article", `topic-card ${category.color}`);
    const header = el("div", "topic-top");
    header.append(el("span", "topic-icon", category.icon), el("span", "topic-count", "20 שאלות במאגר"));
    card.append(header, el("h3", "", category.name), el("p", "", category.description));
    const action = button("לתרגול בנושא ←", "topic-link", () => startSession("practice", key));
    action.setAttribute("aria-label", `תרגול ${category.name}`);
    card.append(action);
    cards.append(card);
  }
  document.querySelector("#exam-action").append(button("מתחילים מבחן תרגול ←", "light-button", () => startSession("test")));
  const mistakes = getMistakeIds(history);
  document.querySelector("#mistakes-action").append(mistakes.length
    ? button(`חוזרים לשאלות שפספסנו (${mistakes.length}) ←`, "text-button", () => startSession("mistakes"))
    : el("small", "", "אחרי התרגול הראשון, שאלות לחזרה יחכו כאן."));
  if (focus) focusMain();
}

function startSession(mode, category) {
  if (mode === "test") {
    showDialog("רגע לפני שמתחילים", "24 שאלות: 8 מכל תחום, ב־30 דקות. אפשר לעבור בין שאלות ולשנות תשובות. ההסברים יוצגו רק בסיום. בסיום הזמן המבחן יוגש אוטומטית. רענון או סגירת העמוד יבטלו את המבחן הנוכחי. אלו זמני תרגול שבחרנו, לא נתוני המבחן הרשמי.", [
      { label: "מתחילים מבחן", primary: true, run: () => beginSession(mode, category) },
      { label: "לא עכשיו" },
    ]);
  } else beginSession(mode, category);
}

function beginSession(mode, category) {
  const questions = selectQuestions(mode, category, getMistakeIds(history));
  if (!questions.length) {
    showDialog("אין כרגע שאלות לחזרה", "כל השאלות שתרגלתם לאחרונה נענו נכון. אפשר להתחיל תרגול חדש.", [{ label: "מעולה", primary: true }]);
    return;
  }
  const started = Date.now();
  session = {
    mode, category, questions, started, index: 0,
    deadline: mode === "test" ? started + TEST_MINUTES * 60 * 1000 : null,
    answers: Array(questions.length).fill(null), checked: new Set(),
  };
  setNav(null);
  renderQuestion();
  if (mode === "test") timer = window.setInterval(updateTimer, 500);
}

function stopSession() {
  window.clearInterval(timer);
  timer = null;
  session = null;
}

function updateTimer() {
  if (!session?.deadline) return;
  const seconds = remainingSeconds(session.deadline);
  if (!seconds) {
    if (modal.open) modal.close();
    finishSession(true);
    return;
  }
  const clock = document.querySelector("#timer");
  if (clock) {
    clock.textContent = formatTime(seconds);
    clock.classList.toggle("urgent", seconds <= 60);
    clock.setAttribute("aria-label", `זמן שנותר: ${Math.floor(seconds / 60)} דקות ו־${seconds % 60} שניות`);
  }
}

function renderQuestion(focus = true) {
  const { questions, index, mode, answers, checked } = session;
  const question = questions[index];
  const category = CATEGORIES[question.category];
  const revealed = mode !== "test" && checked.has(index);
  const answered = answers.filter((answer) => answer !== null).length;
  main.innerHTML = `
    <div class="quiz-top"><div id="quiz-exit"></div><span id="quiz-mode"></span><span id="quiz-clock"></span></div>
    <div class="quiz-layout">
      <section class="question-card" aria-labelledby="question-title">
        <div class="question-meta"><span id="category-badge" class="badge"></span><span id="question-number"></span></div>
        <progress id="quiz-progress" aria-label="שאלות שנענו"></progress>
        <h1 id="question-title" class="question-title"></h1>
        <div id="question-visual"></div>
        <fieldset class="answer-fieldset"><legend class="sr-only">בחרו תשובה אחת</legend><div id="answers" class="answers"></div></fieldset>
        <div id="explanation" class="explanation" role="status" hidden></div>
        <div id="question-actions" class="question-actions"></div>
      </section>
      <aside class="question-sidebar" aria-label="מפת שאלות"><h2>המסלול שלכם</h2><p id="answered-count"></p><div id="question-map" class="question-map"></div><div class="map-legend"><span class="legend-dot"></span> נענתה <span class="legend-dot empty"></span> עדיין לא</div><div id="finish-action"></div><p class="sidebar-note">במבחן רואים הסברים בסיום.<br>בתרגול אפשר לבדוק כל תשובה מיד.</p></aside>
    </div>`;
  document.querySelector("#quiz-exit").append(button("→ חזרה למרחב", "text-button", () => navigate(renderHome)));
  document.querySelector("#quiz-mode").textContent = mode === "test" ? "מבחן תרגול משולב" : mode === "mistakes" ? "הזדמנות לנסות שוב" : "תרגול בקצב שלכם";
  document.querySelector("#quiz-clock").append(mode === "test" ? el("span", "timer", formatTime(remainingSeconds(session.deadline))) : el("span", "untimed", "ללא הגבלת זמן"));
  if (mode === "test") document.querySelector(".timer").id = "timer";
  const badge = document.querySelector("#category-badge");
  badge.classList.add(category.color);
  badge.textContent = category.name;
  document.querySelector("#question-number").textContent = `שאלה ${index + 1} מתוך ${questions.length}`;
  document.querySelector(".question-card").dataset.questionId = question.id;
  const progress = document.querySelector("#quiz-progress");
  progress.max = questions.length;
  progress.value = answered;
  document.querySelector("#question-title").textContent = question.prompt;
  if (question.panels) document.querySelector("#question-visual").append(renderPanels(question));
  const answerContainer = document.querySelector("#answers");
  const labels = ["א", "ב", "ג", "ד"];
  question.options.forEach((option, optionIndex) => {
    const selected = answers[index] === optionIndex;
    const label = el("label", "answer-option");
    const input = el("input");
    input.type = "radio";
    input.name = "answer";
    input.value = optionIndex;
    input.checked = selected;
    input.disabled = revealed;
    input.setAttribute("aria-label", typeof option === "string" ? `${labels[optionIndex]}. ${option}` : `תשובה ${labels[optionIndex]}: ${diagramDescription(option)}`);
    input.addEventListener("change", () => {
      if (session.deadline && !remainingSeconds(session.deadline)) return finishSession(true);
      session.answers[index] = optionIndex;
      renderQuestion(false);
      document.querySelector(`input[value="${optionIndex}"]`)?.focus({ preventScroll: true });
    });
    label.classList.toggle("selected", selected);
    label.append(input, el("span", "answer-letter", labels[optionIndex]));
    if (typeof option === "string") label.append(el("span", "answer-text", option));
    else label.append(drawDiagram(option));
    if (revealed) {
      if (optionIndex === question.correct) {
        label.classList.add("correct");
        label.append(el("span", "answer-feedback", "✓ נכון"));
      } else if (selected) {
        label.classList.add("incorrect");
        label.append(el("span", "answer-feedback", "× ננסה ללמוד"));
      }
    }
    answerContainer.append(label);
  });
  if (revealed) {
    const explanation = document.querySelector("#explanation");
    explanation.hidden = false;
    explanation.append(el("strong", "", answers[index] === question.correct ? "בדיוק! הנה הדרך." : "עוד צעד בדרך להבנה."), el("p", "", question.explanation));
  }
  const actions = document.querySelector("#question-actions");
  const previous = button("→ הקודמת", "secondary-button", () => moveQuestion(index - 1));
  previous.disabled = index === 0;
  actions.append(previous);
  if (mode !== "test" && !revealed) {
    actions.append(button(index === questions.length - 1 ? "סיום התרגול" : "לדלג בינתיים", "text-button",
      () => index === questions.length - 1 ? requestFinish() : moveQuestion(index + 1)));
    const check = button("בדיקת תשובה", "primary-button", () => {
      session.checked.add(index);
      renderQuestion(false);
      const explanation = document.querySelector("#explanation");
      explanation.tabIndex = -1;
      explanation.focus({ preventScroll: true });
      explanation.scrollIntoView({ block: "nearest", behavior: "smooth" });
    });
    check.disabled = answers[index] === null;
    actions.append(check);
  } else {
    actions.append(button(index === questions.length - 1 ? "סיום וצפייה בתוצאות" : "השאלה הבאה ←", "primary-button",
      () => index === questions.length - 1 ? requestFinish() : moveQuestion(index + 1)));
  }
  document.querySelector("#answered-count").textContent = `${answered} מתוך ${questions.length} שאלות נענו`;
  questions.forEach((_, questionIndex) => {
    const item = button(`${questionIndex + 1}`, "map-button", () => moveQuestion(questionIndex));
    const isAnswered = answers[questionIndex] !== null;
    item.classList.toggle("answered", isAnswered);
    item.classList.toggle("current", index === questionIndex);
    item.setAttribute("aria-label", `שאלה ${questionIndex + 1}, ${isAnswered ? "נענתה" : "טרם נענתה"}`);
    if (index === questionIndex) item.setAttribute("aria-current", "step");
    document.querySelector("#question-map").append(item);
  });
  document.querySelector("#finish-action").append(button("סיום התרגול", "secondary-button full-width", requestFinish));
  if (mode === "test") updateTimer();
  if (focus) focusMain();
}

function moveQuestion(index) {
  if (session.deadline && !remainingSeconds(session.deadline)) return finishSession(true);
  session.index = index;
  renderQuestion();
}

function requestFinish() {
  const unanswered = session.answers.filter((answer) => answer === null).length;
  showDialog("לסיים ולראות את התוצאות?", unanswered
    ? `נותרו ${unanswered} שאלות ללא תשובה. הן ייחשבו כשאלות שלא נענו נכון. אפשר לחזור אליהן לפני הסיום.`
    : "כל השאלות נענו. התוצאות וההסברים מחכים לכם.", [
    { label: "לסיים ולראות תוצאות", primary: true, run: () => finishSession(false) },
    { label: "לחזור לשאלות" },
  ]);
}

function finishSession(timedOut) {
  if (!session) return;
  const { questions, answers, mode, started, deadline } = session;
  const result = {
    ...scoreSession(questions, answers), mode, date: new Date().toISOString(),
    duration: Math.round((Math.min(Date.now(), deadline ?? Infinity) - started) / 1000),
  };
  stopSession();
  history = [...history, result].slice(-HISTORY_LIMIT);
  if (canSave) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch (error) {
      storageError("לא ניתן לשמור את ההתקדמות בדפדפן. התוצאות זמינות כעת, אך עלולות להיעלם בסגירת העמוד. בדקו את הגדרות האחסון או פנו מקום.");
      console.warn("Could not save practice history.", error);
    }
  }
  renderResults(result, timedOut);
}

function renderResults(result, timedOut = false) {
  setNav(null);
  const percent = Math.round(result.correct / result.total * 100);
  main.innerHTML = `
    <section class="results-heading"><p class="eyebrow">עוד צעד קטן, עוד משהו שלמדנו</p><h1>כל הכבוד על הדרך!</h1><p id="result-summary"></p><div class="score-ring"><strong id="score-percent"></strong><span>תשובות נכונות</span></div><p id="score-count"></p><p id="timeout-note" class="notice" hidden>הזמן הסתיים והמבחן הוגש אוטומטית, כולל התשובות שסומנו עד אז.</p><div id="results-actions" class="center-actions"></div><p class="muted">זהו ציון תרגול בלבד, לא ציון תקני או תחזית לקבלה לתוכנית מחוננים.</p></section>
    <section class="results-breakdown" aria-label="תוצאות לפי תחום" id="breakdown"></section>
    <section class="review-section"><div class="section-heading"><div><p class="eyebrow">כאן מתרחשת הלמידה</p><h2>חוזרים לשאלות, מבינים את הדרך.</h2></div><div id="review-filter"></div></div><div id="review-list"></div></section>`;
  const durationMinutes = Math.floor(result.duration / 60);
  document.querySelector("#result-summary").textContent = `${result.total} שאלות · ${durationMinutes} דקות ו־${result.duration % 60} שניות של חשיבה`;
  document.querySelector("#score-percent").textContent = `${percent}%`;
  document.querySelector(".score-ring").style.setProperty("--score", `${percent}%`);
  document.querySelector("#score-count").textContent = `${result.correct} תשובות נכונות מתוך ${result.total}`;
  document.querySelector("#timeout-note").hidden = !timedOut;
  document.querySelector("#results-actions").append(
    button("חזרה למרחב התרגול", "primary-button", renderHome),
    button("ההתקדמות שלי", "secondary-button", renderHistory),
  );
  const questions = result.responses.map((response) => QUESTIONS.find((question) => question.id === response.questionId));
  const scored = scoreSession(questions, result.responses.map((response) => response.answer));
  for (const [key, stats] of Object.entries(scored.categories)) {
    if (!stats.total) continue;
    const card = el("div", `breakdown-card ${CATEGORIES[key].color}`);
    card.append(el("span", "", CATEGORIES[key].name), el("strong", "", `${stats.correct} / ${stats.total}`));
    document.querySelector("#breakdown").append(card);
  }
  let onlyMistakes = false;
  const filter = button("הצגת טעויות בלבד", "secondary-button", () => {
    onlyMistakes = !onlyMistakes;
    filter.textContent = onlyMistakes ? "הצגת כל השאלות" : "הצגת טעויות בלבד";
    filter.setAttribute("aria-pressed", String(onlyMistakes));
    renderReview();
  });
  filter.setAttribute("aria-pressed", "false");
  document.querySelector("#review-filter").append(filter);
  function renderReview() {
    const list = document.querySelector("#review-list");
    list.replaceChildren();
    result.responses.forEach((response, index) => {
      const question = questions[index];
      const correct = response.answer === question.correct;
      if (onlyMistakes && correct) return;
      const details = el("details", "review-item");
      const summary = el("summary");
      summary.append(el("span", correct ? "review-status good" : "review-status bad", correct ? "✓" : "×"),
        el("span", "", `${index + 1}. ${question.prompt}`));
      const content = el("div", "review-content");
      if (question.panels) content.append(renderPanels(question));
      const userAnswer = el("div", "review-answer");
      userAnswer.append(el("strong", "", "התשובה שלכם: "));
      appendAnswer(userAnswer, response.answer === null ? null : question.options[response.answer], response.answer);
      const rightAnswer = el("div", "review-answer");
      rightAnswer.append(el("strong", "", "התשובה הנכונה: "));
      appendAnswer(rightAnswer, question.options[question.correct], question.correct);
      content.append(userAnswer, rightAnswer, el("p", "review-explanation", question.explanation));
      details.append(summary, content);
      list.append(details);
    });
    if (!list.childElementCount) list.append(el("p", "empty-message", "אין טעויות בתרגול הזה. נהדר!"));
  }
  renderReview();
  focusMain();
}

function appendAnswer(parent, option, index) {
  if (option === null) parent.append(el("span", "", "לא נענתה"));
  else if (typeof option === "string") parent.append(el("span", "", option));
  else {
    parent.append(el("span", "", `${["א", "ב", "ג", "ד"][index]} — `), drawDiagram(option));
  }
}

function renderHistory() {
  setNav("history");
  main.innerHTML = `
    <section class="page-heading"><p class="eyebrow">הדרך שלכם, צעד אחרי צעד</p><h1>ההתקדמות שלי</h1><p>לא משווים לאחרים. מסתכלים על מה שכבר למדנו.</p></section>
    <section id="history-stats" class="history-stats"></section>
    <section class="history-section"><div class="section-heading"><h2>התרגולים האחרונים</h2><div id="history-actions"></div></div><div id="history-list"></div></section>
    <div class="privacy-note"><strong>ההתקדמות נשארת אצלכם.</strong><p>עד 100 התרגולים האחרונים נשמרים בדפדפן הזה בלבד. אין סנכרון בין מכשירים. ניקוי נתוני האתר או שימוש בגלישה פרטית עלולים למחוק את ההיסטוריה. תרגול שלא הושלם אינו נשמר.</p><div id="reset-action"></div></div>`;
  const total = history.reduce((sum, entry) => sum + entry.total, 0);
  const correct = history.reduce((sum, entry) => sum + entry.correct, 0);
  const mistakes = getMistakeIds(history);
  for (const [value, label] of [[history.length, "תרגולים שהושלמו"], [total, "שאלות בתרגולים שהושלמו"], [total ? `${Math.round(correct / total * 100)}%` : "—", "תשובות נכונות בסך הכול"]]) {
    const card = el("div", "history-stat");
    card.append(el("strong", "", value), el("span", "", label));
    document.querySelector("#history-stats").append(card);
  }
  if (mistakes.length) document.querySelector("#history-actions").append(
    button(`תרגול שאלות לחזרה (${mistakes.length})`, "primary-button", () => startSession("mistakes")));
  const list = document.querySelector("#history-list");
  if (!history.length) {
    const empty = el("div", "empty-state");
    empty.append(el("span", "empty-icon", "↗"), el("h3", "", "הצעד הראשון עוד לפניכם"), el("p", "", "אחרי שתסיימו תרגול, התוצאות וההסברים יופיעו כאן."),
      button("מתחילים לתרגל", "primary-button", () => startSession("practice")));
    list.append(empty);
  }
  for (const entry of [...history].reverse()) {
    const row = el("article", "history-row");
    const description = el("div");
    const title = entry.mode === "test" ? "מבחן תרגול משולב" : entry.mode === "mistakes" ? "חזרה על שאלות" : "תרגול אישי";
    description.append(el("h3", "", title), el("p", "muted", new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short" }).format(new Date(entry.date))));
    row.append(description, el("strong", "history-score", `${entry.correct} / ${entry.total}`),
      button("תוצאות והסברים ←", "text-button", () => renderResults(entry)));
    list.append(row);
  }
  document.querySelector("#reset-action").append(button("מחיקת ההתקדמות בדפדפן הזה", "text-button danger-text", () => {
    showDialog("למחוק את ההתקדמות?", "כל תוצאות התרגולים השמורות בדפדפן הזה יימחקו. אי אפשר לבטל את המחיקה.", [
      { label: "להשאיר את ההתקדמות", primary: true },
      { label: "למחוק הכול", run: () => {
        try {
          localStorage.removeItem(STORAGE_KEY);
          history = [];
          canSave = true;
          warning.hidden = true;
          renderHistory();
        } catch (error) {
          storageError("הדפדפן לא אפשר למחוק את הנתונים. בדקו את הרשאות האחסון בהגדרות הדפדפן.");
          console.warn("Could not clear practice history.", error);
        }
      } },
    ]);
  }));
  focusMain();
}

const shapeNames = { circle: "עיגולים", square: "ריבועים", triangle: "משולשים", diamond: "מעוינים" };
function diagramDescription(diagram) {
  if (diagram.kind === "arrow") {
    const directions = ["למעלה", "ימינה ולמעלה", "ימינה", "ימינה ולמטה", "למטה", "שמאלה ולמטה", "שמאלה", "שמאלה ולמעלה"];
    return `חץ ${directions[diagram.angle / 45]}`;
  }
  if (diagram.kind === "grid") return `רשת 3 על 3, תאים שחורים במיקומים ${diagram.cells.map((cell) => cell + 1).join(", ")} בסדר שורות משמאל לימין`;
  return `${diagram.count} ${shapeNames[diagram.shape]} ${diagram.filled ? "מלאים" : "חלולים"}`;
}

function svgNode(tag, attributes = {}) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, value);
  return node;
}

function drawDiagram(diagram) {
  const svg = svgNode("svg", { viewBox: "0 0 100 100", class: "diagram", role: "img", "aria-label": diagramDescription(diagram) });
  svg.append(svgNode("title"));
  svg.firstChild.textContent = diagramDescription(diagram);
  if (diagram.kind === "arrow") {
    svg.append(svgNode("path", {
      d: "M50 78V22M28 44L50 22L72 44", fill: "none", stroke: "currentColor",
      "stroke-width": 7, "stroke-linecap": "round", "stroke-linejoin": "round", transform: `rotate(${diagram.angle} 50 50)`,
    }));
  } else if (diagram.kind === "grid") {
    for (let cell = 0; cell < 9; cell++) {
      svg.append(svgNode("rect", {
        x: 14 + (cell % 3) * 24, y: 14 + Math.floor(cell / 3) * 24, width: 24, height: 24,
        fill: diagram.cells.includes(cell) ? "currentColor" : "none", stroke: "currentColor", "stroke-width": 1.5,
      }));
    }
  } else {
    const positions = {
      1: [[50, 50]], 2: [[30, 50], [70, 50]], 3: [[50, 26], [27, 68], [73, 68]],
      4: [[28, 28], [72, 28], [28, 72], [72, 72]],
      5: [[23, 23], [77, 23], [50, 50], [23, 77], [77, 77]],
    };
    for (const [x, y] of positions[diagram.count]) {
      const attrs = { fill: diagram.filled ? "currentColor" : "none", stroke: "currentColor", "stroke-width": 2.5 };
      if (diagram.shape === "circle") svg.append(svgNode("circle", { ...attrs, cx: x, cy: y, r: 10 }));
      if (diagram.shape === "square") svg.append(svgNode("rect", { ...attrs, x: x - 10, y: y - 10, width: 20, height: 20 }));
      if (diagram.shape === "triangle") svg.append(svgNode("polygon", { ...attrs, points: `${x},${y - 12} ${x + 12},${y + 10} ${x - 12},${y + 10}` }));
      if (diagram.shape === "diamond") svg.append(svgNode("polygon", { ...attrs, points: `${x},${y - 13} ${x + 11},${y} ${x},${y + 13} ${x - 11},${y}` }));
    }
  }
  return svg;
}

function renderPanels(question) {
  const container = el("div", `panels ${question.layout}`);
  container.dir = "ltr";
  container.setAttribute("role", "group");
  container.setAttribute("aria-label", "הסדרה או הטבלה, משמאל לימין");
  const panels = question.layout === "sequence" ? [...question.panels, null] : question.panels;
  for (const [index, panel] of panels.entries()) {
    const cell = el("div", panel === null ? "panel missing-panel" : "panel");
    if (panel === null) {
      cell.textContent = "?";
      cell.setAttribute("aria-label", "המקום החסר");
    } else {
      const drawing = drawDiagram(panel);
      drawing.setAttribute("aria-label", `משבצת ${index + 1}: ${diagramDescription(panel)}`);
      cell.append(drawing);
    }
    container.append(cell);
  }
  return container;
}

document.querySelector("#home-nav").addEventListener("click", () => navigate(renderHome));
document.querySelector("#history-nav").addEventListener("click", () => navigate(renderHistory));
document.querySelector(".brand").addEventListener("click", (event) => {
  event.preventDefault();
  navigate(renderHome);
});
document.querySelector("#about-button").addEventListener("click", () => {
  const content = el("div", "about-content");
  content.innerHTML = `
    <p>״צעד קדימה״ הוא מרחב תרגול עצמאי לתלמידי כיתה ו׳ המתכוננים למיון לכיתות מחוננים בחטיבת הביניים בישראל. האתר אינו משויך למשרד החינוך או לגוף הבוחן ואינו מאושר על ידם.</p>
    <p>60 השאלות וההסברים נוצרו במיוחד לאתר בסיוע בינה מלאכותית. אלו אינן שאלות רשמיות, משוחזרות או מועתקות. הן מתרגלות חשיבה מילולית, כמותית וצורנית; אין התחייבות להתאמה למבנה, לרמה, לתזמון או לתוכן של בחינה מסוימת. ייתכנו טעויות, ומומלץ לעבור על התוכן יחד עם מבוגר.</p>
    <p>מבחן התרגול שלנו כולל 24 שאלות ב־30 דקות. זהו מבנה תרגול שבחרנו, לא נתון על הבחינה הרשמית. ציונים אינם מנבאים קבלה ואינם מודדים מחוננות. בשל גודל המאגר, שאלות עשויות לחזור בתרגולים שונים.</p>
    <p>הנחיות רשמיות ועדכניות לגבי המיון וההתאמות מופיעות ב<a href="https://parents.education.gov.il/gifted/sondary-education-frameworks/tests-for-f-j-grades/?culture=he" target="_blank" rel="noopener noreferrer">פורטל ההורים של משרד החינוך</a>. תיאורי תחומי החשיבה נבדקו גם מול תיאורי הכנה ציבוריים; אין לנו גישה למאגר הבחינות החסוי.</p>
    <p>אין באתר חשבונות, פרסומות, כלי מעקב או שירותי ניתוח שימוש. תוצאות נשמרות רק באחסון המקומי בדפדפן; אין להזין פרטים אישיים. אירוח ב־GitHub כפוף ל<a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" target="_blank" rel="noopener noreferrer">מדיניות הפרטיות של GitHub</a>. אתר Pages אינו בהכרח פרטי גם כשהמאגר פרטי.</p>`;
  showDialog("על התרגול והפרטיות", content, [{ label: "הבנתי, ממשיכים", primary: true }]);
});
window.addEventListener("beforeunload", (event) => {
  if (!session) return;
  event.preventDefault();
  event.returnValue = "";
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) updateTimer();
});
renderHome(false);
