# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Auth0

1. Create a free account at [auth0.com](https://auth0.com)
2. Create a new Application (Regular Web Application)
3. Configure Application Settings:
   - **Allowed Callback URLs**: `http://localhost:3000/auth/callback, https://ksworkouts.vercel.app/auth/callback`
   - **Allowed Logout URLs**: `http://localhost:3000, https://ksworkouts.vercel.app`
   - **Allowed Web Origins**: `http://localhost:3000, https://ksworkouts.vercel.app`

4. Get your Auth0 credentials from **Settings** tab:
   - Domain (just the domain, like `dev-abc123.us.auth0.com`)
   - Client ID
   - Client Secret

## 3. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** to get:
   - Project URL
   - Anon (public) key
   - Service Role key (for server-side operations)

3. Create `.env.local` file:
```env
# Auth0 Configuration
AUTH0_SECRET='use [openssl rand -hex 32] to generate'
APP_BASE_URL='http://localhost:3000'
AUTH0_DOMAIN='YOUR_DOMAIN.auth0.com'
AUTH0_CLIENT_ID='YOUR_CLIENT_ID'
AUTH0_CLIENT_SECRET='YOUR_CLIENT_SECRET'

# Supabase Configuration (all three required for data to load from Supabase)
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key-here'
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

**Important:** The server needs `SUPABASE_SERVICE_ROLE_KEY` to read/write workouts. If it's missing, the app falls back to "mock" mode and no data is loaded from Supabase. In production (e.g. Vercel), add all variables in Project Settings → Environment Variables.

**Generate AUTH0_SECRET:**
```bash
openssl rand -hex 32
```

## 4. Set Up Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Run each migration file in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_auth0_users.sql`
   - `supabase/migrations/003_exercise_usage_tracking.sql`
   - `supabase/migrations/004_update_workout_focus.sql`
3. Run `supabase/seed.sql` to populate exercises

## 5. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 6. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - All Auth0 variables (update `APP_BASE_URL` to `https://ksworkouts.vercel.app`)
   - All Supabase variables
4. Auth0 Application Settings are already updated with production URLs (from step 2)
5. Deploy!

## Troubleshooting: "All my data is missing"

Data can appear empty for a few reasons:

1. **Supabase not configured** – If `NEXT_PUBLIC_SUPABASE_URL` and keys are missing or still placeholder values, the app runs in "mock" mode: the server can’t store data, but the **client** stores workouts in your browser’s **localStorage**. So:
   - Log a workout first; then Dashboard, History, and Progress will show that data (from localStorage).
   - Data is per-browser and per-device; clearing site data or using another browser will show empty again until you configure Supabase.

2. **Not signed in** – Workouts are tied to your Auth0 user. If you’re not logged in (or the session isn’t loading), the server won’t return any workouts.

3. **Supabase configured but empty** – New project, wrong user ID, or RLS can result in no rows. Ensure migrations and seed have been run and that you’re using the same Auth0 user that created the data.

## Features Implemented

✅ User authentication (signup/login)  
✅ Workout logging with muscle group focus  
✅ Exercise selection filtered by focus  
✅ Sets/reps/weight tracking  
✅ Workout history view  
✅ Progress charts (weekly/monthly)  
✅ Personal records tracking  
✅ Responsive design  

## Database Schema

- `muscle_groups` - Predefined muscle groups
- `exercises` - Exercise library organized by muscle group
- `workouts` - User workout sessions
- `workout_exercises` - Sets/reps/weight for each exercise in a workout

All tables have Row Level Security (RLS) enabled for data privacy.

