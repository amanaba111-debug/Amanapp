# MindLoop

> **Grow calm. Grow smart. Daily.**

A daily-use, Material You, zero-clutter companion that turns mind-enhancing learning and nervous-system calm into a **60-second first-open setup** and **two daily taps**: **FOCUS** and **RESET**. No accounts, no cloud, no ads — 100% offline.

---

## Repository Layout

| Directory | Description |
| --- | --- |
| [`web/`](./web) | **Interactive Offline PWA** (React + TypeScript + Vite + Material You dynamic palette + Web Audio soundscapes + IndexedDB + binary `.sqlite` export + Service Worker). Try live in the browser or install directly on Android via *Add to Home Screen*. |
| [`android/`](./android) | **Native Android App** (Kotlin + Jetpack Compose Material 3, Room DB, Media3 ExoPlayer, WorkManager, Jetpack Glance `2×1` Ring & `1×1` Breathe widgets, Android 7+ Quick-Settings tile, Usage-Access 4-7-8 social-app overlay, optional Play Billing packs, `minSdk 24`). |
| [`packs/`](./packs) | **Offline 4-Week Lesson Packs** (`Spanish`, `Coding`, `Chess`, `Guitar`) + [`custom-pack-template.csv`](./packs/custom-pack-template.csv) for instant private deck import. |
| [`.github/workflows/android-apk.yml`](./.github/workflows/android-apk.yml) | **One-Click APK & PWA CI** — compiles `app-free-release.apk` + `SHA256SUMS.txt` and builds the offline PWA bundle automatically. |

---

## Core Experience

1. **60-Second First-Open Setup**
   - Pick a 4-week skill (**Spanish**, **Coding**, **Chess**, **Guitar**, or import your own CSV).
   - Choose and preview a calm sound theme (**Rain**, **Forest**, **Café**).
   - Toggle **Do-Not-Disturb / Social Shield**, **Daily Flow Cues**, and **Live Step Counter**.
   - Done — zero login, works fully offline.

2. **Dead-Simple Single Home Screen (Bottom-⅓ Thumb Reach)**
   - **Top Card — Concentric Progress Ring**: **Grow 60 min** (learning + exercise) and **Calm 30 min** (breathing + mindful moments).
   - **FOCUS (Green)**: 25-min Pomodoro + curated micro-lesson flashcards (Leitner spaced repetition) + ambient soundscape + social-app shield.
   - **RESET (Blue)**: 60-second **4-7-8** breathing orb + singing-bowl chimes + haptic vibration guide.
   - **Bottom Mini-Bar**: **Steps** (live pedometer, `2,000 steps = +15 min Grow`), **Water** (1-tap glass refill), and **Mood** (emoji slider + evening check-in).
   - **Hidden Settings**: **Press and hold the progress ring for 3 seconds** to customize Material You dynamic color (or extract directly from a wallpaper photo), switch Light / Dark / true `#000000` AMOLED Black, upload custom flashcard CSVs, preview widgets & daily automations, export your `.sqlite` database, or run a 1-tap GDPR full erase.

3. **Zero-Planning Daily Flow & Smart Automations**
   - **Morning**: 5-breath primer turns your ring primed green until your first FOCUS session.
   - **Work (every 90 min)**: Swipeable `"RESET?"` heads-up opens 60-second 4-7-8 breathing.
   - **Social Shield**: Opening Instagram / TikTok outside your lunch window overlays a calm 4-7-8 bubble (breathe or dismiss).
   - **Missed a Day?**: Guilt-free **12-min condensed Catch-up** session next morning.
   - **Evening (moon icon / 1h before bed)**: 1-tap **5, 10, or 15-min Body-Scan** with live audio wave, progressive screen fade-to-black, and automatic AMOLED Night Mode.

---

## Quick Start

### 1. Run the Live Offline PWA (`web/`)

```bash
cd web
npm install
npm run dev
```

Install on Android Chrome: tap **⋮ → Add to Home screen → Install**. Long-press the installed app icon for instant **Breathe (4-7-8)**, **FOCUS (25m)**, and **Body-Scan** shortcuts.

### 2. Build the Native Android App (`android/`)

Open `android/` directly in **Android Studio Ladybug (2024.2+)** with JDK 17 and press **Run**, or build from the command line:

```bash
cd android
gradle assembleDebug assembleRelease
```

Push a tag like `v1.0.0` (or trigger **Build MindLoop APK & PWA** in GitHub Actions) to produce `app-free-release.apk` with `SHA256SUMS.txt`.

### 3. Custom Flash-Card CSV Format

Upload any `.csv` in Onboarding or Settings (hold ring 3 seconds):

```csv
week,category,front,hint,back,example
1,Basics,"How do you say 'Good morning' in Italian?","Starts with Buon...","Buongiorno","Buongiorno, come stai?"
```

Simple 2-column `front,back` CSVs are also supported automatically.

---

## 30-Second Cheat-Sheet

1. **Open** → pick **Spanish 4-Week** + **Rain** sounds.
2. **Morning & Work** → tap **FOCUS** (25 min), tap **RESET** (60 s) whenever the heads-up appears.
3. **Bedtime** → tap the **moon icon**, choose 5 / 10 / 15 min, and drift to sleep as the screen fades to black.

*Grow calm. Grow smart. Daily.*
