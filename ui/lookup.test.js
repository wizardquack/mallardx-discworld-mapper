import { describe, it, expect } from "vitest";
import { lookupRoom, terrainPosition, resolveRoom } from "./lookup.js";

const FIXTURE = {
  rooms: {
    AMDrumOutside: [1, 720, 800, "Outside the Mended Drum"],
    BPDocks:       [17, 540, 320, "Bes Pelargic Docks"],
  },
  maps: {
    1:  { file: "am.png",        name: "Ankh-Morpork", maxX: 1354, maxY: 1256 },
    17: { file: "bp.png",        name: "Bes Pelargic", maxX: 1316, maxY: 921 },
    99: { file: "discwhole.png", name: "Whole Disc",   maxX: 5809, maxY: 5000 },
  },
  terrain: {
    hubX: 2450, hubY: 2350, scaleX: 300000, scaleY: 338000, viewportMapId: 99,
  },
};

describe("lookupRoom", () => {
  it("returns a structured object for a known identifier", () => {
    expect(lookupRoom(FIXTURE.rooms, "AMDrumOutside")).toEqual({
      mapId: 1, x: 720, y: 800, short: "Outside the Mended Drum",
    });
  });
  it("returns null for an unknown identifier", () => {
    expect(lookupRoom(FIXTURE.rooms, "NotARealRoom")).toBeNull();
  });
  it("returns null for a missing/nil identifier", () => {
    expect(lookupRoom(FIXTURE.rooms, undefined)).toBeNull();
    expect(lookupRoom(FIXTURE.rooms, null)).toBeNull();
  });
});

describe("terrainPosition", () => {
  const t = FIXTURE.terrain;

  it("applies hub + scale at an unclamped point", () => {
    // Choose raw (x, y) = (1700, 3500): central x-band but y >= 3200,
    // so no clamp rule fires and we can observe the unclamped formula output.
    //   tx = (1700 - hubX) * scaleX = -750 * 300_000 = -225_000_000
    //   ty = (hubY - 3500) * scaleY = -1150 * 338_000 = -388_700_000
    expect(terrainPosition(t, -225_000_000, -388_700_000))
      .toEqual({ mapId: 99, x: 1700, y: 3500 });
  });

  it("applies scale to non-zero tx/ty at unclamped points", () => {
    // Bump x by 2 to 1702, keep y=3500 (still unclamped).
    //   tx = (1702 - hubX) * scaleX = -748 * 300_000 = -224_400_000
    expect(terrainPosition(t, -224_400_000, -388_700_000))
      .toEqual({ mapId: 99, x: 1702, y: 3500 });
    // Hold x=1700, drop y by 1 to 3499 (still unclamped, y not < 3200).
    //   ty = (hubY - 3499) * scaleY = -1149 * 338_000 = -388_362_000
    expect(terrainPosition(t, -225_000_000, -388_362_000))
      .toEqual({ mapId: 99, x: 1700, y: 3499 });
  });

  it("clamps x to 0 when negative", () => {
    // Choose tx so hubX + tx/scaleX < 0.  tx = -(hubX+1)*scaleX = -2451*300000
    expect(terrainPosition(t, -2451 * 300000, 0).x).toBe(0);
  });

  it("clamps x to 5809 when above max", () => {
    expect(terrainPosition(t, 10000 * 300000, 0).x).toBe(5809);
  });

  it("clamps y to 5000 when above max", () => {
    // ty very negative drives y up (Quow's formula subtracts ty/scale)
    expect(terrainPosition(t, 0, -10000 * 338000).y).toBe(5000);
  });

  it("clamps y to 2800 when y<2800 and x<1600", () => {
    // tx=0 → x=hubX=2450; that's not <1600. Use a tx that gives x≈1000.
    // x = hubX + tx/scaleX < 1600 → tx/scaleX < -850 → tx < -850*300000
    // ty very large positive → y small. y=0 (above max-y cap not hit, ty positive lowers y)
    // We want y<2800 (raw), so y = hubY - ty/scaleY < 2800 → ty/scaleY > -450 ...
    // Easier: build inputs giving raw (x,y) = (1000, 2000); expect clamp to (1000, 2800).
    // raw x=1000 ⇒ tx = (1000-hubX)*scaleX = -1450 * 300000
    // raw y=2000 ⇒ ty = (hubY-2000)*scaleY = 350 * 338000
    const tx = (1000 - t.hubX) * t.scaleX;
    const ty = (t.hubY - 2000) * t.scaleY;
    expect(terrainPosition(t, tx, ty)).toEqual({ mapId: 99, x: 1000, y: 2800 });
  });

  it("clamps y to 3200 when y<3200 and 1600<=x<3400", () => {
    // raw (x,y) = (2000, 3000) → clamped to (2000, 3200)
    const tx = (2000 - t.hubX) * t.scaleX;
    const ty = (t.hubY - 3000) * t.scaleY;
    expect(terrainPosition(t, tx, ty)).toEqual({ mapId: 99, x: 2000, y: 3200 });
  });

  it("clamps y to 0 when y<0 and x>=3400", () => {
    // raw (x,y) = (4000, -50) → clamped to (4000, 0)
    const tx = (4000 - t.hubX) * t.scaleX;
    const ty = (t.hubY - (-50)) * t.scaleY;
    expect(terrainPosition(t, tx, ty)).toEqual({ mapId: 99, x: 4000, y: 0 });
  });
});

describe("resolveRoom", () => {
  it("returns DB-resolved position when identifier is in the dictionary", () => {
    expect(resolveRoom(FIXTURE, { identifier: "AMDrumOutside", terrain: 0, tx: 0, ty: 0 })).toEqual({
      mapId: 1, x: 720, y: 800, short: "Outside the Mended Drum",
    });
  });
  it("returns procedural terrain position when identifier missing and terrain==1", () => {
    // Same unclamped (1700, 3500) point as the terrainPosition baseline.
    const r = resolveRoom(FIXTURE, { identifier: "InTheWilds", terrain: 1, tx: -225_000_000, ty: -388_700_000 });
    expect(r).toEqual({ mapId: 99, x: 1700, y: 3500, short: null });
  });
  it("returns null when identifier missing and terrain==0", () => {
    expect(resolveRoom(FIXTURE, { identifier: "Mystery", terrain: 0 })).toBeNull();
  });
  it("returns null when frame has no identifier and no terrain", () => {
    expect(resolveRoom(FIXTURE, {})).toBeNull();
  });
});
