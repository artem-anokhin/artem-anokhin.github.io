# FocusAI — Design language «Спокойный сад фокуса»

One idea: **the app is a living garden at dawn (day screens) and a quiet night sky (focus screens).** Every screen has one scene or one big number; everything else is calm text on the background, not boxes.

## 1. Principles
1. **One hero per screen.** One illustrated surface (tree scene, score ring, timer). The rest is plain list rows. Max 1–2 cards per viewport.
2. **Show, then tell.** Number/ring/chart first, one line of text second. Paragraphs >2 lines go behind «Подробнее».
3. **Color = meaning.** Each of the 7 spheres has its own color, used everywhere that sphere appears (wizard, chips, insights). Navy/blue is brand + actions only.
4. **Day vs night.** Planning/reflection = light «garden» surfaces. Doing (test, focus session) = full-screen dark «night» surfaces, no nav, no chrome.
5. **Everything breathes.** Each action gets a small physical reaction (pop, drop, grow). Short, never looping on text. `prefers-reduced-motion` → opacity only.

**STOP:** UPPERCASE two-line titles on every screen; white bordered card around every block; 1.5px borders as decoration; navy-filled number buttons 1–5; grey subtitles under every title; icons at 20px floating alone; disclaimers as a footer under the nav.

## 2. Tokens (add to `@theme` in `src/app/globals.css`)
**Brand (keep):** navy `#0A2A9E`, deep `#071F7A`, accent `#1E5BFF`, soft `#E7EEFF`, ink `#0B1533`, muted `#55658A`, line `#DCE5FA`, leaf `#5DB55A`, leaf-light `#83CF6E`, trunk `#A9774F`, bloom `#F49AC1`, danger `#B42318`.
**New supporting:**
| token | hex | use |
|---|---|---|
| `bg` | `#F6F7FB` | app background (slightly warmer than before) |
| `surface` | `#FFFFFF` | the few real cards, sheets |
| `sand` | `#FBF5EA` | garden ground, warm hero tint |
| `sky-top` / `sky-bottom` | `#CFE0FF` / `#F3F7FF` | tree scene sky gradient |
| `hill-far` / `hill-near` | `#B9E0B0` / `#83CF6E` | scene hills |
| `sun` | `#FFC75A` | sun, streak flame, «капли» highlight |
| `water` | `#3AA8F0` | drops, watering |
| `night` / `night-2` | `#0B1640` / `#13215A` | immersive bg gradient (top→bottom: night-2→night) |
| `night-ink` / `night-muted` | `#EEF2FF` / `#A9B6DE` | text on night (both ≥7:1 / ≥6:1) |
| `glow` | `#5B8CFF` | ring/glow on night |

**Sphere colors** — `base` for icons/fills/rings, `tint` for backgrounds, `ink` for text on tint (≥4.5:1):
| sphere | base | tint | ink | lucide icon |
|---|---|---|---|---|
| Сон | `#6366F1` | `#EEEEFF` | `#3730A3` | Moon |
| Питание | `#F08A3C` | `#FFF1E5` | `#9A4A0E` | Apple |
| Кофеин и вода | `#14A3B8` | `#E3F6F9` | `#0B6676` | GlassWater |
| Состояние | `#E8679A` | `#FDEBF2` | `#9D2C5B` | Smile |
| Активность | `#3FAE5A` | `#E7F5EA` | `#1F6B35` | Footprints |
| Учёба | `#1E5BFF` | `#E7EEFF` | `#0A2A9E` | BookOpen |
| Отдых | `#E0A325` | `#FFF6DC` | `#7A5200` | Coffee/Sofa |
Store as `--color-s-sleep`, `--color-s-sleep-tint`, `--color-s-sleep-ink`, etc.

**Type.** Titles: **Montserrat 800, sentence case** (no uppercase). UPPERCASE only for overlines. Body: Inter. Caveat only for the tree's handwritten caption and greeting name.
| style | font | size/line | weight | notes |
|---|---|---|---|---|
| `stat-xl` | Montserrat | 64/64 | 900 | score, timer; `tabular-nums`, tracking -0.02em |
| `display` | Montserrat | 32/38 | 800 | screen title (one per screen), tracking -0.01em |
| `title` | Montserrat | 22/28 | 800 | section / hero title |
| `head` | Inter | 17/24 | 600 | row titles, questions |
| `body` | Inter | 16/24 | 400 | text |
| `small` | Inter | 14/20 | 500 | secondary, muted |
| `overline` | Inter | 13/16 | 700 | UPPERCASE, tracking .08em, sphere ink or muted |
| `hand` | Caveat | 24/28 | 600 | 1 accent per screen max |
Minimum text 13px. Numbers always `tabular-nums`.

**Radii:** `r-sm 12` (chips, inputs), `r-md 18` (rows on tint, buttons), `r-lg 28` (cards, hero), `r-xl 36` (sheets, scenes top corners), `full` (pills, nav, rings).
**Shadows (layered, no borders on shadowed elements):**
- `shadow-soft`: `0 1px 2px rgba(11,21,51,.04), 0 6px 20px -6px rgba(10,42,158,.10)` — cards, nav.
- `shadow-lift`: `0 2px 6px rgba(11,21,51,.06), 0 24px 48px -16px rgba(10,42,158,.28)` — primary button, hero.
- `shadow-glow`: `0 0 0 1px rgba(91,140,255,.25), 0 0 48px rgba(91,140,255,.35)` — night only.
Border `line` only on inputs and dividers (1px), never on cards.
**Spacing:** 4-pt grid. Screen padding `20px`. Between sections `32px`; inside sections `12–16px`; list row height `≥56px`; bottom safe area `nav height + 24px`.
**Motion:** durations `fast 160ms`, `base 260ms`, `slow 450ms`, `scene 900ms`. Easings `--ease-out: cubic-bezier(.22,1,.36,1)`, `--ease-spring: cubic-bezier(.34,1.56,.64,1)`, `--ease-inout: cubic-bezier(.65,0,.35,1)`.
| keyframe | what | use |
|---|---|---|
| `rise` | opacity 0→1, translateY 12px→0, 260ms out; stagger children 40ms | screen/section enter |
| `pop` | scale .9→1.06→1, 260ms spring | selecting a scale value, chip, completing a step |
| `grow` | scaleY 0→1, `transform-origin: bottom`, 900ms out | tree stage change, bar charts |
| `breathe` | scale 1→1.035→1, 4s inout infinite | tree crown idle, timer ring glow, test «ready» dot |
| `drop` | drop translateY -48px→0 + opacity, then ripple ring scale .4→1.6 fade, 700ms | «+N капель», watering |
| `sway` | rotate -1.5deg↔1.5deg, 6s inout infinite, origin trunk base | leaves/grass |
Buttons on press: `scale(.97)` 160ms. Reduced motion: disable translate/scale/infinite, keep 160ms fade.

## 3. Components
- **App shell.** No sticky header. Top of each tab: `overline` (date or context) + `display` title, left-aligned; one 44px round icon button on the right (settings on Сегодня only). Background `bg`; tab scenes may bleed to the top edge.
- **Bottom nav.** Floating pill: `left/right 12px`, `bottom 12px + safe-area`, height 64, `surface` at 92% + `backdrop-blur-md`, `shadow-soft`, radius full. 4 items, each ≥64×48. Active: `soft` pill behind icon, icon+label `navy`, label 13/600; inactive: icon `muted`, label 13/500 muted. Hidden on check-in, test, focus session, onboarding.
- **Primary button.** h-56, radius `r-md`, `navy` bg, white `head` text, optional leading icon 22px, `shadow-lift`, full width. On night: `#FFFFFF` bg, `navy` text. **Secondary:** h-56, `soft` bg, `navy` text, no shadow. **Tertiary:** text button `accent`, 44px hit area. Max one primary per viewport.
- **Hero surface** (one per screen): radius `r-lg`, gradient or scene fill (never plain white), contains a visual (ring/tree/timer) + ≤1 line text + optional CTA. **List rows** for everything else: no card, 56–72px, leading 40px sphere-tinted circle with icon, `head` + `small` muted, trailing value or chevron; grouped rows separated by 1px `line` inset 72px. **Use a card only** when the block is tappable as a whole or holds a chart.
- **Chips.** h-36 (44 hit), radius full, sphere `tint` bg + `ink` text 14/600; selected = sphere `base` bg + white text + `pop`.
- **Scale 1–5.** 5 equal tiles (h-64, radius `r-md`, gap 8) on sphere `tint`. Each tile = custom SVG face (circle + 2 dots + mouth arc, curvature −2…+2; for non-mood spheres use fill-level glyph: 1–5 rising bars/drops). Selected: tile filled sphere `base`, glyph white, `pop`, label under scale shows the word («Отлично») in sphere `ink`. No digits as the main element; digit as `aria-label`.
- **Stat number.** `stat-xl` + unit in `small` muted aligned to baseline + delta chip (`+4 к прошлой неделе`, leaf ink on leaf tint / danger-ink on `#FDECEC`).
- **Progress ring.** SVG, 12px stroke, round caps; track `soft` (day) / `rgba(255,255,255,.12)` (night); fill: gradient `accent→navy` for Focus Score, sphere color per sphere, `glow` on night. Animate `stroke-dashoffset` 900ms out. Value centered in `stat-xl`.
- **Week strip.** 7 columns, each 40×64: weekday 13/500 muted, below a 32px circle — done day = leaf fill + white check; today = navy 2px ring; future = `line` dashed. Tap → day history.
- **Empty states.** Small flat SVG scene (seed in soil, empty sky) 120px tall + `title` + one `body` line + one button. Never a bare grey sentence.
- **Notices** (demo, disclaimer, «Ответ AI»): inline pill, 13/600, `sand` bg + trunk-dark text `#6B4A2E`, icon Info 16. Demo badge sits at top of the content it labels, not as a page banner. Medical disclaimer: one muted 13px line at the end of scroll content, above nav padding.

## 4. Screens (375px, top → bottom)
**Сегодня.** Overline «Пт, 21 ноября» · `display` «Доброе утро» (+ name if set); gear button right · week strip · **hero** (radius 28, sky gradient `sky-top→sand`, 260px): tree of current stage on a small hill left 55%, Focus Score ring 112px right (or «—» + «Пройдите тест» before first test), drops counter pill top-left: `water` drop SVG + «12 капель» · two primary actions side by side (each 50%, h-96, radius 24): «Чек-ин» on `navy` with ClipboardCheck + «1 минута»; «Фокус-сессия» on `night` with Timer + «25 / 50 мин». Done check-in → tile turns `leaf` tint with check + «Готово», still tappable to edit · «Сегодня» rows: 7 sphere chips in a 2-line wrap showing today’s values (tint chips) · «Совет дня» row with library card link · disclaimer line.
**Check-in wizard.** Full-screen, no nav. Bg = sphere `tint`. Top: close X (44) + segmented progress of 7 dashes in sphere colors (done = base, current = base with `breathe`, todo = white 60%). Center: 96px circle with sphere icon 44px in `base` on white, `rise`; overline «Сфера 3 из 7» in `ink`; question in `title`. Controls: scale tiles or time pickers (time inputs as two big 28px-text pills, 24-h format «23:18»). Bottom sticky: primary «Далее» (sphere `ink` bg). Transition between spheres: content slides 24px + bg color crossfade 450ms. Final screen: drop animation → «+5 капель», tree grows a notch, CTA «На главную».
**Тест.** Night gradient full screen, no nav. Intro: big glowing circle 200px with `breathe`, `display` «Тест реакции» in night-ink, 1 line «90 секунд. Нажимайте, когда круг загорится.», white primary «Начать». Running: thin top progress bar `glow`, centered target 220px tap area (entire lower 70% of screen is the tap zone), stimulus = circle fills `accent` + `shadow-glow`. Result: score ring with `glow` stroke, `stat-xl`, «+N капель» drop, rows for reaction ms / misses in night-muted, secondary «Сравнить с прошлой неделей».
**Фокус-сессия.** Night, no nav. Setup: segmented control 25 / 50 мин (pill, night-2 bg, selected white), optional «Что учите?» chip row (Учёба sphere). Running: timer ring 280px centered, `stat-xl` «24:59», under it the small tree (80px) on a hill silhouette; every 5 min a `drop` falls from top onto the tree. Controls: two 64px round buttons (Pause, Stop) in `rgba(255,255,255,.1)`. Screen keeps minimal: no text besides time + 1 line «Телефон отложен — дерево растёт». Finish: sky gradient transitions night→dawn (scene 900ms), tree `grow`, «+N капель», primary «Готово».
**Дерево (Сад).** Not a card: full-bleed scene top 60% of screen (sky gradient, sun, 2 hill layers, ground `sand`), tree centered with `sway`, flowers `bloom` at stage «цветёт». Overlaid at top: overline «Стадия 3 из 5» + `display` «Саженец». Bottom sheet (radius 36 top, `surface`, `shadow-soft`) pulled up over the ground: progress bar to next stage «ещё 18 капель до дерева», 5 stage dots (seed→bloom icons), rows «Откуда капли» (Чек-ин +5, Тест +3, Фокус 25 мин +4).
**Инсайты.** Segmented control at top: «Инсайты | Библиотека». Insights tab: hero card «Итоги недели» (navy gradient, white text, mini 7-bar chart, CTA) · before 7 days: empty-state scene with countdown ring «ещё 3 дня» · insight cards (radius 28, `surface`, shadow-soft): sphere overline in sphere ink, `title` sentence «Сон 7+ ч связан с Focus Score выше на 9 баллов», mini paired-bar or dot chart in sphere color (h-96), footer 13px muted «На основе 14 дней · Источник: …». AI text gets the «Ответ AI» notice pill.
**Библиотека** (inside Инсайты). Horizontal chip filter by sphere (tint chips). Single-column rows (no grid): 56px sphere-tinted square with icon, title 17/600, «3 мин · Сон» small. Article page: sphere tint header 160px with big icon, `display` title, body 17/28, padding 20, source block at end.
**Онбординг.** 3 slides, full-screen, no nav, swipeable, dots + primary «Далее». Slide art = flat SVG 260px in top half on a tinted blob: 1) seed in soil + 7 sphere-colored dots orbiting («1 минута в день»); 2) score ring + sprout («Тест реакции — ваш Focus Score»); 3) blooming tree on hills («Через 7 дней — первые инсайты»). Then consent screen: list rows with checkboxes, privacy link, disclaimer, primary «Начать».
**Итоги недели.** Full-screen story-style (vertical scroll, no nav), sand → sky gradient bg. Sections, each one big visual: 1) `stat-xl` average Focus Score + delta chip; 2) 7-day bar chart (`grow`), best day highlighted; 3) «Сильнее всего связано» — 1–2 sphere tiles with tint; 4) tree progress this week (before/after small trees); 5) one experiment for next week as a card + primary «Принять». Footer: days count + sources.

## 5. Navigation
4 tabs: **Сегодня** (Sun) · **Фокус** (Timer: hub with «Фокус-сессия» hero + «Тест реакции» row + history) · **Сад** (Sprout: tree) · **Инсайты** (ChartLine: insights + Библиотека segment, Итоги недели on top). Check-in = primary action on Сегодня, not a tab. Settings = gear on Сегодня header (also «Экспорт», «Удалить данные», privacy). Library also deep-linked from «Совет дня» and insight sources. 4 items give bigger targets and a calmer bar than 5.
