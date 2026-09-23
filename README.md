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

It opens fullscreen. Save sends the edits on without leaving and says Saved for a moment, Save & Close keeps them and leaves, and Discard restores the state from the last save or from when the editor opened, leaving an Open editor button in the dialog. The 3D view is open under the plan when the editor opens, and the cube toolbar button (P) closes and reopens it. It takes the bottom half of the column. Drag the divider between them to give either one more room. The 3D view frames the plan by itself until you orbit, pan or zoom it. From then on the camera stays where you put it, so editing does not throw your view away. The plan frames itself the same way, so changing the split keeps everything in view unless you have panned or zoomed it yourself.

- Draw room (D): click to place corners, click the first corner or press Enter to close.
- Select (V): click a room to select it, drag corners to move them, drag edges to resize, drag a room to move it. Right click a corner, edge, room or the canvas for a menu.
- Fit view (F), drag empty space to pan, wheel to zoom.
- Corners snap to a 20 cm grid and to other rooms' corners and wall lines.
- Rooms never overlap. While dragging, the room follows the pointer and turns red where it would overlap. On release it lands on the nearest valid position, sliding along the free axis. A corner cannot be drawn inside a room or through one.

The sidebar shows the decoration catalog. Selecting a room fills it with the room on its own: its name, the Home Assistant area it stands for, the floor under it, a button to delete it, and a cross back to the catalog. The cross lets go of the block, not of the room, so what you add next still lands in it. Selecting an item inside the room shows that instead. An area can be linked to one room only. Radius and color can be set per room in the YAML.

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

Alt and drag copies furniture and rooms. A duplicated room keeps its shape and floor but not its area, since an area stands for one room. A copy released on top of another room moves to the nearest free spot. A copy is never bound to the original's entity, since an entity is stood in for once.

The toolbar's sun button opens a time of day slider for the 3D preview, N,
starting at one in the afternoon: what is being drawn should look the same
whatever the hour outside, and the slider walks the room through noon, the
golden hour, dusk and the middle of the night. It moves the preview only,
never the card. Beside it, the compass button opens a slider for the sun's
direction, S, which decides which way every shadow falls. The preview follows
that one as it is dragged and the card takes the new direction when it is let
go, so the room is lit the same way outside the editor.

The sidebar shows the catalog of furniture and fixtures. Floor patterns are drawn at their real size, boards 16 cm wide and 1.6 m long, tiles 40 cm across, carpet in a pile of about 8 cm, so the pattern size only has to change when a room should read coarser or finer. Pattern depth is how much the pattern shows at all: 0 leaves a plain tint, 1 is the surface as designed, 2 doubles its contrast and relief. The floor is painted from above, so the rounded edge and the sides of the slab carry the same boards as the top. The angle turns the pattern on the floor, for example to run the boards across the room instead of along it. An item is added to the selected room, or to the room the selected piece stands in, or to a random one when nothing is selected, from where it can be dragged. Hovering an item shows a small 3D preview, and clicking anywhere on its row places it in the room. Selecting a placed item fills the sidebar with a larger 3D preview and its settings: sizes, rotation, one color per part, and the device it stands in for. The preview, the item's name and the way back to the list stay at the top while the settings scroll. It is square until the handle under it is dragged to make it taller or shorter. Searching a family name, kitchen or lights, lists everything in it.

- Rooms and items are picked at any time, with no mode to switch, and one at a time: picking a piece lets go of the room, and picking a room lets go of the piece. While a piece is dragged the room it would land in lifts a little, which is a hint, not a selection. Whatever is selected is drawn last, so it takes the press when two items sit over each other and its rotation handle is never covered. Clicking that spot again steps down to the item underneath, then to the room they all stand in, and round again, since something buried cannot be reached any other way. Dragging still moves whatever is selected. A press in the 3D view does what it would in the card, and in the editor also picks what it landed on, so orbiting around to a lamp and clicking it opens that lamp in the sidebar.
- Items drag on the canvas, into any room. Wall items sit on the nearest wall and face into the room. Ceiling items show a dashed outline.
- Tables, desks, counters, islands, sideboards, dressers, nightstands, shelves, stools, benches, poufs, washing machines and dryers have a top other things can stand on. Drag a lamp, a kettle, a vase, a monitor or a TV over one and it lands on it: the top lights up while the item is over it, and the item carries a ring on the plan to show it is raised. Moving the support takes everything on it along, and deleting the support leaves them on the floor. The sidebar has a Standing on dropdown for the same thing without dragging. A hob and a sink let into a worktop instead of resting on it. An item that stands on nothing sits at its own Standing on height. A wall item hangs at its height, except a door, a garage door and a radiator, which stand on the floor, and a window, which starts at its sill.
- An item can stand in for a Home Assistant entity, which is the only way an entity reaches the plan: nothing is placed on its own. The item panel has a Device dropdown listing every entity that drives at least one of the things that item can show, the ones that fit best first, each with the controls it brings under its name and the pieces it already drives beside them. A list of more than a handful searches itself: a box at the top of the panel takes the focus as it opens and filters on the entity's name and its id, the arrows walk what is left and Enter takes it. An entity can have several items, an item stands in for one entity, so an entity already behind another piece is still on offer. When it is behind more than one, the panel lists the others under Also driving: a row goes to that piece, the bin beside it asks first and then lets go of it. The room and position of the binding follow the item, and an item on the plan with an entity behind it carries an amber outline. Bound items take the entity's clicks and show its state, for example a lamp glows with the light's brightness and color. Clicking an item acts on its entity. Right clicking it, or holding it on a touch screen, opens Home Assistant's own dialog for the entity, where everything a click cannot do lives: brightness, color, a cover's exact position. A press that wanders is the camera being moved, so it never opens the dialog. Deleting an item, or the room it is in, drops the binding with it. Entities on offer: lights, switches, covers, media players, fans, climate, humidifiers, locks, cameras, vacuums, temperature and humidity sensors, door, window and motion sensors. Diagnostic entities are left out.

Things are small seen from across a room, so a press that lands on nothing is tried again in rings around itself, growing outward to `PICK_RADIUS_PX` in `src/theme.ts`. The first thing it finds takes the press, which means a lamp does not have to be hit exactly. Past that it is taken as a press on the room.

Everything that moves is eased rather than switched. Home Assistant reports a cover's position every second or so while it travels, and a switch flips in one step, so without this a sliding door would stutter along in jumps and a window would snap open. Doors and casements swing, panels travel, curtains draw, screens roll, fans come up to speed and lamps fade up and down. A travelling cover only ever heads for the position Home Assistant last reported, never past it: what the reports give is the pace, since how far it moved between one and the next divided by how long that took is how fast the cover travels. Driving at that pace means arriving just as the next report lands, so a set of steps reads as one movement.
- A window is divided into casements by how wide it is, each leaf between half a meter and a meter. A sliding door takes its number of panels as a setting, and the panels split the width between them and gather one in front of another as it opens.
- Items are grouped by family in the sidebar, with a search box. Every model is built from primitives in code, in a Scandinavian vocabulary: pale oak, chalky whites, muted greens and clays, rounded frames on tapered legs, plump linen upholstery.

### Catalog

| Family | Items |
| --- | --- |
| Lights | Ceiling light, pendant, floor lamp, table lamp, wall light, floor LED strip, ceiling LED strip, wall LED strip |
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

### Light in the room

The room takes its light from the time of day at the home. The card reads
`sun.sun`, so the hour before sunset arrives as a fade rather than a switch,
falling back to the entity's state and then to the clock on the device
showing the card when the sun integration is not there.

- By day the room sits in soft warm light: a sky above, a floor bounce below
  and a gentle sun on top of them. Shadows are filtered soft and the sun's
  map is kept coarse on purpose, so a piece gets a soft pool under it rather
  than a hard outline of itself.
- The light takes its color from how high the sun is standing: golden along
  the horizon at sunrise and sunset, near white overhead at midday.
- By night that wash drops to a dim warm glow and the lamps carry the room.
- The change takes about an hour each way. The sun climbs roughly ten degrees
  in the hour after it rises and drops the same in the hour before it sets, so
  the room starts dimming about an hour before sundown, is at night by
  sundown, and takes the hour after sunrise to come back up.
- `sun_direction` says where the sun comes from, in degrees clockwise from
  the top of the plan, which decides which way every shadow falls.
- Every lamp lights what is around it and throws the things beside it onto
  the floor. A lamp shade is not a wall: its frame and slats cast shadows
  while the parchment or opal in it passes light through and glows.
- Each kind of lamp has its own output, in `theme.ts`: a pendant hangs close
  over a table and sends its light down through a diffuser, so it gives about
  half what a floor lamp standing in the open does.
- Point light shadows are expensive, so the brightest few lamps cast them and
  the rest light the room without. A lamp casts from the frame it lights up,
  and the sweep only takes shadows away from the lamps past that budget. LED
  strips light along their length, which is a kind of source that cannot cast
  a shadow.
- The sun stands over the middle of the flat and its shadow covers exactly
  it, so the shadow map stays fine grained and a tabletop does not speckle.

### How items show device state

A bound device drives what the item does in 3D, when its signals match:

- Lamps and LED strips glow with the light's brightness, color and color temperature, taking on the color themselves rather than only tinting the room. A strip lights along its whole length.
- TVs and monitors play a picture on their screen, and are black glass when off. A TV is set by its diagonal in inches, always in 16:9, and a motorized projector screen rolls out of its case at the ceiling by the cover's position. Speakers and soundbars light a small indicator.
- Blinds, shutters, curtains, garage doors and awnings move to the cover's position, and a blind's slats turn with its tilt. Doors and window casements swing open, a window tilts as well, and sliding doors run along their track, partway when the cover reports a position. A device that only switches drives the same items fully open and shut.
- A device with more than one percentage, a cover with a position and a tilt, says which one feeds each percentage of the item it stands behind. A window and a blind take two: how far open they are, and how far tilted.
- Fans spin, faster at a higher level, and washing machines turn their drum.
- A robot vacuum comes with the dock it charges on. The dock stays where the piece was placed, since that is the thing plugged into the wall, and the robot leaves it while the vacuum is cleaning: it sweeps the room in long parallel passes, each one cut back to the stretches clear of the furniture standing on the floor, and the move from the end of one pass to the start of the next is routed across the free floor as well, so no leg of the round crosses a sofa. A rug is the one thing on the floor it drives straight over, along with everything that hangs on a wall or from the ceiling. It retraces its way back to the dock when the vacuum stops. A press on either the robot or the dock does what a press on the piece does.
- Radiators and towel rails warm up, hobs light their rings, ovens glow behind the glass.
- Fridges, dishwashers, kettles and coffee machines show a status light.
- Thermostats, alarm panels and air quality sensors light their display.

Only entities that drive at least one of the things an item can show are on offer for it, so an item is never bound to something it cannot express.

## Card config

| Key | Default | Description |
| --- | --- | --- |
| `rooms` | `[]` | List of rooms, see below |
| `radius` | `0.3` | Corner radius in meters for rooms without their own |
| `gap` | `0.12` | Gap in meters between adjacent rooms |
| `aspect_ratio` | `4:3` | Card aspect ratio as `width:height` |
| `sun_direction` | `145` | Where the sun comes from, in degrees clockwise from the top of the plan |
| `devices` | `[]` | Entities bound to decoration items, see below |
| `decorations` | `[]` | List of placed decoration items, see below |

Defaults for these and other visual values live in `src/theme.ts`.

Each room:

| Key | Description |
| --- | --- |
| `id` | Unique id, required |
| `points` | Polygon corners in meters as `[x, y]`, at least 3, required |
| `area_id` | Home Assistant area to link. Its name is used as the label |
| `name` | Label override |
| `radius` | Corner radius override |
| `color` | Fill color override |
| `floor` | Wood on a room drawn in the editor. `material` from wood, tiles, terracotta, carpet, concrete, an optional `color` tint, `scale` as a multiplier on the pattern size, `rotation` in degrees and `intensity` for how much the pattern shows |

Each device. A device is only a binding: it is never placed on its own, and its room and position follow the first item that stands in for it.

| Key | Description |
| --- | --- |
| `entity_id` | Home Assistant entity, required |
| `room` | Id of the room it sits in, required |
| `position` | `[x, y]` in meters, required |
| `decorations` | Ids of decoration items that stand in for this device in 3D, required |
| `levels` | Which of the entity's percentages feeds each of the item's, for example `{ open: position, tilt: tilt }` |

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
| `colors` | Hex color per part. Each kind names its own parts, for example a door has `frame`, `panel` and `handle`, a sofa has `frame`, `upholstery` and `cushions`. Parts are painted plain: the kind decides how matte or polished each one is, and nothing but the floor carries a pattern |

Coordinates are in meters. `x` grows to the right and `y` grows upward on the plan.

### When changes don't show up

Home Assistant and the browser cache resources aggressively. After a rebuild, hard refresh the page. If that isn't enough, bump the version in the resource URL (`?v=2`).

## Scripts

- `pnpm dev`: Vite dev server with live reload, see above
- `pnpm build`: typecheck and build `dist/card.js` once
- `pnpm watch`: rebuild `dist/card.js` on change
- `pnpm lint`: run oxlint
