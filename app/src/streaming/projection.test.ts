import { describe, expect, it } from "vitest";
import { projectStreamingPoint } from "./projection";

describe("projectStreamingPoint", () => {
  it("conserve les axes sans rotation", () => {
    expect(projectStreamingPoint(7, 7, 7, 0, 0)).toEqual({
      horizontal: 3.5,
      vertical: 3.5,
      depth: 3.5,
    });
  });

  it("fait pivoter horizontalement les axes x et z", () => {
    const projected = projectStreamingPoint(7, 3.5, 3.5, Math.PI / 2, 0);
    expect(projected.horizontal).toBeCloseTo(0, 10);
    expect(projected.vertical).toBeCloseTo(0, 10);
    expect(projected.depth).toBeCloseTo(3.5, 10);
  });
});
