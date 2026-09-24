# Workout Tracker

A Next.js workout tracking app built with Supabase for tracking gym workouts, exercises, sets, reps, and progress over time.

## Features

- Log workouts by muscle group focus (Chest / Shoulders / Triceps, Back / Biceps, Legs, etc.)
- Track exercises with sets, reps, and weight
- Log swim sessions as a list of intervals (`reps × yards`, optional leave-on time) with a live auto-total
- View workout history
- Track progress week-over-week and month-over-month
- Personal records tracking

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth)
- **Charts:** Recharts
- **Deployment:** Vercel

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings > API to get your project URL and anon key
3. Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Database

1. In Supabase Dashboard, go to SQL Editor
2. Run the migration file: `supabase/migrations/001_initial_schema.sql`
3. Run the seed file: `supabase/seed.sql` to populate exercises

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Read-only workout API

A small HTTPS API so an external coach bot can pull workout history. It is **GET-only** and does not change the existing web app. If `WORKOUT_API_KEY` is unset, these routes return `401` and the UI keeps working as before.

### Endpoints

- `GET /api/workouts?from=YYYY-MM-DD&to=YYYY-MM-DD` — sessions in an inclusive date range (`from` / `to` are optional)
- `GET /api/workouts/today` — sessions on today's date in Pacific Time (`America/Los_Angeles`), same as the log form
- `GET /api/workouts/:id` — one session by id

Each session includes date, workout name (`focus`), notes, body weight when stored, and exercises with sets, reps, weight, and rest interval. There is no separate workout-duration column; cardio timings are stored on sets as `reps` (seconds).

Responses are additive and backward compatible:

- Envelope: `schemaVersion` (currently `3`) and `units` (`bodyWeight`/`strengthWeight` in `lb`, cardio `distance` in `mi`, `duration` in seconds, Peloton `output` in `kJ`, swim distance in `yd`).
- `bodyWeight` stays a number (or `null`). `bodyWeightUnit` is always `"lb"`.
- Each exercise adds `modality` (`strength`, `bodyweight`, `duration`, `cardio_distance`, `cardio_output`, `swim`, `walk`).
- Each set keeps raw `reps` / `weight` / `restIntervalSeconds` and adds decoded fields when inferable (`durationSec`, `distanceMi`, `outputKj`, `paceSecPerMi`, `inclinePct`, `intervalSec`, `distanceYd`, `swimSetCount`, `totalDistanceYd`).
- Swim exercises also add `intervals` (one object per row: `reps`, `distanceYd`, `intervalSec`, `totalDistanceYd`) plus session `totalDistanceYd` and `intervalCount`. Total yards is always the sum of `reps × distanceYd`. Older collapsed rows (for example `7 × 100`) still decode as a single interval.

### Logging a mixed swim

On a Cardio workout, pick **Swimming** and add one interval row per piece. Leave interval time blank unless you used a clock.

Example (1000 yd):

- `1 × 100` · interval `3:00` (optional)
- `1 × 100`
- `1 × 200`
- `1 × 100`
- `1 × 200`
- `1 × 100`
- `1 × 200`

The form shows **Total: 1,000 yd** from those rows. You never type the total. History shows `Swim · 1,000 yd · 7 intervals`.

### Auth

Send the shared secret from the `WORKOUT_API_KEY` environment variable using either header:

- `Authorization: Bearer <secret>`
- `X-Api-Key: <secret>`

Missing or wrong keys return `401`. Never commit a real key.

Optional: set `WORKOUT_API_USER_ID` to Kevin's Auth0 `sub` if the database has more than one user. If omitted, the API returns all stored workouts (this is a single-user app).

### Vercel

1. Open the project on Vercel → **Settings → Environment Variables**
2. Add `WORKOUT_API_KEY` with a long random secret (for example `openssl rand -hex 32`)
3. Optionally add `WORKOUT_API_USER_ID`
4. Redeploy so the new variable is available to serverless functions

The public UI does not need `WORKOUT_API_KEY`.

### curl example

```bash
curl -sS \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts?from=2026-09-01&to=2026-09-20"
```

Example session fields (raw `reps`/`weight` stay; decoded fields are extra). A mixed swim adds `intervals` and a derived `totalDistanceYd`:

```json
{
  "name": "Swimming",
  "modality": "swim",
  "totalDistanceYd": 1000,
  "intervalCount": 7,
  "intervals": [
    { "reps": 1, "distanceYd": 100, "intervalSec": 180, "totalDistanceYd": 100 },
    { "reps": 1, "distanceYd": 200, "intervalSec": null, "totalDistanceYd": 200 }
  ]
}
```

Cardio example (raw `reps`/`weight` stay; decoded fields are extra):

```json
{
  "schemaVersion": 3,
  "units": { "bodyWeight": "lb", "distance": "mi", "duration": "s", "output": "kJ" },
  "workouts": [
    {
      "bodyWeight": 186.5,
      "bodyWeightUnit": "lb",
      "focus": "Cardio",
      "exercises": [
        {
          "name": "Running",
          "modality": "cardio_distance",
          "sets": [
            {
              "setNumber": 1,
              "reps": 1800,
              "weight": 3,
              "durationSec": 1800,
              "distanceMi": 3,
              "paceSecPerMi": 600
            }
          ]
        }
      ]
    }
  ]
}
```

Or with `X-Api-Key`:

```bash
curl -sS \
  -H "X-Api-Key: $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts/today"
```

## Deployment

### Deploy to Vercel

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Import project in Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add environment variables in Vercel**
   - Go to Project Settings > Environment Variables
   - Add the following:
     - `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = your Supabase anon key

4. **Deploy!**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Post-Deployment Checklist

- [ ] Verify Supabase database migrations are run
- [ ] Verify exercise seed data is loaded
- [ ] Test authentication (signup/login)
- [ ] Test workout logging
- [ ] Verify charts are displaying correctly

## Project Structure

```
app/
├── (auth)/          # Login/signup pages
├── (dashboard)/     # Protected dashboard pages
components/
├── ui/              # shadcn components
lib/
├── supabase/        # Supabase client setup
supabase/
├── migrations/      # Database migrations
└── seed.sql         # Exercise seed data
```

