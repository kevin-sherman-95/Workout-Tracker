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

