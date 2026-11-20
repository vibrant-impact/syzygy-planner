# Syzygy — Astrological Transit & Cosmic Alignment Planner

A personalized astrological transit planner, ephemeris tracker, and cosmic alignment scheduler built with **React 19**, **TypeScript**, **Tailwind CSS v4**, and **astronomy-engine**.

Syzygy calculates planetary positions, house cusps, lunar phases, retrogrades, and transit-to-natal aspects across **2026–2027**, pairing astronomical telemetry with actionable alignment rituals and a local reflection journal.

---

## Core Features

### 1. Multi-Horizon Cosmic Planner (`Day` · `Week` · `Month` · `Year`)
* **42-Cell Monthly Calendar Matrix:** Highlights daily planetary ingresses, eclipses, New/Full Moons (`●` / `○`), retrograde spans, and peak-intensity alignments (`▲`).
* **Day, Week & Year Ephemeris Views:** Drill down into daily lunar illumination and active retrogrades, inspect a 7-day rolling horizon, or scan an annual 12-month milestone matrix.
* **Smart Category & Planet Filtering:** Filter alignments by *Natal Activations*, *Planetary Shifts*, *Moon Phases*, *Retrogrades*, *High Intensity*, custom user tags, or by clicking any planet directly on the Bi-Wheel chart.

### 2. Precision Tropical Ephemeris & Natal Chart Engine
* **VSOP87 & ELP2000 Astronomical Math:** Computes apparent geocentric tropical longitudes for Sun through Pluto, True Lunar North Node (Meeus Ch. 47), and secular-calibrated 3D Keplerian **2060 Chiron**.
* **Flexible House Systems & Timezone Resolution:** Supports **Placidus**, **Whole Sign**, and **Equal House** systems with historical Daylight Saving Time resolution and permanent Alberta Time (`ABT`, `UTC-6`) support from November 1, 2026 onward.
* **Interactive SVG Natal & Transit Bi-Wheel:** Plots natal placements against live sky transits with real-time aspect chord geometry (`Conjunction`, `Opposition`, `Square`, `Trine`, `Sextile`).
* **Birth Profile Drawer:** Switch between saved chart presets, search global cities, adjust coordinates, or pin custom degree overrides.

### 3. Alignment Ritual RSVPs & Personal Reflection Log
* **Actionable Ritual Checklists:** Every transit and lunation includes a tailored alignment ritual with interactive step checkboxes and a 3-state RSVP tracker (`Not RSVP'd`, `Committed`, `Completed`).
* **Custom Ritual Scheduler:** Create personal alignment events tied to specific zodiac signs and time windows.
* **Searchable Reflection Archive:** Record somatic observations, dreams, and insights tagged by energetic resonance (*Grounded*, *Activated*, *Breakthrough*, *Tender*, *Clear*), persisted locally via `localStorage`.

---

## Project Structure

```text
src/
├── components/
│   ├── BiWheelChart.tsx          # Interactive SVG natal & transit bi-wheel compass
│   ├── BirthProfileDrawer.tsx    # Birth details editor, city presets & degree overrides
│   ├── EventDetailPanel.tsx      # Slide-over inspector for ritual RSVPs, tags & notes
│   ├── NatalChartSection.tsx     # Full natal placement table, house cusps & 2026-27 shifts
│   ├── PlannerViews.tsx          # Day, Week, Month & Year calendar timeline views
│   ├── RitualsAndReflections.tsx # Committed ritual tracker & searchable reflection log
│   └── SyzygyLogoMark.tsx        # Animated SVG celestial alignment emblem
├── data/
│   └── presets.ts                # Zodiac glyphs, house themes, city presets & chart profiles
├── engine/
│   └── ephemeris.ts              # Pure TypeScript astronomical engine & transit generator
├── types/
│   └── astrology.ts              # Domain TypeScript interfaces and union types
├── App.tsx                       # Main application state, filters & localStorage persistence
└── index.css                     # Cosmic dark theme tokens & orbital keyframe animations
```

---

## Local Setup & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000/` in your browser.

3. **Build for production:**
   ```bash
   npm run build
   ```

---

## Roadmap & Ecosystem Integration
* **JSON Data Backup & Restore:** Add one-click export/import for `localStorage` commitments, custom events, and reflection notes.
* **Aligned Creation Engine Integration:** Connect high-intensity transits and lunar intention windows directly to chakra manifestation stages and guided meditation sessions.