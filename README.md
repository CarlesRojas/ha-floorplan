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

It opens fullscreen. Save sends the edits on without leaving, Save & Close keeps them and leaves, and Discard restores the state from the last save or from when the editor opened, leaving an Open editor button in the dialog. The 3D view is open under the plan when the editor opens, and the cube toolbar button (P) closes and reopens it. It takes the bottom half of the column. Drag the divider between them to give either one more room. The 3D view frames the plan by itself until you orbit, pan or zoom it. From then on the camera stays where you put it, so editing does not throw your view away. The plan frames itself the same way, so changing the split keeps everything in view unless you have panned or zoomed it yourself.

- Draw room (D): click to place corners, click the first corner or press Enter to close.
- Select (V): click a room to select it, drag corners to move them, drag edges to resize, drag a room to move it. Right click a corner, edge, room or the canvas for a menu.
- Fit view (F), drag empty space to pan, wheel to zoom.
- Corners snap to a 20 cm grid and to other rooms' corners and wall lines.
- Rooms never overlap. While dragging, the room follows the pointer and turns red where it would overlap. On release it lands on the nearest valid position, sliding along the free axis. A corner cannot be drawn inside a room or through one.

Each room in the list can be named and linked to a Home Assistant area. An area can be linked to one room only. Radius and color can be set per room in the YAML.

### Editing commands

The commands every drawing program has, with the same keys. They all show in the right click menu of whatever they act on, with their shortcut.

| Command | How |
| --- | --- |
| Duplicate | Alt or Option and drag, or Ctrl D, Cmd D on a Mac |
| Copy and paste an item | Ctrl C and Ctrl V. Paste drops the copy in the selected room, so an item can be copied from one room to another |
| Rotate 90° | R |
| Move by one grid step | Arrow keys, with Shift for a 5 cm step |
| Delete | Del or Backspace |
| Deselect, cancel a drawing | Escape |

Alt and drag copies furniture and rooms. A duplicated room keeps its shape and floor but not its area, since an area stands for one room. A copy released on top of another room moves to the nearest free spot. Devices are never duplicated, since an entity is placed once.

### Devices mode

The mode switch on the left of the toolbar changes between Rooms and Devices. In Devices mode the sidebar lists every entity that can be placed, alphabetically, with a search box. Placed ones carry a tag with their room. Adding with no room selected drops the entity in a random room. The selected room shows its Home Assistant area at the top, where it can be assigned or changed. Any entity can go in any room. A placed entity that Home Assistant puts in a different area shows a warning. Supported entities: lights, switches, covers, media players, fans, climate, locks, cameras, vacuums, temperature and humidity sensors, door, window and motion sensors. Diagnostic entities are left out.

- Add places the entity in the room. Placed entities are marked and can be dragged around, including into another room, which moves them there. Outside every room they show red and land on the wall on release.
- A placed entity has a type that sets its look, for example ceiling light, floor lamp or LED strip for a light, or blind, curtain and garage door for a cover. Strip-like types have a length. Every device has a rotation.
- Right click a device to rotate it or remove it. Delete removes the selected device.
- Deleting a room removes its devices.

### Decoration mode

The third mode places furniture and fixtures. The sidebar shows the catalog, and the selected room's floor material, tint, pattern size, depth and angle when one is picked. Floor patterns are drawn at their real size, boards 16 cm wide and 1.6 m long, tiles 40 cm across, carpet in a pile of about 8 cm, so the pattern size only has to change when a room should read coarser or finer. Pattern depth is how much the pattern shows at all: 0 leaves a plain tint, 1 is the surface as designed, 2 doubles its contrast and relief. The floor is painted from above, so the rounded edge and the sides of the slab carry the same boards as the top. The angle turns the pattern on the floor, for example to run the boards across the room instead of along it. Adding with no room selected drops the item in a random room, from where it can be dragged. Hovering an item shows a small 3D preview, and the plus button places it in the room. Selecting a placed item fills the sidebar with a larger 3D preview and its settings: sizes, rotation, one color per material slot, and the device it stands in for.

- Items drag on the canvas, into any room. Wall items sit on the nearest wall and face into the room. Ceiling items show a dashed outline.
- Tables, desks, counters, islands, sideboards, dressers, nightstands, shelves, stools, benches, poufs, washing machines and dryers have a top other things can stand on. Drag a lamp, a kettle, a vase, a monitor or a TV over one and it lands on it: the top lights up while the item is over it, and the item carries a ring on the plan to show it is raised. Moving the support takes everything on it along, and deleting the support leaves them on the floor. The sidebar has a Standing on dropdown for the same thing without dragging. A hob and a sink let into a worktop instead of resting on it. An item that stands on nothing sits at its own Standing on height. A wall item hangs at its height, except a door, a garage door and a radiator, which stand on the floor, and a window, which starts at its sill.
- A device with no decoration bound shows as a sphere in 3D. Bound items take its clicks and show its state, for example a lamp glows with the light's brightness and color. A device can have several items, an item stands in for one device. Bindings are edited from either side: the device panel lists the items with checkboxes, the item panel has a device dropdown. A device whose signals the item cannot express can still be bound, the item just does not change. Clicking an item acts on its device. Double clicking opens Home Assistant's own dialog for the entity, where everything a click cannot do lives: brightness, color, a cover's exact position.

Everything that moves is eased rather than switched. Home Assistant reports a cover's position every second or so while it travels, and a switch flips in one step, so without this a sliding door would stutter along in jumps and a window would snap open. Doors and casements swing, panels travel, curtains draw, screens roll, fans come up to speed and lamps fade up and down.
- A window is divided into casements by how wide it is, each leaf between half a meter and a meter. A sliding door takes its number of panels as a setting, and the panels split the width between them and gather one in front of another as it opens.
- Items are grouped by family in the sidebar, with a search box. Every model is built from primitives in code, in a Scandinavian vocabulary: pale oak, chalky whites, muted greens and clays, rounded frames on tapered legs, plump linen upholstery.

### Catalog

| Family | Items |
| --- | --- |
| Lights | Ceiling light, pendant, floor lamp, table lamp, wall light, LED strip, ceiling LED strip, wall LED strip, spot |
| Seating | Sofa, armchair, dining chair, stool, bench, pouf |
| Tables | Dining table, coffee table, side table, desk, console table, nightstand |
| Storage | Bookshelf, sideboard, wardrobe, dresser, shoe rack, wall shelf |
| Beds | Bed, crib |
| Kitchen | Counter, island, upper cabinets, fridge, oven, hob, extractor hood, dishwasher, sink, microwave, coffee machine, kettle |
| Laundry | Washing machine, dryer |
| Bathroom | Toilet, basin, bathtub, shower, towel rail |
| Decor | Rug, large plant, small plant, picture, wall mirror, wall clock, vase, books, basket, curtain |
| Media | TV, wall TV, soundbar, speaker, floor speaker, monitor, game console, projector, projector screen |
| Climate | Radiator, air conditioner, ceiling fan, standing fan, tower fan, air purifier, humidifier, thermostat |
| Windows and doors | Blind, roller shutter, window, door, sliding door, sliding glass door, garage door, awning |
| Security and sensors | Camera, doorbell, motion sensor, door sensor, smoke detector, alarm panel, smart lock, air quality sensor |
| Smart home | Robot vacuum, smart plug, switch panel |

### How items show device state

A bound device drives what the item does in 3D, when its signals match:

- Lamps and LED strips glow with the light's brightness, color and color temperature.
- TVs and monitors play a picture on their screen, and are black glass when off. A TV is set by its diagonal in inches, always in 16:9, and a motorized projector screen rolls out of its case at the ceiling by the cover's position. Speakers and soundbars light a small indicator.
- Blinds, shutters, curtains, garage doors and awnings move to the cover's position. Doors and window casements swing open, and sliding doors run along their track, partway when the cover reports a position.
- Fans and robot vacuums spin, faster at a higher level. Washing machines turn their drum.
- Radiators and towel rails warm up, hobs light their rings, ovens glow behind the glass.
- Fridges, dishwashers, kettles and coffee machines show a status light.
- Thermostats, alarm panels and air quality sensors light their display.

A device whose signals the item cannot express can still be bound. Clicking it works, the item just does not change.

## Card config

| Key | Default | Description |
| --- | --- | --- |
| `rooms` | `[]` | List of rooms, see below |
| `radius` | `0.3` | Corner radius in meters for rooms without their own |
| `gap` | `0.12` | Gap in meters between adjacent rooms |

Defaults for these and other visual values live in `src/theme.ts`.
| `aspect_ratio` | `4:3` | Card aspect ratio as `width:height` |
| `devices` | `[]` | List of placed entities, see below |
| `decorations` | `[]` | List of placed decoration items, see below |

Each room:

| Key | Description |
| --- | --- |
| `id` | Unique id, required |
| `points` | Polygon corners in meters as `[x, y]`, at least 3, required |
| `area_id` | Home Assistant area to link. Its name is used as the label |
| `name` | Label override |
| `radius` | Corner radius override |
| `color` | Fill color override |
| `floor` | `material` from wood, tiles, terracotta, carpet, concrete, an optional `color` tint, `scale` as a multiplier on the pattern size, `rotation` in degrees and `intensity` for how much the pattern shows |

Each device:

| Key | Description |
| --- | --- |
| `entity_id` | Home Assistant entity, required |
| `room` | Id of the room it sits in, required |
| `position` | `[x, y]` in meters, required |
| `type` | Look, one of the types for the entity's domain. Defaults to the first |
| `rotation` | Degrees, counter clockwise on the plan |
| `length` | Meters, for strip-like types |
| `decorations` | Ids of decoration items that stand in for this device in 3D |

Each decoration:

| Key | Description |
| --- | --- |
| `id` | Unique id, required |
| `kind` | Catalog kind, for example `light_pendant`, required |
| `room` | Id of the room it sits in, required |
| `position` | `[x, y]` in meters, required |
| `rotation` | Degrees, counter clockwise on the plan |
| `on` | Id of the item this one stands on, for example the table under a lamp |
| `params` | Kind specific numbers, in meters unless the editor says otherwise. Ranges reach well past the usual size in both directions, so a wardrobe can be three meters wide and a coffee table can sit at ankle height |
| `colors` | Hex color per material slot, for example `shade`, `base`, `cord` |
| `materials` | Surface per slot: `matte`, `fabric`, `wood`, `ceramic`, `metal`. Surfaces are procedural textures with relief. A `glass` or `mirror` slot takes a tint only, never a surface |

Coordinates are in meters. `x` grows to the right and `y` grows upward on the plan.

### When changes don't show up

Home Assistant and the browser cache resources aggressively. After a rebuild, hard refresh the page. If that isn't enough, bump the version in the resource URL (`?v=2`).

## Scripts

- `pnpm dev`: Vite dev server with live reload, see above
- `pnpm build`: typecheck and build `dist/card.js` once
- `pnpm watch`: rebuild `dist/card.js` on change
- `pnpm lint`: run oxlint
