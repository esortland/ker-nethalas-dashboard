import { describe, expect, it } from "vitest";
import { MASTERY_OPTIONS, RESISTANCE_USES, RESOURCE_USES, SKILL_USES } from "./characterData";
import { DEFAULT_SKILLS } from "./campaign";

describe("character reference data", () => {
  it("offers 22 unique Masteries including the two Book of Masteries additions", () => {
    const names = MASTERY_OPTIONS.map(option => option.name);
    expect(names).toHaveLength(22);
    expect(new Set(names).size).toBe(22);
    expect(names).toContain("Fatebender");
    expect(names).toContain("Caustic Blade");
  });

  it("includes setup data and page references for all 20 Gravebound core Masteries", () => {
    const core = MASTERY_OPTIONS.filter(option => option.pages !== "Book of Masteries");
    expect(core).toHaveLength(20);
    expect(core.every(option => option.featureName && option.featureSummary && option.tierOneAbility && option.tierOneSummary)).toBe(true);
  });

  it("explains every displayed character statistic", () => {
    expect(Object.values(RESOURCE_USES).every(Boolean)).toBe(true);
    expect(Object.values(RESISTANCE_USES)).toHaveLength(3);
    expect(DEFAULT_SKILLS.every(skill => Boolean(SKILL_USES[skill.id]))).toBe(true);
  });
});
