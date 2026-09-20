import assert from "assert";
import {
  apiKeysMatch,
  extractProvidedApiKey,
  isValidIsoDate,
} from "../lib/workout-api-helpers";

assert.strictEqual(isValidIsoDate("2026-09-20"), true);
assert.strictEqual(isValidIsoDate("2026-02-29"), false);
assert.strictEqual(isValidIsoDate("2024-02-29"), true);
assert.strictEqual(isValidIsoDate("2026-13-01"), false);
assert.strictEqual(isValidIsoDate("09-20-2026"), false);
assert.strictEqual(isValidIsoDate(""), false);

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

console.log("workout-api helper checks passed");
