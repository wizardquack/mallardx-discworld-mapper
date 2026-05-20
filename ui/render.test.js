import { describe, it, expect } from "vitest";
import { mapDidChange, headerText, markerPixel } from "./render.js";

const MAPS = {
  1:  { file: "am.png",        name: "Ankh-Morpork", maxX: 1354, maxY: 1256 },
  99: { file: "discwhole.png", name: "Whole Disc",   maxX: 5809, maxY: 5000 },
};

describe("mapDidChange", () => {
  it("null → known is a change", () => {
    expect(mapDidChange(null, { mapId: 1 })).toBe(true);
  });
  it("known → null (unknown) is a change", () => {
    expect(mapDidChange({ mapId: 1 }, null)).toBe(true);
  });
  it("same mapId is not a change", () => {
    expect(mapDidChange({ mapId: 1 }, { mapId: 1 })).toBe(false);
  });
  it("different mapId is a change", () => {
    expect(mapDidChange({ mapId: 1 }, { mapId: 99 })).toBe(true);
  });
  it("null → null is not a change", () => {
    expect(mapDidChange(null, null)).toBe(false);
  });
});

describe("headerText", () => {
  it("formats a known room as '<map name> — <short>'", () => {
    const r = { mapId: 1, short: "Outside the Mended Drum" };
    expect(headerText(MAPS, r)).toBe("Ankh-Morpork — Outside the Mended Drum");
  });
  it("formats a terrain-resolved room with no short as just the map name", () => {
    const r = { mapId: 99, short: null };
    expect(headerText(MAPS, r)).toBe("Whole Disc");
  });
  it("formats unknown (null) as 'Unknown location'", () => {
    expect(headerText(MAPS, null)).toBe("Unknown location");
  });
});

describe("markerPixel", () => {
  // Stub image with natural pixel size; we don't decode a real PNG.
  const img = { naturalWidth: 1354, naturalHeight: 1256 };
  const mapMeta = MAPS[1]; // matches the stub

  it("returns the resolved x/y when image natural size equals map max", () => {
    expect(markerPixel(img, { x: 720, y: 800 }, mapMeta)).toEqual({ px: 720, py: 800 });
  });
  it("scales proportionally when image natural size differs from map max", () => {
    // Image rendered at half map data-space → pixel coords halved.
    const half = { naturalWidth: 677, naturalHeight: 628 };
    const { px, py } = markerPixel(half, { x: 720, y: 800 }, mapMeta);
    expect(px).toBe(Math.round(720 * (677 / 1354)));
    expect(py).toBe(Math.round(800 * (628 / 1256)));
  });
  it("clamps to image bounds for out-of-range resolved coords", () => {
    expect(markerPixel(img, { x: -10, y: 9999 }, mapMeta)).toEqual({ px: 0, py: 1256 });
  });
});
