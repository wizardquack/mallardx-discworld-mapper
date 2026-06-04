# Mallard Discworld Mapper

Read-only Quow-parity minimap plugin — Discworld worlds only.

## Status

v0.1.0 — first release. Renders the current map tile + player marker via `room.info` GMCP frames. Hover tooltip + zoom controls included. Click-to-act, speedwalk, bookmarks, hotspots, NPC/item search, and ASCII surround-map are deliberately out of scope.

## Attribution

This plugin redistributes:

- Map PNG bundle (`ui/maps/*.png`) — © Quow, used with explicit written permission (correspondence dated 2026-05-20).
- Room dictionary (`ui/data/rooms.js`) — derived from Quow's `_quowmap_database.db`, same permission.

Source: https://quow.co.uk/ (`quow_cowbar.zip`). The data is converted at build time by `scripts/build-room-db.mjs`; original files are not redistributed verbatim.

## Building the room database

```sh
npm install
npm run build:rooms   # fetches Quow's zip, emits ui/data/rooms.js + ui/maps/*.png
npm test              # vitest unit tests
```
