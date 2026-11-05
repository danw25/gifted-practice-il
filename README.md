# צעד קדימה · Gifted Practice IL

A Hebrew, right-to-left practice site for a sixth-grade student preparing for Israel's Ministry of Education gifted-class admission process for secondary school.

**Independent practice, not an official exam replica.** No affiliation with the Ministry of Education or testing providers. Questions and explanations are original, AI-assisted material, not actual or reconstructed exam questions. Adult review is recommended. Scores are not standardized, do not assess giftedness, and cannot predict admission.

## Features

- 60 original questions: 20 verbal, 20 quantitative, and 20 visual reasoning questions, with explanations.
- Ten-question untimed practice, mixed or by topic, with immediate answer checking.
- Balanced 24-question practice tests (eight per topic) with a 30-minute timer and explanations after submission. **These counts and timings are our practice choices, not verified official specifications.**
- SVG visual sequences and matrices, including text alternatives.
- Results, per-topic scores, answer review, and targeted practice of the most recently missed or skipped questions.
- Up to 100 completed sessions saved in this browser's `localStorage`, with a reset control. No accounts, analytics, external fonts, backend, or cross-device syncing. Incomplete sessions are not saved.
- Responsive layout, keyboard navigation, native dialog focus handling, and reduced-motion support.

Questions can repeat between sessions because this is a finite starter bank. Practice emphasizes learning the reasoning, not memorizing answers.

## Run locally

Requires Node.js 22 or newer. No packages need to be installed.

```sh
npm start
# Open http://127.0.0.1:3000
npm test
npm run build
```

The local server listens on loopback only. The build copies only public site assets into `_site/`; source tests, scripts, and repository files are not published.

## Publish on GitHub Pages for free

1. Keep the repository **public** to use Pages on GitHub Free.
2. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions** (already configured for this repository).
3. Open **Actions → Publish practice site → Run workflow**, select `main`, and run it. Subsequent pushes to `main` deploy automatically.
4. Open the published URL shown by the deployment. The expected project URL is `https://danw25.github.io/gifted-practice-il/`, but it is not live until deployment succeeds.

Public repositories support Pages on GitHub Free. Keeping the repository private would instead require an eligible paid plan.

**Private source does not imply a private website.** A normal Pages site can be publicly accessible even if its repository is private. The site contains no child's name or personal details, and progress stays on the device. GitHub hosting is subject to [GitHub's privacy statement](https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement).

## Content and scope

Official registration, accommodations, and admission guidance: [Ministry of Education parent portal](https://parents.education.gov.il/gifted/sondary-education-frameworks/tests-for-f-j-grades/?culture=he). Public descriptions of verbal, quantitative, and visual reasoning also appear in [Machon Noam's preparation overview](https://www.machon-noam.co.il/מכון-קרני-מחוננים-מבחן-לדוגמא). These references inform the broad practice scope only; no source question text has been copied. We do not have access to confidential live exams or guarantee that the question types, difficulty, counts, or timings match a particular year's exam.

Edit `questions.js` to extend the bank. Each question needs a stable unique ID, category, four distinct options, zero-based correct-answer index, and an explanation. Visual diagrams use structured data rather than external images; layout directions are explicitly left-to-right even within the Hebrew interface. Avoid changing existing IDs or answer keys after use: stored history references them, and incompatible saved results will be reported as unreadable rather than silently discarded.

`engine.js` contains selection, scoring, timing, and storage validation. `app.js` implements the interface. `test/engine.test.js` checks content structure, quantitative and visual answer keys, test balance, scoring, history validation, mistake review, and timer behavior.
