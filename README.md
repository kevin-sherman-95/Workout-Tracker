# Workout Tracker

A Next.js workout tracking app built with Supabase for tracking gym workouts, exercises, sets, reps, and progress over time.

## Features

- Log workouts by muscle group focus (Chest / Shoulders / Triceps, Back / Biceps, Legs, etc.)
- Track exercises with sets, reps, and weight
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

## Workout API (coach bot)

HTTPS API so an external coach bot can read and write workouts. The web app is unchanged. If `WORKOUT_API_KEY` is unset, these routes return `401` and the UI keeps working as before.

Writes use the same tables and packing as the log form, so API-created sessions look identical in the UI.

### Auth

Send the shared secret from `WORKOUT_API_KEY` using either header:

- `Authorization: Bearer <secret>`
- `X-Api-Key: <secret>`

Missing or wrong keys return `401`. Never commit a real key.

**Reads:** optional `WORKOUT_API_USER_ID` (Kevin's Auth0 `sub`) scopes list/get to one user. If omitted, GET returns all stored workouts (this is a single-user app).

**Writes:** always scoped to one owner. Prefer setting `WORKOUT_API_USER_ID`. If it is omitted and the database has exactly one user, writes use that account. If there are zero or multiple users, write endpoints return `503` until the env var is set. Payload `userId` is ignored. Another user's workout id returns `404`.

### Endpoints

| Method | Path | Body | Success response |
|---|---|---|---|
| `GET` | `/api/workouts?from=&to=` or `?date=` | none | `{ schemaVersion, units, workouts: Workout[] }` |
| `GET` | `/api/workouts/today` | none | `{ schemaVersion, units, date, workouts: Workout[] }` |
| `GET` | `/api/workouts/:id` | none | `{ schemaVersion, units, workout: Workout }` |
| `POST` | `/api/workouts` | create object | `201` `{ schemaVersion, units, workout: Workout }` |
| `PATCH` or `PUT` | `/api/workouts/:id` | patch object | `200` `{ schemaVersion, units, workout: Workout }` |
| `DELETE` | `/api/workouts/:id` | none | `200` `{ schemaVersion, units, id, deleted: true }` |

`from` / `to` are inclusive `YYYY-MM-DD`. `date` is a single-day alias (`from` and `to` set to that day). Do not send `date` together with `from`/`to`.

Existing GET list/get JSON is unchanged. Create/update return the same workout object the GET endpoints use.

### Workout object

Each session includes date, workout name (`focus`), notes, body weight when stored, and exercises with sets. There is no separate workout-duration column; cardio timings are stored on sets as `reps` (seconds).

Envelope fields:

- `schemaVersion` (currently `2`) and `units` (`bodyWeight`/`strengthWeight` in `lb`, cardio `distance` in `mi`, `duration` in seconds, Peloton `output` in `kJ`, swim distance in `yd`).
- `bodyWeight` is a number or `null`. `bodyWeightUnit` is always `"lb"`.
- Each exercise adds `modality` (`strength`, `bodyweight`, `duration`, `cardio_distance`, `cardio_output`, `swim`, `walk`).
- Each set keeps raw `reps` / `weight` / `restIntervalSeconds` and adds decoded fields when inferable (`durationSec`, `distanceMi`, `outputKj`, `paceSecPerMi`, `inclinePct`, `intervalSec`, `distanceYd`, `swimSetCount`, `totalDistanceYd`).

`focus` / `name` must be one of: `Chest / Shoulders / Triceps`, `Back / Biceps`, `Legs`, `Full Body`, `Cardio`, `Other`.

### Create body (`POST`)

Required: `date` (`YYYY-MM-DD`) and `focus` or `name`.

Optional: `notes`, `bodyWeight` (lb, or `null`), `exercises`.

```json
{
  "date": "2026-10-01",
  "focus": "Chest / Shoulders / Triceps",
  "notes": "coach log",
  "bodyWeight": 186.5,
  "exercises": [
    {
      "name": "Bench Press",
      "sets": [
        { "reps": 8, "weight": 185 },
        { "reps": 6, "weight": 195, "restIntervalSeconds": 120 }
      ]
    }
  ]
}
```

Exercises are resolved by catalog `name` (case-insensitive) or `id`. Strength rest defaults to `90` seconds when omitted.

Cardio / special modalities accept decoded fields (same packing as the UI):

- Running: `{ "durationSec": 1800, "distanceMi": 3 }`
- Peloton: `{ "durationSec": 1200, "outputKj": 140 }`
- Walking: `{ "durationSec": 2400, "inclinePct": 3, "paceSecPerMi": 960 }`
- Swimming: `{ "intervalSec": 90, "distanceYd": 50, "swimSetCount": 8 }`
- Core: `{ "durationSec": 180 }`

You can also send the raw `reps` / `weight` / `restIntervalSeconds` fields from a GET response (round-trip safe).

### Update body (`PATCH`)

Any subset of `date`, `focus`/`name`, `notes`, `bodyWeight`. If `exercises` is present it **replaces the full exercise list** (add/edit/remove by sending the desired end state). Typical flow: `GET` the workout, change sets, `PATCH` the exercises array back.

`PUT` is accepted as an alias of `PATCH`.

### Errors

- `400` validation (`{ "error": "..." }`)
- `401` missing/invalid key
- `404` unknown id or a workout owned by someone else
- `500` database failure
- `503` database not configured, or writes cannot resolve a single owner user

### Vercel

1. Open the project on Vercel → **Settings → Environment Variables**
2. Add `WORKOUT_API_KEY` with a long random secret (for example `openssl rand -hex 32`)
3. Add `WORKOUT_API_USER_ID` (Kevin's Auth0 `sub`) so writes are pinned to his account
4. Redeploy so serverless functions pick up the variables

The public UI does not need `WORKOUT_API_KEY`. No new secrets and no database migration.

### curl examples

List a range:

```bash
curl -sS \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts?from=2026-09-01&to=2026-09-20"
```

One day:

```bash
curl -sS \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts?date=2026-10-01"
```

Today (Pacific):

```bash
curl -sS \
  -H "X-Api-Key: $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts/today"
```

Read one workout:

```bash
curl -sS \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts/WORKOUT_ID"
```

Create:

```bash
curl -sS -X POST \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"date":"2026-10-01","focus":"Chest / Shoulders / Triceps","bodyWeight":186.5,"exercises":[{"name":"Bench Press","sets":[{"reps":8,"weight":185},{"reps":6,"weight":185}]}]}' \
  "https://ksworkouts.vercel.app/api/workouts"
```

Update sets (replace exercises):

```bash
curl -sS -X PATCH \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"notes":"changed bench to 155","exercises":[{"name":"Bench Press","sets":[{"reps":8,"weight":155},{"reps":6,"weight":155},{"reps":6,"weight":155},{"reps":6,"weight":185}]}]}' \
  "https://ksworkouts.vercel.app/api/workouts/WORKOUT_ID"
```

Delete:

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $WORKOUT_API_KEY" \
  "https://ksworkouts.vercel.app/api/workouts/WORKOUT_ID"
```

Example GET session fields (raw `reps`/`weight` stay; decoded fields are extra):

```json
{
  "schemaVersion": 2,
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

