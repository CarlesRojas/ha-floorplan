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

- Draw room (D): click to place corners, click the first corner or press Enter to close.
- Select (V): click a room to select it, drag corners to move them, drag the small dots on the edges to add corners, Delete removes the selected corner, drag a room to move it.
- Move plan (P): drag the floor plan image.
- Fit view (F), drag empty space to pan, wheel to zoom.
- Corners snap to a 10 cm grid and to other rooms' corners and wall lines.

Each room in the list can be named, linked to a Home Assistant area, and given its own corner radius and color.

To trace real plans, put an image under `www/floorplan-3d` in the Home Assistant config folder and enter its `/local/...` URL. Then click Calibrate scale and click two points whose real distance you know.

## Card config

| Key | Default | Description |
| --- | --- | --- |
| `rooms` | `[]` | List of rooms, see below |
| `radius` | `0.3` | Corner radius in meters for rooms without their own |
| `gap` | `0.12` | Gap in meters between adjacent rooms |

Defaults for these and other visual values live in `src/theme.ts`.
| `aspect_ratio` | `4:3` | Card aspect ratio as `width:height` |
| `plan` | | Floor plan image: `url`, `width` in meters, `x` and `y` of its bottom left corner, `opacity` |

Each room:

| Key | Description |
| --- | --- |
| `id` | Unique id, required |
| `points` | Polygon corners in meters as `[x, y]`, at least 3, required |
| `area_id` | Home Assistant area to link. Its name is used as the label |
| `name` | Label override |
| `radius` | Corner radius override |
| `color` | Fill color override |

Coordinates are in meters. `x` grows to the right and `y` grows upward on the plan.

### When changes don't show up

Home Assistant and the browser cache resources aggressively. After a rebuild, hard refresh the page. If that isn't enough, bump the version in the resource URL (`?v=2`).

## Scripts

- `pnpm dev`: Vite dev server with live reload, see above
- `pnpm build`: typecheck and build `dist/card.js` once
- `pnpm watch`: rebuild `dist/card.js` on change
- `pnpm lint`: run oxlint
