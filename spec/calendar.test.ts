import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The calendar is the only page that claims to show the whole semester at
// once, so the thing worth protecting is completeness, not markup: a dated
// entry that exists anywhere in the course but never reaches this page turns
// the claim into a lie, and nothing else would catch it --- the grids each
// only promise their own collection. Asserted against the built HTML and the
// built API rather than the component, so the contract survives a rewrite of
// how the page is drawn.

interface ApiNode {
  id: string;
  type: string;
  title: string;
  meta?: Record<string, unknown>;
}

const api = JSON.parse(readFileSync(resolve("dist/api/index.json"), "utf8")) as {
  nodes: ApiNode[];
};
const page = readFileSync(resolve("dist/calendar/index.html"), "utf8");

const dated = api.nodes.filter((node) => ["lectures", "sessions", "assessments"].includes(node.type));
const weekOf = (node: ApiNode) => Number(node.meta?.week);
const weeks = [...new Set(dated.map(weekOf))].sort((a, b) => a - b);

describe("the course calendar", () => {
  it("links every dated lecture, seminar and assessment", () => {
    expect(dated.length, "no dated nodes in the built API").toBeGreaterThan(0);

    for (const node of dated) {
      expect(page, `${node.id} is missing from the calendar`).toContain(`/${node.id}/"`);
    }
  });

  it("gives every teaching week a row, including the ones holding nothing", () => {
    const rows = [...page.matchAll(/<th scope="row"[^>]*>(\d+)<\/th>/g)].map((m) => Number(m[1]));

    expect(rows, "calendar week rows do not match the weeks the course defines").toEqual(weeks);
  });

  it("reads down the page in week order", () => {
    const positions = weeks.map((week) => {
      const node = dated.find((candidate) => weekOf(candidate) === week);
      return page.indexOf(`/${node?.id}/"`);
    });

    expect(positions.every((at) => at >= 0), "a week's first entry never appears").toBe(true);
    expect([...positions].sort((a, b) => a - b), "weeks appear out of order").toEqual(positions);
  });

  it("marks an empty cell rather than dropping it, so a quiet week stays legible", () => {
    const seminarWeeks = new Set(dated.filter((node) => node.type === "sessions").map(weekOf));
    const quiet = weeks.filter((week) => !seminarWeeks.has(week));
    // Read the column's own name off the page: the site renames seminars in
    // site-config, and the test should follow that rename rather than break on it.
    const columns = [...page.matchAll(/<th scope="col"[^>]*>([^<]+)<\/th>/g)].map((m) => m[1]);
    const seminarColumn = columns[2] ?? "";
    const announced = page.split(`No ${seminarColumn.toLowerCase()} this week`).length - 1;

    expect(quiet.length, "no seminar-free weeks to check").toBeGreaterThan(0);
    expect(
      announced,
      "every seminar-free week needs its blank announced to a screen reader, not just styled",
    ).toBe(quiet.length);
  });
});
