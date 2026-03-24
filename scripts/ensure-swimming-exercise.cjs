/**
 * Inserts Swimming under Cardio if missing (uses SUPABASE_SERVICE_ROLE_KEY from .env.local).
 * Run: node scripts/ensure-swimming-exercise.cjs
 */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(__dirname, "..", ".env.local");
  const env = {};
  if (!fs.existsSync(envPath)) {
    console.error("Missing .env.local — add NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    env[key] = val;
  }
  return env;
}

async function main() {
  const env = loadEnvLocal();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("Need NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: cardio, error: mgErr } = await supabase
    .from("muscle_groups")
    .select("id")
    .eq("name", "Cardio")
    .single();

  if (mgErr || !cardio) {
    console.error("Could not load Cardio muscle group:", mgErr?.message || mgErr);
    process.exit(1);
  }

  const { data: existing } = await supabase
    .from("exercises")
    .select("id, name")
    .eq("name", "Swimming")
    .eq("muscle_group_id", cardio.id)
    .maybeSingle();

  if (existing) {
    console.log("Swimming already exists (id:", existing.id + "). No change.");
    return;
  }

  const { data: inserted, error: insErr } = await supabase
    .from("exercises")
    .insert({ name: "Swimming", muscle_group_id: cardio.id })
    .select("id, name")
    .single();

  if (insErr) {
    console.error("Insert failed:", insErr.message || insErr);
    process.exit(1);
  }

  console.log("Inserted Swimming under Cardio (id:", inserted.id + "). Refresh the log workout page.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
