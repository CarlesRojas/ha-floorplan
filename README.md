# floorplan-3d

Custom Lovelace card for Home Assistant: an interactive 3D model of the flat with lights, blinds and sensors bound to entities. React + Three.js, built with Vite into a single `dist/card.js`.

## Development

Requires a Home Assistant instance running in Docker with a `compose.yaml`.

### 1. Build

```bash
pnpm install
pnpm watch
```

Leave it running. It rebuilds `dist/card.js` on every save.

### 2. Mount `dist/` into Home Assistant

In `compose.yaml`, add a volume under the Home Assistant service, next to the existing config volume:

```yaml
volumes:
  - ./config:/config
  - <path-to-this-repo>/dist:/config/www/floorplan-3d
```

Then:

```bash
docker compose up -d
docker compose exec homeassistant ls /config/www/floorplan-3d
```

You should see `card.js`. If Home Assistant was started before `/config/www` existed, restart it once so it serves `/local/`.

Check http://localhost:8123/local/floorplan-3d/card.js shows the JS source.

### 3. Register the resource

Settings > Dashboards > three-dot menu (top right) > Resources. Add:

- URL: `/local/floorplan-3d/card.js?v=1`
- Type: JavaScript module

The Resources entry only shows when advanced mode is enabled in your user profile.

### 4. Add the card

Create a dashboard, Edit, Add card. Search "Floorplan 3D" or add it manually:

```yaml
type: custom:floorplan-3d
rooms:
  - id: living
    area_id: living_room
    points: [[0, 0], [5.2, 0], [5.2, 4], [0, 4]]
  - id: kitchen
    name: Kitchen
    points: [[5.2, 0], [8, 0], [8, 4], [5.2, 4]]
```

## Card config

| Key | Default | Description |
| --- | --- | --- |
| `rooms` | `[]` | List of rooms, see below |
| `radius` | `0.3` | Corner radius in meters for rooms without their own |
| `gap` | `0.12` | Gap in meters between adjacent rooms |
| `aspect_ratio` | `4:3` | Card aspect ratio as `width:height` |

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

- `pnpm watch`: build and rebuild on change
- `pnpm build`: typecheck and build once
- `pnpm lint`: run oxlint
