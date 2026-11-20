# FocusAI — Design language «Apple-clean»

Chosen by the founder on 2026-11-21 after two other directions («спокойный сад» pastel scenes) felt overloaded and «ИИшно».
Reference: Apple Health / Fitness / Reminders. Calm, precise, data first.

## Principles
1. **Less on screen.** One summary card, then grouped lists. No decorative scenes, gradients, noise or glow on light screens.
2. **One tint.** Accent `#1E5BFF` = everything interactive. Color elsewhere only carries meaning (sphere icons, rings, charts).
3. **Typography does the hierarchy.** Inter only. Large title 34/bold, section title 22/bold, row title 17/regular, secondary 13–15/muted.
4. **Native patterns.** iOS tab bar, inset grouped lists with 32px colored icon squares, Reminders-style circle checks, segmented controls, sheets.
5. **Dark only where it means «doing».** Focus session and reaction test are black screens.

## Tokens (src/app/globals.css)
- bg `#F2F2F7`, surface `#FFFFFF`, line `#E5E5EA`, ink `#1C1C1E`, muted `#6C6C70`, accent `#1E5BFF`, soft `#EAF0FF`.
- night `#000000`, night-2 `#1C1C1E`, night-ink `#FFFFFF`, night-muted `#98989F`.
- Sphere colors `--color-s-*` (base / tint / ink) — icon squares, rings, insight bars.
- Radii: rows/cards 14–18px, buttons 14px, small controls 8–12px. Shadows: none (hairline only).
- Classes: `.title`, `.stat` (tabular numbers), `.group-list`, `.night`, `.pressable` (scale .97 on press), `.stagger` (6px rise).

## Components
- **Buttons:** primary 50px tall, accent fill, 17/semibold; secondary soft fill with accent text. One primary per screen.
- **Rows:** 60px, 32px icon square (white glyph on sphere/system color), title + subtitle, chevron or green check.
- **Summary card (Сегодня):** Focus Score ring (solid accent) + 3 facts + 7-day strip.
- **Habits:** Reminders-style circles, «N из 7 дней» under the title, no streaks.
- **Segmented control:** gray track `#E3E3E8`, white selected segment, ≥44px tall.

## Screens
Сегодня (summary, «Отметить день» button, Действия, Привычки, Обзор) · Чек-ин (one sphere per screen, colored icon square, thin colored progress) · Фокус (black) · Тест (black) · Сад (tree on a soft card, stage icons, lists) · Инсайты (segmented with Библиотека, weekly bars card, insight cards with split bars) · Итоги недели · Настройки.
