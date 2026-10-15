const { test } = require("node:test");
const assert = require("node:assert/strict");

test("reported danger always requires critical priority and human review", async () => {
  const { risk } = await import("../src/logic.js");
  const result = risk({ ongoingDanger: true, severity: 1, peopleAffected: 0 });
  assert.equal(result.priority, "Critical");
  assert.equal(result.requiresReview, true);
});

test("multiple risk factors increase the score without exceeding 100", async () => {
  const { risk } = await import("../src/logic.js");
  const baseline = risk({ severity: 1 });
  const result = risk(
    {
      severity: 5,
      ongoingDanger: true,
      peopleAffected: 100,
      timeSensitive: true,
      worsening: true,
      createdAt: "2020-01-01",
      slaDue: "2020-01-02",
    },
    new Date("2026-01-01"),
  );
  assert.ok(result.score > baseline.score);
  assert.equal(result.score, 100);
  assert.ok(result.factors.includes("SLA overdue"));
});

test("fallback classification remains transparent and requires review", async () => {
  const { fallback } = await import("../src/logic.js");
  assert.equal(fallback("A broken water pipe").category, "Water Supply");
  const uncertain = fallback("An unclear issue");
  assert.equal(uncertain.category, "Other");
  assert.equal(uncertain.confidence, null);
  assert.equal(uncertain.requiresReview, true);
  assert.equal(uncertain.source, "rules-fallback");
});

test("assistant asks for missing details and accepts complete details", async () => {
  const { suggestMissing } = await import("../src/logic.js");
  assert.equal(suggestMissing({}).length, 3);
  assert.deepEqual(
    suggestMissing({
      description: "Detailed incident report ".repeat(4),
      location: "School",
      peopleAffected: 10,
    }),
    [],
  );
});
