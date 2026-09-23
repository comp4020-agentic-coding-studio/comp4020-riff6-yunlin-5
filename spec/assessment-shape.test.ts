import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The assessments page now makes two claims in prose that its figures draw:
// that the three pieces divide the marks between them, and that their spans
// tile the teaching weeks end to end with nothing overlapping and nothing
// uncovered. Both are properties of the content, not of the drawing, so
// either could quietly stop being true after an edit and leave the caption
// asserting something false. assessment-weights.test.ts already guards the
// first sum against the API; this guards the claim the figure adds.

interface ApiNode {
  id: string;
  type: string;
  meta?: Record<string, unknown>;
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as {
  nodes: ApiNode[];
};
const page = readFileSync(resolve("dist/assessments/index.html"), "utf8");

const assessments = api.nodes
  .filter((node) => node.type === "assessments")
  .sort((a, b) => String(a.meta?.due).localeCompare(String(b.meta?.due)));
const lastWeek = Math.max(
  ...api.nodes
    .filter((node) => ["lectures", "sessions"].includes(node.type))
    .map((node) => Number(node.meta?.week)),
);

describe("the assessment figures", () => {
  it("draws every assessment, linked to its brief", () => {
    expect(assessments.length, "no assessments in the built API").toBeGreaterThan(0);

    for (const node of assessments) {
      expect(page, `${node.id} is missing from the figures`).toContain(`/${node.id}/"`);
    }
  });

  it("labels each share with the weight the API carries", () => {
    for (const node of assessments) {
      expect(page, `${node.id}'s weight is not drawn`).toContain(`${node.meta?.weight}%`);
    }
  });

  it("tiles the teaching weeks end to end, with no gap and no overlap", () => {
    // The spans the figure derives: each piece runs from the day after the
    // previous one was handed in, so covered weeks must run 1..lastWeek once.
    const covered: number[] = [];
    let previous = 0;
    for (const node of assessments) {
      const week = Number(node.meta?.week);
      for (let w = previous + 1; w <= week; w++) covered.push(w);
      previous = week;
    }

    const expected = Array.from({ length: lastWeek }, (_, i) => i + 1);
    expect(covered, "assessment spans no longer cover the teaching weeks exactly once").toEqual(
      expected,
    );
  });

  it("orders the shading by due date, so the ramp reads as chronology", () => {
    const positions = assessments.map((node) => page.indexOf(`/${node.id}/"`));

    expect(positions.every((at) => at >= 0), "an assessment never appears").toBe(true);
    expect([...positions].sort((a, b) => a - b), "the figures are out of date order").toEqual(
      positions,
    );
  });
});
