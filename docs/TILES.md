# Floorplan tiles

Floorplan 3D comes with seven small tiles, to sit around the 3D model on the same dashboard, and a layout card to put them beside it. They are in the same `card.js`, so there is nothing more to install. The tiles are made for a sections view, or for the side of `fp-split` in a panel view.

| Card        | Takes                                               | A tap                                                      |
| ----------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `fp-title`  | nothing                                             | nothing, it is a heading                                   |
| `fp-toggle` | `light.*`, `switch.*`, `input_boolean.*`            | toggles it                                                 |
| `fp-button` | `button.*`, `input_button.*`, `script.*`, `scene.*` | presses it, or runs the script or scene                    |
| `fp-cover`  | `cover.*`                                           | opens or closes it. A wide tile adds up, stop and down     |
| `fp-vacuum` | `vacuum.*`                                          | starts or pauses it. A wide tile adds the vacuum's buttons |
| `fp-select` | `select.*`, `input_select.*`                        | opens a menu of the options, or moves to the next one      |
| `fp-camera` | `camera.*`                                          | opens the camera's dialog                                  |

On every tile but the title, a long press or a right click opens Home Assistant's more info dialog for the entity. With a keyboard, Enter or Space taps and the context menu key or Shift+F10 holds.

A tile that is on is light and opaque with its icon in color. One that is off is frosted glass. One whose entity is unavailable is dimmed, says so, and does nothing when tapped.

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
| `size`         | `small`             | `small` is a quarter of a section's width, `wide` is half of it                                      |
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

| Key              | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `battery_entity` | A sensor with the battery level, for a vacuum that does not report it |

A wide tile shows pause or start, stop, and back to the dock, each only when the vacuum supports it.

`fp-select`

| Key            | Default | Description                                                               |
| -------------- | ------- | ------------------------------------------------------------------------- |
| `tap_behavior` | `menu`  | `menu` opens the options under the tile, `cycle` moves to the next option |

`fp-camera`

| Key            | Default | Description                                                                       |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `camera_view`  | `auto`  | `auto` shows a still that refreshes, `live` streams                               |
| `aspect_ratio` | `16:9`  | The picture's shape, as `width:height`. Ignored when `grid_options` sets the rows |

`fp-split`

A layout card for a panel view. Its `main` card takes the left two thirds of the screen and its `side` cards the right third, laid out on a grid of 12 columns like a section and centered top to bottom. A small tile takes 3 columns, a wide one 6, and a title or a camera all 12. When the screen is narrower than `breakpoint`, the side cards go under the main one, which takes the whole width. A floorplan card with no `aspect_ratio` is square on a phone.

| Key          | Default                   | Description                                        |
| ------------ | ------------------------- | -------------------------------------------------- |
| `main`       |                           | The card on the left, usually the floorplan card   |
| `side`       |                           | The cards on the right                             |
| `empty_text` | `Nothing to control here` | Shown on the right while every side card is hidden |
| `breakpoint` | `900`                     | The width in pixels under which the two stack      |

```yaml
type: panel
cards:
  - type: custom:fp-split
    main:
      type: custom:floorplan-3d
      rooms: []
    side:
      - type: custom:fp-title
        title: Ambience
        room_filter: home
      - type: custom:fp-toggle
        entity: switch.all_lights
        room_filter: home
      - type: custom:fp-title
        area: kitchen
        room_filter: room
      - type: custom:fp-toggle
        entity: light.kitchen
        room_filter: room
```

## Icons

`ph:` icons come from [Phosphor](https://phosphoricons.com) and are built into the card, so they show offline. A tile that is on shows the filled weight of its icon and one that is off shows the regular one. Add `-fill` to a name, as in `ph:heart-fill`, to always show it filled.

These are included:

armchair, arrow-line-down, arrow-line-up, bathtub, battery-charging, battery-empty, battery-full, battery-high, battery-low, battery-medium, bed, bell, broom, camera, caret-down, caret-up, cat, check, circle, clock, cooking-pot, couch, cursor-click, desktop, door, door-open, drop, fan, film-strip, fire, fork-knife, garage, hand-tap, heart, house, house-line, lamp, lamp-pendant, lightbulb, lightbulb-filament, lightning, list, list-bullets, list-checks, lock, lock-open, map-trifold, monitor, moon, oven, pause, paw-print, plant, play, plug, plugs, popcorn, potted-plant, power, projector-screen, question, robot, rows, security-camera, shower, sliders, snowflake, sparkle, spray-bottle, square-half-bottom, star, stop, sun, television, thermometer, timer, toggle-left, toggle-right, toilet, tree, video-camera, warning, wind, x.

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

| Token                         | Default                    | What it changes                                             |
| ----------------------------- | -------------------------- | ----------------------------------------------------------- |
| `fp-tile-radius`              | `24px`                     | The corner radius                                           |
| `fp-tile-padding`             | `14px`                     | The space inside a tile                                     |
| `fp-tile-gap`                 | `10px`                     | The space between tiles, used by the theme                  |
| `fp-tile-bg-active`           | `rgba(255, 255, 255, .94)` | The background of a tile that is on                         |
| `fp-tile-bg-inactive`         | `rgba(118, 118, 128, .24)` | The background of a tile that is off                        |
| `fp-tile-blur`                | `24px`                     | How much the glass blurs what is behind it                  |
| `fp-tile-shadow`              | `none`                     | A box shadow under every tile                               |
| `fp-tile-opacity-inactive`    | `1`                        | The icon and text of a tile that is off                     |
| `fp-tile-opacity-unavailable` | `.45`                      | A tile whose entity is unavailable                          |
| `fp-tile-icon-size`           | `28px`                     | The icon                                                    |
| `fp-tile-name-size`           | `15px`                     | The name                                                    |
| `fp-tile-state-size`          | `13px`                     | The line under the name                                     |
| `fp-tile-duration`            | `200ms`                    | How long a tile takes to change                             |
| `fp-tile-press-scale`         | `.96`                      | How far a tile shrinks while pressed                        |
| `fp-text-active`              | `#1c1c1e`                  | The text on a tile that is on                               |
| `fp-text-inactive`            | `#ffffff`                  | The text on a tile that is off                              |
| `fp-text-secondary-opacity`   | `.6`                       | The line under the name                                     |
| `fp-accent`                   | `#0a84ff`                  | The icon of an `input_boolean`, script or select that is on |
| `fp-accent-light`             | `#ffb340`                  | The icon of a light or a switch that is on                  |
| `fp-accent-cover`             | `#32ade6`                  | The icon of an open cover                                   |
| `fp-accent-climate`           | `#ff9f0a`                  | Kept for a climate tile                                     |
| `fp-font-tile`                | Inter                      | The tiles' font                                             |
| `fp-font-title`               | Inter Tight                | The headings' font                                          |
| `fp-title-size`               | `30px`                     | The headings' size                                          |
| `fp-title-opacity`            | `.92`                      | The headings' opacity                                       |
| `fp-title-color`              | the theme's text color     | The headings' color                                         |
| `fp-menu-bg`                  | dark frosted glass         | The select tile's menu                                      |
| `fp-menu-text`                | `#ffffff`                  | The text in that menu                                       |

On a light dashboard, a tile that is off is lighter glass with dark text, unless the theme sets its own.

The fonts load from Google Fonts. Without a connection the tiles fall back to the system font.
