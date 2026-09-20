import type { WorkoutFocus } from "@/lib/types";

/** Short labels for "Repeat last Push/Pull/Legs/Cardio". */
export function focusShortName(focus: WorkoutFocus): string {
  switch (focus) {
    case "Chest / Shoulders / Triceps":
      return "Push";
    case "Back / Biceps":
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
