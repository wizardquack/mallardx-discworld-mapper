# Mallard Discworld Mapper

Read-only Quow-parity minimap plugin for [Mallard](https://github.com/<TBD>/mallard) — Discworld worlds only.

## Status

v0.1.0 — first release. Renders the current map tile + player marker via `room.info` GMCP frames. Hover tooltip + zoom controls included. Click-to-act, speedwalk, bookmarks, hotspots, NPC/item search, and ASCII surround-map are deliberately out of scope; see the design spec linked below.

## Attribution

This plugin redistributes:

- Map PNG bundle (`ui/maps/*.png`) — © Quow, used with explicit written permission (correspondence dated YYYY-MM-DD; placeholder until permission lands).
- Room dictionary (`ui/data/rooms.js`) — derived from Quow's `_quowmap_database.db`, same permission.

Source: https://quow.co.uk/ (`quow_cowbar.zip`). The data is converted at build time by `scripts/build-room-db.mjs`; original files are not redistributed verbatim.

## Development

```sh
npm install
npm run build:rooms        # one-shot: fetches Quow's zip, emits ui/data/rooms.js + ui/maps/*.png
npm test                   # vitest unit tests
npm run plugin:reinstall   # packages .mallardx + installs to Mallard's dev plugin dir
```

Conventional checkout layout (sibling of mallard):

```
~/code/mallard/
~/code/mallard-discworld-mapper/   # this repo
```

The install script resolves Mallard's plugin-install dir via the platform app-data path; the maintainer can clone this repo anywhere.

## Design

See `mallard/docs/superpowers/specs/2026-05-20-plan-9b-discworld-mapper-design.md` for the full design rationale, deferral table, and open questions.
