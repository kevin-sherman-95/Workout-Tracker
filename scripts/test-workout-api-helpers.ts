import assert from "assert";
import {
  apiKeysMatch,
  extractProvidedApiKey,
  isValidIsoDate,
  isValidUuid,
  parseWorkoutListQuery,
} from "../lib/workout-api-helpers";

assert.strictEqual(isValidIsoDate("2026-09-20"), true);
assert.strictEqual(isValidIsoDate("2026-02-29"), false);
assert.strictEqual(isValidIsoDate("2024-02-29"), true);
assert.strictEqual(isValidIsoDate("2026-13-01"), false);
assert.strictEqual(isValidIsoDate("09-20-2026"), false);
assert.strictEqual(isValidIsoDate(""), false);

assert.strictEqual(isValidUuid("6e0d261c-86a2-4383-89f0-9162c1c10662"), true);
assert.strictEqual(isValidUuid("6E0D261C-86A2-4383-89F0-9162C1C10662"), true);
assert.strictEqual(isValidUuid("not-a-uuid"), false);
assert.strictEqual(isValidUuid("w-1"), false);
assert.strictEqual(isValidUuid(""), false);
assert.strictEqual(isValidUuid("6e0d261c86a2438389f09162c1c10662"), false);

const headerMap = (obj: Record<string, string>) => ({
  get(name: string) {
    return obj[name.toLowerCase()] ?? null;
  },
});

assert.strictEqual(
  extractProvidedApiKey(headerMap({ authorization: "Bearer secret-one" })),
  "secret-one"
);
assert.strictEqual(
  extractProvidedApiKey(headerMap({ "x-api-key": "secret-two" })),
  "secret-two"
);
assert.strictEqual(
  extractProvidedApiKey(headerMap({ authorization: "Basic nope" })),
  undefined
);

assert.strictEqual(apiKeysMatch("abc", "abc"), true);
assert.strictEqual(apiKeysMatch("abc", "abd"), false);
assert.strictEqual(apiKeysMatch(undefined, "abc"), false);
assert.strictEqual(apiKeysMatch("abc", undefined), false);
assert.strictEqual(apiKeysMatch("ab", "abc"), false);

const range = parseWorkoutListQuery("2026-09-01", "2026-09-20", null);
assert.ok(!("error" in range));
assert.strictEqual(range.from, "2026-09-01");
assert.strictEqual(range.to, "2026-09-20");

const oneDay = parseWorkoutListQuery(null, null, "2026-09-20");
assert.ok(!("error" in oneDay));
assert.strictEqual(oneDay.from, "2026-09-20");
assert.strictEqual(oneDay.to, "2026-09-20");

assert.strictEqual(
  (parseWorkoutListQuery("2026-09-01", null, "2026-09-20") as { error: string }).error,
  "Use date or from/to, not both."
);
assert.strictEqual(
  (parseWorkoutListQuery("2026-09-21", "2026-09-20", null) as { error: string }).error,
  "from must be on or before to."
);

console.log("workout-api helper checks passed");
