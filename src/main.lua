-- Discworld Mapper — Plan #9b flagship plugin.
--
-- Thin pass-through: room.info GMCP frames → custom-HTML panel iframe.
-- All map data, lookup, and canvas rendering live in ui/mapper.js + helpers.
-- See the design spec for the lookup-in-iframe rationale.

local panel = mud.panel("map")
local last_payload = nil

local function post_room(payload)
  panel:post("room_info", {
    identifier = payload.identifier,
    name       = payload.name,
    terrain    = payload.terrain,
    tx         = payload.tx,
    ty         = payload.ty,
  })
end

gmcp.on("room.info", function(payload)
  if type(payload) ~= "table" then return end
  last_payload = payload
  post_room(payload)
end)

-- Iframe-ready handshake (custom-HTML panels use "ready"; the "__ready__"
-- name is reserved for Plan #8a template panels). Replay last-known on
-- iframe re-mount so a reload mid-session repaints immediately.
panel:on_message("ready", function()
  if last_payload then post_room(last_payload) end
end)
