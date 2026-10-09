# HomeKit style tiles

Floorplan 3D comes with seven small cards in the style of Apple's Home app, to sit around the 3D model on the same dashboard. They are in the same `card.js`, so there is nothing more to install. They are made for a sections view.

| Card        | Takes                                               | A tap                                                      |
| ----------- | --------------------------------------------------- | ---------------------------------------------------------- |
| `hk-title`  | nothing                                             | nothing, it is a heading                                   |
| `hk-toggle` | `light.*`, `switch.*`, `input_boolean.*`            | toggles it                                                 |
| `hk-button` | `button.*`, `input_button.*`, `script.*`, `scene.*` | presses it, or runs the script or scene                    |
| `hk-cover`  | `cover.*`                                           | opens or closes it. A wide tile adds up, stop and down     |
| `hk-vacuum` | `vacuum.*`                                          | starts or pauses it. A wide tile adds the vacuum's buttons |
| `hk-select` | `select.*`, `input_select.*`                        | opens a menu of the options, or moves to the next one      |
| `hk-camera` | `camera.*`                                          | opens the camera's dialog                                  |

On every tile but the title, a long press or a right click opens Home Assistant's more info dialog for the entity. With a keyboard, Enter or Space taps and the context menu key or Shift+F10 holds.

A tile that is on is light and opaque with its icon in color. One that is off is frosted glass. One whose entity is unavailable is dimmed, says so, and does nothing when tapped.

## Example

```yaml
type: hk-toggle
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
| `room_filter`  | `hide`              | What a tile with no area does while a room is in view: `hide` or `show`                              |
| `tap_action`   |                     | Replaces what a tap does, in the format Home Assistant's own cards use                               |
| `hold_action`  | `more-info`         | Replaces what a long press does                                                                      |
| `haptic`       | `true`              | `false` turns off the short vibration the companion app gives on a tap                               |
| `grid_options` |                     | Home Assistant's own, to give the tile a size of your own in the section grid                        |

`tap_action` and `hold_action` take `action` as one of `toggle`, `more-info`, `navigate` with `navigation_path`, `url` with `url_path`, `perform-action` with `perform_action`, `data` and `target`, or `none`. Add `confirmation: true` to ask first.

```yaml
type: hk-button
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

`hk-title`

| Key     | Description                                                                   |
| ------- | ----------------------------------------------------------------------------- |
| `title` | The heading. Without one, the name of its `area`                              |
| `area`  | The area the heading belongs to, so it hides with the room filter like a tile |

`hk-cover`

| Key      | Default | Description                                                                                                             |
| -------- | ------- | ----------------------------------------------------------------------------------------------------------------------- |
| `invert` | `false` | Swaps what up and down do, for a projector screen or a blind wired the other way round, where closing it brings it down |

The buttons are never greyed out, since many covers do not know where they are. While a cover is partly open, its position is shown next to its state.

`hk-vacuum`

| Key              | Description                                                           |
| ---------------- | --------------------------------------------------------------------- |
| `battery_entity` | A sensor with the battery level, for a vacuum that does not report it |

A wide tile shows pause or start, stop, and back to the dock, each only when the vacuum supports it.

`hk-select`

| Key            | Default | Description                                                               |
| -------------- | ------- | ------------------------------------------------------------------------- |
| `tap_behavior` | `menu`  | `menu` opens the options under the tile, `cycle` moves to the next option |

`hk-camera`

| Key            | Default | Description                                                                       |
| -------------- | ------- | --------------------------------------------------------------------------------- |
| `camera_view`  | `auto`  | `auto` shows a still that refreshes, `live` streams                               |
| `aspect_ratio` | `16:9`  | The picture's shape, as `width:height`. Ignored when `grid_options` sets the rows |

## Icons

`ph:` icons come from [Phosphor](https://phosphoricons.com) and are built into the card, so they show offline. A tile that is on shows the filled weight of its icon and one that is off shows the regular one. Add `-fill` to a name, as in `ph:heart-fill`, to always show it filled.

These are included:

armchair, arrow-line-down, arrow-line-up, bathtub, battery-charging, battery-empty, battery-full, battery-high, battery-low, battery-medium, bed, bell, broom, camera, caret-down, caret-up, cat, check, circle, clock, cooking-pot, couch, cursor-click, desktop, door, door-open, drop, fan, film-strip, fire, fork-knife, garage, hand-tap, heart, house, house-line, lamp, lamp-pendant, lightbulb, lightbulb-filament, lightning, list, list-bullets, list-checks, lock, lock-open, map-trifold, monitor, moon, oven, pause, paw-print, plant, play, plug, plugs, popcorn, potted-plant, power, projector-screen, question, robot, rows, security-camera, shower, sliders, snowflake, sparkle, spray-bottle, square-half-bottom, star, stop, sun, television, thermometer, timer, toggle-left, toggle-right, toilet, tree, video-camera, warning, wind, x.

A name not in the list shows a question mark and logs a warning in the browser console. Any other icon is one `mdi:` name away.

## Room filtering

When a Floorplan 3D card on the dashboard flies to a room, every tile that belongs to another area hides, and a section left with nothing showing folds away. Going back to the whole home brings them all back. The room needs an area: set it in the editor, or as `area_id` on the room in the card's YAML.

A tile's area is its `area` option when it has one, else its entity's area, else the area of the entity's device. A tile with no area at all hides while a room is in view, and the browser console lists every such tile once. Give it an `area`, or `room_filter: show` to keep it in every room. A title with an `area` hides along with its tiles.

While the dashboard is being edited, every tile shows whatever room is in view.

The card tells the page which room is in view through a `hk-room-filter` event on `window`, with `{ area_id, room_id }` as its detail, or `null` for the whole home. The last one is kept in `window.__hkRoomFilter`. Other cards can listen for it too.

## Theme

[themes/homekit.yaml](../themes/homekit.yaml) is a Home Assistant theme to go with the tiles: a dark gradient behind the dashboard, and the dashboard's own colors and dialogs set to match. Copy it into the `themes` folder of your Home Assistant config, with this in `configuration.yaml`:

```yaml
frontend:
  themes: !include_dir_merge_named themes
```

Then pick **HomeKit** in your profile, or as the dashboard's theme.

The tiles look finished without it, and change with any theme that sets these:

| Token                         | Default                    | What it changes                                             |
| ----------------------------- | -------------------------- | ----------------------------------------------------------- |
| `hk-tile-radius`              | `24px`                     | The corner radius                                           |
| `hk-tile-padding`             | `14px`                     | The space inside a tile                                     |
| `hk-tile-gap`                 | `10px`                     | The space between tiles, used by the theme                  |
| `hk-tile-bg-active`           | `rgba(255, 255, 255, .94)` | The background of a tile that is on                         |
| `hk-tile-bg-inactive`         | `rgba(118, 118, 128, .24)` | The background of a tile that is off                        |
| `hk-tile-blur`                | `24px`                     | How much the glass blurs what is behind it                  |
| `hk-tile-shadow`              | `none`                     | A box shadow under every tile                               |
| `hk-tile-opacity-inactive`    | `1`                        | The icon and text of a tile that is off                     |
| `hk-tile-opacity-unavailable` | `.45`                      | A tile whose entity is unavailable                          |
| `hk-tile-icon-size`           | `28px`                     | The icon                                                    |
| `hk-tile-name-size`           | `15px`                     | The name                                                    |
| `hk-tile-state-size`          | `13px`                     | The line under the name                                     |
| `hk-tile-duration`            | `200ms`                    | How long a tile takes to change                             |
| `hk-tile-press-scale`         | `.96`                      | How far a tile shrinks while pressed                        |
| `hk-text-active`              | `#1c1c1e`                  | The text on a tile that is on                               |
| `hk-text-inactive`            | `#ffffff`                  | The text on a tile that is off                              |
| `hk-text-secondary-opacity`   | `.6`                       | The line under the name                                     |
| `hk-accent`                   | `#0a84ff`                  | The icon of an `input_boolean`, script or select that is on |
| `hk-accent-light`             | `#ffb340`                  | The icon of a light or a switch that is on                  |
| `hk-accent-cover`             | `#32ade6`                  | The icon of an open cover                                   |
| `hk-accent-climate`           | `#ff9f0a`                  | Kept for a climate tile                                     |
| `hk-font-tile`                | Inter                      | The tiles' font                                             |
| `hk-font-title`               | Inter Tight                | The headings' font                                          |
| `hk-title-size`               | `30px`                     | The headings' size                                          |
| `hk-title-opacity`            | `.92`                      | The headings' opacity                                       |
| `hk-title-color`              | the theme's text color     | The headings' color                                         |
| `hk-menu-bg`                  | dark frosted glass         | The select tile's menu                                      |
| `hk-menu-text`                | `#ffffff`                  | The text in that menu                                       |

On a light dashboard, a tile that is off is lighter glass with dark text, unless the theme sets its own.

The fonts load from Google Fonts. Without a connection the tiles fall back to the system font.
