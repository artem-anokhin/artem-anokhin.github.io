# FocusAI — product spec (MVP web app)

**One line:** FocusAI finds what exactly in your life breaks your concentration, and helps fix it in one minute a day.
**Users:** students 17–25 first, later young professionals. Socially significant project: free for students.
**Core loop:** check in → measure focus → get a personal insight → do one small step → watch the tree grow.

## Milestones (do them in order, commit after each)

**M0 — Setup.** Next.js + TS strict + Tailwind + Dexie + Vitest + ESLint. Design tokens from docs/DESIGN.md. App shell: bottom navigation on mobile (Сегодня · Тест · Инсайты · Дерево · Библиотека), sidebar on desktop. PWA manifest. Scripts: `typecheck`, `lint`, `test`, `build`.

**M1 — Onboarding + daily check-in.** Onboarding: mode («Учусь» / «Работаю»), consent, disclaimer. Check-in, 7 spheres, each a card, ≤60 seconds total, a progress bar on top:
1. Сон: bedtime, wake time (→ hours), quality 1–5.
2. Питание: breakfast yes/no; regularity: «скудное / нормальное / разнообразное».
3. Кофеин и вода: cups of coffee/energy drinks, time of the last one, glasses of water.
4. Психосостояние: stress 1–5, mood 1–5.
5. Активность: «минимальная / средняя / частая / активная» + optional one line.
6. Учёба / работа: hours, difficulty 1–5.
7. Отдых: type — физический / хобби / для нервной системы / не было.
Optional free-text note. One check-in per day, editable.

**M2 — Focus Test.** Reaction-time test in the style of PVT-B, 90 seconds: stimulus appears after a random 1–4 s delay; record reaction time; responses <100 ms are false starts, >355 ms are lapses. Focus Score 0–100 from mean 1/RT and lapses — document the formula in code. Pure functions, unit-tested. Disclaimer: short version is less precise than the lab test.

**M3 — Today & history.** Today screen: check-in status, today's Focus Score, a radar or pie of the 7 spheres, one tip for tomorrow. History: calendar or list, Focus Score line chart.

**M4 — Insights engine (the AI core, pure TypeScript, well tested).** After ≥7 days: Spearman correlations between each sphere metric and Focus Score (and sleep vs. caffeine timing etc.). Top-3 associations with plain-Russian text, number of days, confidence label (слабая / заметная / сильная). «Эксперимент недели»: one if–then suggestion for the strongest factor; after 7 days compare Focus Score before/after. Test with synthetic data.

**M5 — Tree.** 5 stages: семя → росток → саженец → дерево → цветёт (~30 days). Drops for check-in, test, completed step. A single missed day is not punished; the tree only wilts after 3 silent days. Flat SVG, nature colors. Short motivational messages built from real facts of the user's week.

**M6 — Библиотека.** 15 short knowledge cards (sleep, caffeine, breakfast, water, activity, stress, breaks, phone) based on `docs/sources.md`, each with a source link. Insights and tips link to the matching card.

**M7 — Safety & privacy pass.** Crisis help card, export JSON, delete all data, consent screen, disclaimers everywhere advice appears. Full security review.

**M8 — Polish & demo.** Full UX review, accessibility, empty states, loading states. Demo-data generator (21 days, labelled «демо-данные») for the presentation. README: how to run and deploy for free.

**M9 (optional) — LLM layer.** Provider interface, OFF by default. If an API key is set in `.env.local`: parse a free-text check-in into the 7 spheres and rephrase insights. The app must work fully without this layer.

## Out of scope for MVP
Accounts, backend, Telegram bot, payments, notes/workspace, social features, school students (minors).
