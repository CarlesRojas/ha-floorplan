# Floorplan tiles

Floorplan 3D comes with twelve small tiles and eight larger cards, to sit around the 3D model on the same dashboard. They are in the same `card.js`, so there is nothing more to install. The tiles are made for a sections view, and the floorplan card can also lay them out beside itself in its [side panel](#side-panel).

| Card         | Takes                                                                                                               | A tap                                                                                                                                                                                             |
| ------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fp-title`   | nothing                                                                                                             | nothing, it is a heading                                                                                                                                                                          |
| `fp-toggle`  | `light.*`, `switch.*`, `fan.*`, `input_boolean.*`, `humidifier.*`, `siren.*`, `remote.*`, `automation.*`, `valve.*` | toggles it, or opens or closes a valve                                                                                                                                                            |
| `fp-button`  | `button.*`, `input_button.*`, `script.*`, `scene.*`                                                                 | presses it, or runs the script or scene                                                                                                                                                           |
| `fp-cover`   | `cover.*`                                                                                                           | opens or closes it. A wide tile adds up, stop and down                                                                                                                                            |
| `fp-vacuum`  | `vacuum.*`                                                                                                          | starts or pauses it. A wide tile adds the vacuum's buttons                                                                                                                                        |
| `fp-select`  | `select.*`, `input_select.*`                                                                                        | opens a menu of the options, or moves to the next one                                                                                                                                             |
| `fp-camera`  | `camera.*`, `image.*`                                                                                               | opens the camera's dialog                                                                                                                                                                         |
| `fp-climate` | `climate.*`, `water_heater.*`                                                                                       | opens its dialog. A wide tile has minus and plus for the temperature it aims for, or for either end of its range, and a wide thermostat is three rows tall with a button for each mode it runs in |
| `fp-media`   | `media_player.*`                                                                                                    | plays or pauses it, or turns it on. A wide tile adds previous, play or pause, next, and a button to turn it off                                                                                   |
| `fp-lock`    | `lock.*`                                                                                                            | locks it, or unlocks it while it is locked                                                                                                                                                        |
| `fp-weather` | `weather.*`                                                                                                         | opens its dialog. It takes the whole width and three rows, and shows the next hours or days                                                                                                       |
| `fp-entity`  | any entity                                                                                                          | opens its dialog. The line under the name is its state, with its unit                                                                                                                             |

The larger cards are offered beside the tiles when a card is added by entity:

| Card               | Takes                                                                                                    | What it shows                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `fp-alarm-panel`   | `alarm_control_panel.*`                                                                                  | a button for each mode it arms in and a keypad for its code                                |
| `fp-dial`          | `climate.*`, `water_heater.*`, `humidifier.*`, and `light.*` that dims                                   | a ring to drag to the temperature, humidity or brightness it aims for, with minus and plus |
| `fp-media-control` | `media_player.*`                                                                                         | the cover art, what is playing, how far into it, its buttons and its volume                |
| `fp-calendar`      | `calendar.*`                                                                                             | the events of the next days, as a list by day                                              |
| `fp-todo`          | `todo.*`                                                                                                 | the items to do with a box to tick each, a field to add one, and the done items            |
| `fp-graph`         | `sensor.*`, `binary_sensor.*`, `counter.*`, `input_number.*`, `number.*`, `person.*`, `device_tracker.*` | a line over the last day, bars for the last days, or a strip lit for the times it was on   |
| `fp-gauge`         | any entity with a number for a state                                                                     | the reading on a ring, from its own minimum and maximum when it has them                   |
| `fp-map`           | `person.*`, `device_tracker.*`, `zone.*`                                                                 | where it is, on Home Assistant's own map                                                   |

Most tiles can also show a control under the name, set with `feature`, which makes the tile a row taller: favorite colors or an effect for a light, a fan's direction, oscillation or preset, a cover's position, tilt or buttons, a thermostat's modes, presets, fan or swing, a target temperature or humidity, a media player's playback, volume, source or sound mode, a lock's buttons, an alarm's modes, a vacuum's or a lawn mower's commands, a counter's or a timer's buttons, a number, a date or an option list. The card editor lists the ones the entity can do, and the card picker offers a tile with each of them. Some add no row. A light's `brightness` and a fan's `speed` make the whole tile a slider: it fills from the left as far as the light is bright or the fan is fast, a drag sideways anywhere on it follows the finger, the left and right arrows do the same from the keyboard, and a tap still turns it on or off. A fan with a few speeds moves freely under the finger and settles on the nearest speed when it lifts. A light's `color-temp` and `color` are a slim bar beside the icon, at every size, with a round handle: a press on the bar jumps there and a drag follows the finger, while the line under the name says the temperature or hue and the tile takes that color, and a tap anywhere else still turns the light on or off. While the light is on, that line says its white in kelvin or the name of its color, like Orange, in place of its brightness.

On every tile but the title, a long press or a right click opens Home Assistant's more info dialog for the entity. With a keyboard, Enter or Space taps and the context menu key or Shift+F10 holds.

Every tile can be set up from Home Assistant's visual card editor, as well as in YAML.

A tile that is on is light and opaque with its icon in color. On a light dashboard it is dark instead, with white text, so it still stands out from the page. A light that is on tints its icon and the top left of its tile with the color it shines in. One that is off is frosted glass. One whose entity is unavailable is dimmed, says so, and does nothing when tapped.

## Example

```yaml
type: fp-toggle
entity: light.living_room
name: Ceiling
icon: ph:lamp-pendant
size: small
```

## Options every tile takes

| Key            | Default             | Description                                                                                          |
| -------------- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| `entity`       |                     | The entity, required on every tile but the title                                                     |
| `name`         | its friendly name   | The name on the tile                                                                                 |
| `icon`         | one for its domain  | A Phosphor icon as `ph:<name>`, see below, or any icon Home Assistant knows, such as `mdi:lightbulb` |
| `color`        | the domain's accent | Any CSS color, for the icon while the tile is on                                                     |
| `state_text`   |                     | Replaces the line under the name                                                                     |
| `size`         | `small`             | `small` is half of a section's width, `wide` is all of it                                            |
| `area`         | the entity's area   | The area the tile belongs to for the room filter, as its id or its name                              |
| `room_filter`  | `hide`              | How the tile follows the room in view, see [Room filtering](#room-filtering)                         |
| `tap_action`   |                     | Replaces what a tap does, in the format Home Assistant's own cards use                               |
| `hold_action`  | `more-info`         | Replaces what a long press does                                                                      |
| `haptic`       | `true`              | `false` turns off the short vibration the companion app gives on a tap                               |
| `grid_options` |                     | Home Assistant's own, to give the tile a size of your own in the section grid                        |

`tap_action` and `hold_action` take `action` as one of `toggle`, `more-info`, `navigate` with `navigation_path`, `url` with `url_path`, `perform-action` with `perform_action`, `data` and `target`, or `none`. Add `confirmation: true` to ask first.

```yaml
type: fp-button
entity: script.good_night
tap_action:
  action: perform-action
  perform_action: script.turn_on
  target:
    entity_id: script.good_night
  confirmation:
    text: Turn everything off?
```

## Each card's own options

`fp-title`

| Key     | Description                                                                   |
| ------- | ----------------------------------------------------------------------------- |
| `title` | The heading. Without one, the name of its `area`                              |
| `area`  | The area the heading belongs to, so it hides with the room filter like a tile |

`fp-cover`

| Key      | Default | Description                                                                                                             |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `invert` | `false` | Swaps what up and down do, for a projector screen or a blind wired the other way round, where closing it brings it down |

The buttons are never greyed out, since many covers do not know where they are. While a cover is partly open, its position is shown next to its state.

`fp-vacuum`

| Key              | Description                                                                                                                             |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `battery_entity` | A sensor with the battery level, for a vacuum that does not report it. Without one, a battery sensor on the vacuum's own device is used |

A wide tile shows pause or start, stop, and back to the dock, each only when the vacuum supports it.

`feature`, on any tile, is the id of the control under its name, as the card editor and the card picker set it.

`fp-graph`

| Key     | Default | Description                                                     |
| ------- | ------- | --------------------------------------------------------------- |
| `chart` | `line`  | `line` for the last hours of a reading, `bar` for one bar a day |
| `hours` | `24`    | How far back a line or a strip reaches                          |
| `days`  | `7`     | How many days of bars                                           |

`fp-gauge` takes `min` and `max`, and `fp-calendar` takes `entities`, more calendars to list along with its own, and `days`, how many days ahead it lists. `fp-map` takes `hours_to_show`, how many hours of a person's path it draws behind them, and `fp-weather` takes `forecast_type`, `hourly` or `daily`.

`fp-select`

| Key            | Default | Description                                                               |
| -------------- | ------- | ------------------------------------------------------------------------- |
| `tap_behavior` | `menu`  | `menu` opens the options under the tile, `cycle` moves to the next option |

`fp-camera`

| Key            | Default | Description                                                                       |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `camera_view`  | `auto`  | `auto` shows a still that refreshes, `live` streams                               |
| `aspect_ratio` | `16:9`  | The picture's shape, as `width:height`. Ignored when `grid_options` sets the rows |

## Side panel

The floorplan card can bring its own tiles. Turn on **Show the side panel** in the card's editor, or set `side_panel: true` in its YAML, and the floorplan takes the left two thirds of the card with its tiles on the right third. When the card is narrower than 900 pixels, the tiles go under the floorplan instead. This works in any view. In a panel view the floorplan fills its column from the top of the screen to the bottom, whatever its `aspect_ratio`. On a phone it is square, with the tiles under it. In a sections view the card takes the full width of its section.

The card also lays a background behind the view it is in, graphite by default. The card's editor has a Background section with a row of swatches for a light dashboard and another for a dark one, so each can have its own: graphite, dusk, ocean, forest or ember, each a dark version and a pale version of the same colors, or Plain to keep the dashboard's own background. In YAML:

```yaml
background:
  light: dusk
  dark: ocean
```

The tiles fill themselves from the plan. Each room gets a heading with its name, then a tile for each device placed in it, in the order the plan lists them. Each device gets the tile made for its domain, and `fp-entity` when none is. Covers, vacuums, thermostats and media players are wide. The icon comes from the piece the device stands behind, so a pendant lamp shows `ph:lamp-pendant`, and a projector screen's tile is inverted. With the whole home in view every room shows, and with a room in view only that room does. When the room in view changes, the tiles fade out and the next ones fade in. While every tile is hidden the panel reads Nothing to control here.

Entities with no piece on the plan, like a scene, a sensor, a thermostat or a media player, can join a room's tiles too. Under **Tiles by room** in the card's editor, each room lists the devices it already has from the plan and takes more with an entity picker. An entity can be in one place only, so the picker leaves out every entity the plan or another room already has. They get the same tiles as the devices on the plan. In YAML they are the room's `entities`.

The handle on the right of each row in that list drags it up or down, and the panel shows the room's tiles in that order. With the handle focused, the up and down arrow keys move the row too. In YAML the order is the room's `order`, a list of entity ids. An entity it leaves out goes after the ones it names.

```yaml
type: custom:floorplan-3d
side_panel: true
rooms:
  - id: living
    name: Living room
    area_id: living_room
    points: [[0, 0], [5, 0], [5, 4], [0, 4]]
    entities:
      - scene.movie_night
      - climate.living_room
    order:
      - climate.living_room
      - light.living_room
      - scene.movie_night
```

Some tiles are for the whole home rather than a room, like a scene that sets up the bedroom for the projector, a switch that turns every light off, or the weather. Put them under **Home** in the card's editor, above **Tiles by room**. It takes any entity, the same tiles as the rooms, and the same handles to put them in order. Its heading reads Home, and the field at the top of the section renames it. With any entity there, the panel shows only this section while the whole home is in view, and each room's tiles only while that room is. With none, every room shows as before. In YAML it is the card's `home`, with an optional `name` and its `entities` in the order they show.

```yaml
type: custom:floorplan-3d
side_panel: true
home:
  name: Home
  entities:
    - switch.projector_scene
    - switch.tv_scene
    - switch.all_lights
    - switch.cleaning
    - weather.home
rooms:
  - id: living
    name: Living room
    area_id: living_room
    points: [[0, 0], [5, 0], [5, 4], [0, 4]]
```

A scene or a script runs on a tap. An automation is a toggle that turns the automation itself on or off, so to run one from a tile, put its actions in a script. A light group made with Home Assistant's Group helper is a light, so its tile has brightness and color. For a plain on and off over many lights, make a template switch instead, like the demo's All lights: on while any light is, and a tap turns them all off, or all on when every one is off. A scene in Home Assistant has no on or off, so for one that shows whether it is in place and undoes itself, make a template switch: its state says when the scene is on, `turn_on` sets it up and `turn_off` undoes what should be undone. The demo's Projector scene is on while the projector screen is down, turns off the bedroom lights and brings the screen down when turned on, and only rolls the screen up when turned off.

To choose every tile yourself, leave the side panel off and put the tiles next to the floorplan card in a sections view.

## Icons

`ph:` icons come from [Phosphor](https://phosphoricons.com) and are built into the card, so they show offline. A tile that is on shows the filled weight of its icon and one that is off shows the regular one. Add `-fill` to a name, as in `ph:heart-fill`, to always show it filled. `ph:minus-bold`, `ph:plus-bold` and `ph:power-bold` are the heavier weight, and `ph:robot-vacuum`, a round robot vacuum, is drawn for the card.

These are included:

alarm, armchair, arrow-line-down, arrow-line-up, bathtub, battery-charging, battery-empty, battery-full, battery-high, battery-low, battery-medium, bed, bell, broom, calendar-blank, camera, caret-down, caret-left, caret-right, caret-up, cat, chat-circle, check, circle, clock, cloud, cloud-fog, cloud-lightning, cloud-rain, cloud-snow, cloud-sun, cooking-pot, couch, cursor-click, desktop, door, door-open, download, drop, drop-half, eye, fan, film-strip, fire, fork-knife, garage, gauge, globe, hand-tap, hash, heart, house, house-line, lamp, lamp-pendant, lightbulb, lightbulb-filament, lightning, list, list-bullets, list-checks, lock, lock-open, map-pin, map-trifold, minus, monitor, moon, moon-stars, music-notes, oven, pause, paw-print, person, person-simple-walk, pipe, plant, play, plug, plugs, plus, popcorn, potted-plant, power, projector-screen, pulse, question, robot, rows, security-camera, shield, shield-check, shower, siren, skip-back, skip-forward, sliders, sliders-horizontal, snowflake, sparkle, speaker-high, spray-bottle, square-half-bottom, star, stop, sun, television, textbox, thermometer, thermometer-simple, timer, toggle-left, toggle-right, toilet, tree, user, video-camera, warning, wifi-high, wind, x.

The same icons are offered as `ph:` in Home Assistant's icon picker, and can be used on any card, unless another `ph` icon set is already installed.

A tile with no `icon` of its own shows the icon set for its entity in Home Assistant, in the entity's settings or its YAML, so a scene switch or a script can show a projector or a television. Pick a `ph:` icon there to match the other tiles. With none set, a tile on the plan shows the icon of its piece, and any other the one for its kind of entity.

A name not in the list shows a question mark and logs a warning in the browser console. Any other icon is one `mdi:` name away.

## Room filtering

When a Floorplan 3D card on the dashboard flies to a room, every tile that belongs to another area hides, and a section left with nothing showing folds away. Going back to the whole home brings them all back. The room needs an area: set it in the editor, or as `area_id` on the room in the card's YAML.

A tile's area is its `area` option when it has one, else its entity's area, else the area of the entity's device. A tile with no area at all hides while a room is in view, and the browser console lists every such tile once. Give it an `area`, or `room_filter: show` to keep it in every room. A title with an `area` hides along with its tiles.

`room_filter` takes one of these:

| Value  | The whole home | A room in view                                   |
| ------ | -------------- | ------------------------------------------------ |
| `hide` | shown          | shown in its own room. A tile with no area hides |
| `show` | shown          | shown                                            |
| `room` | hidden         | shown in its own room only                       |
| `home` | shown          | hidden                                           |

`room` and `home` together make a panel that changes with the room: each room's tiles with `room`, and what is for the whole home with `home`. A room in the floorplan with no area hides the `room` and `home` tiles and leaves the rest as they are.

While the dashboard is being edited, every tile shows whatever room is in view.

The card tells the page which room is in view through a `fp-room-filter` event on `window`, with `{ area_id, room_id }` as its detail, or `null` for the whole home. The last one is kept in `window.__fpRoomFilter`. Other cards can listen for it too.

## Theme

[themes/floorplan-glass.yaml](../themes/floorplan-glass.yaml) is a Home Assistant theme to go with the tiles: a dark gradient behind the dashboard, and the dashboard's own colors and dialogs set to match. Copy it into the `themes` folder of your Home Assistant config, with this in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Then pick **Floorplan Glass** in your profile, or as the dashboard's theme.

The tiles look finished without it, and change with any theme that sets these:

| Token                         | Default                    | What it changes                                                                                      |
| ----------------------------- | -------------------------- | ---------------------------------------------------------------------------------------------------- |
| `fp-tile-radius`              | `30px`                     | The corner radius                                                                                    |
| `fp-tile-padding`             | `18px`                     | The space inside a tile                                                                              |
| `fp-tile-gap`                 | `10px`                     | The space between tiles, used by the theme                                                           |
| `fp-tile-bg-active`           | `rgba(255, 255, 255, .94)` | The background of a tile that is on, `rgba(28, 28, 30, .94)` on a light dashboard                    |
| `fp-tile-bg-inactive`         | `rgba(118, 118, 128, .24)` | The background of a tile that is off                                                                 |
| `fp-tile-blur`                | `24px`                     | How much the glass blurs what is behind it                                                           |
| `fp-tile-shadow`              | `none`                     | A box shadow under every tile                                                                        |
| `fp-tile-opacity-inactive`    | `1`                        | The icon and text of a tile that is off                                                              |
| `fp-tile-opacity-unavailable` | `.45`                      | A tile whose entity is unavailable                                                                   |
| `fp-tile-icon-size`           | `28px`                     | The icon                                                                                             |
| `fp-tile-name-size`           | `15px`                     | The name                                                                                             |
| `fp-tile-state-size`          | `13px`                     | The line under the name                                                                              |
| `fp-slider-handle`            | the lit tile background    | The round handle of a slim slider beside the icon                                                    |
| `fp-tile-duration`            | `200ms`                    | How long a tile takes to change                                                                      |
| `fp-tile-press-scale`         | `.96`                      | How far a tile shrinks while pressed                                                                 |
| `fp-tile-focus-scale`         | `1.03`                     | How far a tile grows while in focus from the keyboard                                                |
| `fp-text-active`              | `#1c1c1e`                  | The text on a tile that is on, `#ffffff` on a light dashboard                                        |
| `fp-text-inactive`            | `#ffffff`                  | The text on a tile that is off                                                                       |
| `fp-text-secondary-opacity`   | `.6`                       | The line under the name                                                                              |
| `fp-accent`                   | `#0a84ff`                  | The icon of an `input_boolean`, script or select that is on                                          |
| `fp-accent-light`             | `#ffb340`                  | The icon of a light or a switch that is on                                                           |
| `fp-accent-cover`             | `#32ade6`                  | The icon of an open cover                                                                            |
| `fp-accent-climate`           | `#ff9f0a`                  | The icon of a thermostat or water heater that heats                                                  |
| `fp-accent-cool`              | `#64d2ff`                  | The icon of a thermostat that cools                                                                  |
| `fp-mode-cool`                | `#0a6fd6`                  | A thermostat's cooling mode button while chosen, `#64d2ff` on a tile that is on on a light dashboard |
| `fp-mode-dry`                 | `#13809c`                  | A thermostat's drying mode button while chosen, `#5ac8e0` on a tile that is on on a light dashboard  |
| `fp-font-tile`                | Inter                      | The tiles' font                                                                                      |
| `fp-font-title`               | Inter Tight                | The headings' font                                                                                   |
| `fp-title-size`               | `30px`                     | The headings' size                                                                                   |
| `fp-title-opacity`            | `.92`                      | The headings' opacity                                                                                |
| `fp-title-color`              | the theme's text color     | The headings' color                                                                                  |
| `fp-menu-bg`                  | dark frosted glass         | The select tile's menu                                                                               |
| `fp-menu-text`                | `#ffffff`                  | The text in that menu                                                                                |

On a light dashboard, a tile that is off is lighter glass with dark text, unless the theme sets its own.

The fonts load from Google Fonts. Without a connection the tiles fall back to the system font.
