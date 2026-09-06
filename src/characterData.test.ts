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

  it("explains every displayed character statistic", () => {
    expect(Object.values(RESOURCE_USES).every(Boolean)).toBe(true);
    expect(Object.values(RESISTANCE_USES)).toHaveLength(3);
    expect(DEFAULT_SKILLS.every(skill => Boolean(SKILL_USES[skill.id]))).toBe(true);
  });
});
