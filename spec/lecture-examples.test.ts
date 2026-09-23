import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// Every week's lecture carries a worked example: one named instance, walked
// through to what the omission cost and what it bought. The course rule this
// protects is CLAUDE.md's --- a week whose example could belong to any course
// hasn't been designed, only slotted in --- so the checks are that the section
// exists, that it is argued rather than merely mentioned, and that no two
// weeks reach for the same instance.

const dir = resolve("src/content/lectures");
const lectures = readdirSync(dir)
  .filter((file) => file.endsWith(".md"))
  .map((file) => ({ id: file.replace(/\.md$/, ""), body: readFileSync(resolve(dir, file), "utf8") }));

const exampleOf = (body: string) => body.split("## Example")[1]?.split(/^## /m)[0] ?? "";

describe("lecture examples", () => {
  it("gives every week one", () => {
    expect(lectures.length, "no lectures found").toBeGreaterThan(0);

    for (const lecture of lectures) {
      expect(lecture.body, `${lecture.id} has no worked example`).toContain("## Example");
    }
  });

  it("argues each one through to what the cut cost and what it bought", () => {
    for (const lecture of lectures) {
      const example = exampleOf(lecture.body);
      expect(example.length, `${lecture.id}'s example is too thin to be an argument`).toBeGreaterThan(400);
      expect(/\bcosts?\b/i.test(example), `${lecture.id}'s example never says what it cost`).toBe(true);
      expect(/\bbuys|bought\b/i.test(example), `${lecture.id}'s example never says what it bought`).toBe(true);
    }
  });

  it("never reuses a week's example in another week", () => {
    // The lead sentence names the instance; two weeks opening on the same one
    // would mean a week borrowed rather than designed its case.
    const openers = lectures.map((lecture) => {
      const example = exampleOf(lecture.body).trim();
      return example.slice(0, 60).replace(/\s+/g, " ");
    });

    expect(new Set(openers).size, "two weeks open their example the same way").toBe(openers.length);
  });
});
