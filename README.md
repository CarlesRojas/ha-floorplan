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
model: flat.glb
```

### When changes don't show up

Home Assistant and the browser cache resources aggressively. After a rebuild, hard refresh the page. If that isn't enough, bump the version in the resource URL (`?v=2`).

## Scripts

- `pnpm watch`: build and rebuild on change
- `pnpm build`: typecheck and build once
- `pnpm lint`: run oxlint
