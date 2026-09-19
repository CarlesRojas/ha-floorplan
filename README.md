# floorplan-3d

Custom Lovelace card for Home Assistant: an interactive 3D model of the flat with lights, blinds and sensors bound to entities. React + Three.js, built with Vite into a single `dist/card.js`.

## Development

Requires a Home Assistant instance running in Docker with a `compose.yaml`.

### Day to day: dev server with live reload

Home Assistant caches files under `/local` aggressively, so during development the card is served from the Vite dev server instead.

```bash
pnpm install
pnpm dev
```

In Home Assistant go to Settings > Dashboards > three-dot menu (top right) > Resources and add:

- URL: `http://localhost:5173/src/dev/entry.ts`
- Type: JavaScript module

Every save rebuilds and reloads the dashboard. No cache busting needed. Keep only one of the two resources (dev server or `/local`) enabled at a time, otherwise the element gets registered twice.

### Production build into Home Assistant

This is what the mini PC will use. It also works locally to test the real bundle.

```bash
pnpm build
```

Mount `dist/` into Home Assistant. In `compose.yaml`, add a volume under the Home Assistant service, next to the existing config volume:

```yaml
volumes:
  - ./config:/config
  - ${HOME}/Documents/Repos/ha-floorplan/dist:/config/www/floorplan-3d
```

Then:

```bash
docker compose up -d
docker compose exec homeassistant ls /config/www/floorplan-3d
```

You should see `card.js`. If Home Assistant was started before `/config/www` existed, restart it once so it serves `/local/`.

Register `/local/floorplan-3d/card.js?v=1` as a JavaScript module resource. Bump `?v=` after each new build so browsers pick it up. `pnpm watch` rebuilds `dist/card.js` on change if you want to test the bundle continuously.

### Add the card

Create a dashboard, Edit, Add card. Search "Floorplan 3D". The card opens with a visual editor where you draw the rooms. You can also write the config by hand:

## Editor

The card's visual editor is a top-down drawing tool. Open it from the card's edit dialog.

It opens fullscreen. Save & Close keeps the edits and Discard restores the state from when it opened, leaving an Open editor button in the dialog. The cube toolbar button (P) opens a floating live 3D preview of the card, with the card's aspect ratio. Drag it by the top left handle, resize it from the bottom right one, close it with the top right one.

- Draw room (D): click to place corners, click the first corner or press Enter to close.
- Select (V): click a room to select it, drag corners to move them, drag edges to resize, drag a room to move it. Right click a corner, edge, room or the canvas for a menu: delete corner, add corner, delete room, fit view.
- Fit view (F), drag empty space to pan, wheel to zoom.
- Corners snap to a 20 cm grid and to other rooms' corners and wall lines.
- Rooms never overlap. While dragging, the room follows the pointer and turns red where it would overlap. On release it lands on the nearest valid position, sliding along the free axis. A corner cannot be drawn inside a room or through one.

Each room in the list can be named and linked to a Home Assistant area. An area can be linked to one room only. Radius and color can be set per room in the YAML.

### Devices mode

The mode switch on the left of the toolbar changes between Rooms and Devices. In Devices mode the sidebar lists every entity that can be placed, alphabetically, with a search box. Placed ones carry a tag with their room. Pick a room on the canvas to add entities to it. The selected room shows its Home Assistant area at the top, where it can be assigned or changed. Any entity can go in any room. A placed entity that Home Assistant puts in a different area shows a warning. Supported entities: lights, switches, covers, media players, fans, climate, locks, cameras, vacuums, temperature and humidity sensors, door, window and motion sensors. Diagnostic entities are left out.

- Add places the entity in the room. Placed entities are marked and can be dragged around, including into another room, which moves them there. Outside every room they show red and land on the wall on release.
- A placed entity has a type that sets its look, for example ceiling light, floor lamp or LED strip for a light, or blind, curtain and garage door for a cover. Strip-like types have a length. Every device has a rotation.
- Right click a device to rotate it or remove it. Delete removes the selected device.
- Deleting a room removes its devices.

## Card config

| Key | Default | Description |
| --- | --- | --- |
| `rooms` | `[]` | List of rooms, see below |
| `radius` | `0.3` | Corner radius in meters for rooms without their own |
| `gap` | `0.12` | Gap in meters between adjacent rooms |

Defaults for these and other visual values live in `src/theme.ts`.
| `aspect_ratio` | `4:3` | Card aspect ratio as `width:height` |
| `devices` | `[]` | List of placed entities, see below |

Each room:

| Key | Description |
| --- | --- |
| `id` | Unique id, required |
| `points` | Polygon corners in meters as `[x, y]`, at least 3, required |
| `area_id` | Home Assistant area to link. Its name is used as the label |
| `name` | Label override |
| `radius` | Corner radius override |
| `color` | Fill color override |

Each device:

| Key | Description |
| --- | --- |
| `entity_id` | Home Assistant entity, required |
| `room` | Id of the room it sits in, required |
| `position` | `[x, y]` in meters, required |
| `type` | Look, one of the types for the entity's domain. Defaults to the first |
| `rotation` | Degrees, counter clockwise on the plan |
| `length` | Meters, for strip-like types |

Coordinates are in meters. `x` grows to the right and `y` grows upward on the plan.

### When changes don't show up

Home Assistant and the browser cache resources aggressively. After a rebuild, hard refresh the page. If that isn't enough, bump the version in the resource URL (`?v=2`).

## Scripts

- `pnpm dev`: Vite dev server with live reload, see above
- `pnpm build`: typecheck and build `dist/card.js` once
- `pnpm watch`: rebuild `dist/card.js` on change
- `pnpm lint`: run oxlint
