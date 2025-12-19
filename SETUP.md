# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Project Settings > API** to get:
   - Project URL
   - Anon (public) key

3. Create `.env.local` file:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Set Up Database

1. In Supabase Dashboard, go to **SQL Editor**
2. Run `supabase/migrations/001_initial_schema.sql` to create tables
3. Run `supabase/seed.sql` to populate exercises

## 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

## 5. Deploy to Vercel

1. Push code to GitHub
2. Import project in Vercel
3. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy!

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

