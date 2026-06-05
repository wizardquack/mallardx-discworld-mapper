# Mallard Discworld Mapper

A minimal minimap plugin for Discworld.

## Status

Early release. Renders the current map tile + player marker via `room.info` GMCP frames. Hover tooltip + zoom controls included.

Click-to-act, speedwalk, bookmarks, hotspots, NPC/item search, and ASCII surround-map are deliberately out of scope for now. It's just minimal read-only functionality to show you where you are.

## Attribution

This plugin redistributes:

- Map PNG bundle (`ui/maps/*.png`) — Quow
- Room dictionary (`ui/data/rooms.js`) — derived from Quow's `_quowmap_database.db`, same permission.

Source: https://quow.co.uk/ (`quow_cowbar.zip`). The data is converted at build time by `scripts/build-room-db.mjs`, but original files are redistributed as well per Quow's request.

## Development info: building the room database

```sh
npm install
npm run build:rooms   # fetches Quow's zip, emits ui/data/rooms.js + ui/maps/*.png
npm test              # vitest unit tests
```
