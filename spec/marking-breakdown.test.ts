import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// A drawn share can disagree with the number printed beside it and nothing
// would notice --- the meter is CSS, so a wrong scale still renders happily.
// These check the drawing against the API the build emits: every criterion
// present, and every meter filled to exactly the weight it claims. The
// criteria summing to 100 is already the content schema's job, so it isn't
// re-checked here.

interface Criterion {
  name: string;
  weight: number;
}

interface ApiNode {
  id: string;
  type: string;
  meta?: { marking?: { mode: string; criteria?: Criterion[] } };
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as {
  nodes: ApiNode[];
};

const weighted = api.nodes.filter(
  (node) => node.type === "assessments" && node.meta?.marking?.mode === "weighted",
);
const pageOf = (id: string) => readFileSync(resolve("dist", id, "index.html"), "utf8");

describe("the marking breakdown", () => {
  it("has weighted assessments to draw", () => {
    expect(weighted.length, "no weighted marking models in the built API").toBeGreaterThan(0);
  });

  it("names every criterion the API carries", () => {
    for (const node of weighted) {
      const page = pageOf(node.id);
      for (const criterion of node.meta?.marking?.criteria ?? []) {
        expect(page, `${node.id} never names ${criterion.name}`).toContain(criterion.name);
      }
    }
  });

  it("fills each meter to the weight printed beside it", () => {
    for (const node of weighted) {
      const page = pageOf(node.id);
      const drawn = [...page.matchAll(/--share:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
      const declared = (node.meta?.marking?.criteria ?? []).map((c) => c.weight);

      expect(drawn, `${node.id}'s meters do not match its declared weights`).toEqual(declared);
    }
  });

  it("leaves a holistically marked assessment without a breakdown to draw", () => {
    const holistic = api.nodes.filter(
      (node) => node.type === "assessments" && node.meta?.marking?.mode === "holistic",
    );

    for (const node of holistic) {
      expect(pageOf(node.id), `${node.id} draws a meter it has no criteria for`).not.toContain(
        "--share:",
      );
    }
  });
});
