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

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL='https://your-project.supabase.co'
NEXT_PUBLIC_SUPABASE_ANON_KEY='your-anon-key-here'
SUPABASE_SERVICE_ROLE_KEY='your-service-role-key'
```

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

