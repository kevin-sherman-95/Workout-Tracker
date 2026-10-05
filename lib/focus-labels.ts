import { isWorkoutFocus, type WorkoutFocus } from "@/lib/types";

/**
 * Legacy stored focus strings that map onto the current canonical names.
 * Rows written before the Push/Pull rename still use these values.
 */
const LEGACY_FOCUS_ALIASES: ReadonlyArray<readonly [string, WorkoutFocus]> = [
  ["Chest / Shoulders / Triceps", "Push"],
  ["Chest/Shoulders/Triceps", "Push"],
  ["Chest / Triceps / Shoulders", "Push"],
  ["Chest/Triceps/Shoulders", "Push"],
  ["Back / Biceps", "Pull"],
  ["Back/Biceps", "Pull"],
];

function normalizeFocusKey(focus: string): string {
  return focus
    .toLowerCase()
    .replace(/\s*\/\s*/g, "/")
    .replace(/\s+/g, " ")
    .trim();
}

const LEGACY_FOCUS_BY_KEY = new Map(
  LEGACY_FOCUS_ALIASES.map(([alias, canonical]) => [
    normalizeFocusKey(alias),
    canonical,
  ])
);

/** Token fallback for similar chest/tri/shoulders or back/bi labels. */
function resolveSimilarFocus(focus: string): WorkoutFocus | null {
  const tokens = new Set(
    focus
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean)
  );
  const has = (...needles: string[]) => needles.some((n) => tokens.has(n));
  const chest = has("chest");
  const tri = has("triceps", "tricep", "tri");
  const shoulders = has("shoulders", "shoulder");
  const back = has("back");
  const bi = has("biceps", "bicep", "bi");

  if (chest && (tri || shoulders) && !back) return "Push";
  if (back && bi && !chest) return "Pull";
  return null;
}

/** Map a stored or submitted focus onto the current canonical value, if known. */
export function resolveWorkoutFocus(focus: string): WorkoutFocus | null {
  const trimmed = focus.trim();
  if (isWorkoutFocus(trimmed)) return trimmed;
  const fromAlias = LEGACY_FOCUS_BY_KEY.get(normalizeFocusKey(trimmed));
  if (fromAlias) return fromAlias;
  return resolveSimilarFocus(trimmed);
}

/** Display label for UI and API reads. Legacy Push/Pull rows show as Push/Pull. */
export function displayWorkoutFocus(focus: string): string {
  return resolveWorkoutFocus(focus) ?? focus;
}

export function workoutFocusesMatch(a: string, b: string): boolean {
  return displayWorkoutFocus(a) === displayWorkoutFocus(b);
}

/** Canonical name plus legacy strings still stored in existing rows. */
export function storedFocusValues(focus: string): string[] {
  const canonical = resolveWorkoutFocus(focus) ?? focus.trim();
  const values = new Set<string>([canonical]);
  for (const [alias, mapped] of LEGACY_FOCUS_ALIASES) {
    if (mapped === canonical) values.add(alias);
  }
  return [...values];
}

/** Short labels for "Repeat last Push/Pull/Legs/Cardio". */
export function focusShortName(focus: WorkoutFocus): string {
  switch (focus) {
    case "Push":
      return "Push";
    case "Pull":
      return "Pull";
    case "Legs":
      return "Legs";
    case "Full Body":
      return "Full Body";
    case "Cardio":
      return "Cardio";
    case "Other":
      return "Other";
    default: {
      const _exhaustive: never = focus;
      return _exhaustive;
    }
  }
}
