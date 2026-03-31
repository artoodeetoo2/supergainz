# Changelog

## [0.2.0] - 2026-03-31

### Added
- **AI weight suggestions in Workout Logger** — tap AI button on any exercise to get a Claude-powered weight recommendation based on your training history
- **Apply to sets** — AI suggestion includes a one-tap "Apply X kg to all sets" button that instantly updates every set in the exercise
- **Zyzz GIF on workout completion** — random Zyzz animation (dancing / flexing / mirin) plays when you finish a session
- **Active nav highlight** — bottom navigation now highlights the current page with neon pink glow
- **Firebase Hosting** — app deployed to https://supergainz.web.app

### Changed
- Programs page fully restyled to match neon retro wave theme (Orbitron font, neon-cyan/pink program names, styled buttons)
- Home page program names now use Orbitron font with neon-cyan color
- Version number displayed at bottom of Home page

### Fixed
- GIF files moved to `public/gifs/` so they are correctly served by Vite and Firebase Hosting

---

## [0.1.0] - 2026-03-30

### Added
- **Google Authentication** — sign in with Google, user-scoped Firestore data
- **Home** — Zyzz character hero banner, program list with muscle group icons, START button
- **Programs** — full program management: Load Defaults (5 programs), AI Suggest (Claude), AI Coach (3-step interview: goal / experience / strength level)
- **Workout Logger** — active session with stopwatch timer, set rows (reps + weight inputs), set completion toggle, Add Set, save to Firestore with 8s timeout
- **Stats** — Recharts LineChart with Tron-style grid, glowing cyan line, flame effect on upward trend, personal record badge
- **Muscle group icons** — 9 cropped icons (chest, back, shoulders, arms, legs, core, biceps, triceps, hamstrings)
- **Neon retro wave aesthetic** — Orbitron + Exo 2 fonts, neon flicker animations, glow effects, scanlines
- **Zyzz quotes** — 69 motivational quotes on workout completion screen
