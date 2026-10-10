# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions
follow [Semantic Versioning](https://semver.org/).

Write every change under Unreleased as you make it. The release workflow
moves that section under the new version and uses it as the release notes.

## [Unreleased]

### Added

- Twelve tile cards come with the floorplan card: a heading, and tiles for lights, switches and anything else on or off, buttons and scenes, covers, vacuums, option lists, cameras, thermostats, media players, locks, the weather with its forecast, and any other entity with its state. A tap does the obvious thing, a long press opens the entity's dialog, and each one can be set up in the visual card editor.
- When the floorplan card flies to a room, the Floorplan tiles of every other area hide and empty sections fold away, until the card goes back to the whole home.
- A Floorplan Glass theme with a dark gradient background, and dialogs and cards to match the tiles.
- The floorplan card can show a side panel of tiles, switched on in its editor in any kind of view: the floorplan takes two thirds of the card and a tile for each device on the plan fills the rest, room by room, and on a phone the tiles go under a square floorplan. Scenes, sensors, thermostats and other entities with no piece on the plan can be added to a room's tiles from the same editor. Each room's tiles can be put in order by dragging them in the editor.
- The tile icons can be picked as `ph:` icons in Home Assistant's icon picker and used on any card.
- The floorplan card's `aspect_ratio` can be `fill`, to take the whole height of what holds it.
- The side panel can have a Scenes section, set in the card's editor above the tiles by room, that takes any entity, such as a scene, a script, an automation or a group of lights; with any there, the whole home shows only those tiles and each room's tiles show only while that room is in view.
- A tile's `room_filter` can be `room`, to show only while its room is in view, or `home`, to show only while the whole home is.
- A leak sensor to put on the floor: it glows blue and a puddle spreads round it when it gets wet.
- A device removed from Home Assistant is dropped from the card the next time its editor is opened, along with its bindings, so the card never keeps pointing at an entity that is gone.

### Changed

- The demo flat in demoflat.yaml is refurnished, with a camera, an alarm panel, a humidifier and a water heater, its side panel on with the tiles of each room in order, and a click on another room flying to it first.
- A TV or laptop that is on shows deep, muted colors glowing out of black, swaying between greens and blues and now and then going round every other color, and moves faster than before.
- A smart lock glows red while it is locked and green while it is unlocked.
- A click on a piece bound to something it cannot switch, like a camera or a thermostat, opens its dialog, where it used to do nothing.
- The air out of an air conditioner is a haze of many fine, soft specks that leave from its outlet, blue when cooling and red when heating, which blends into the room, where it used to be bright blue or orange puffs.
- A towel rail has an Off the floor setting for how high it hangs, and by default hangs half a meter higher than before.
- In a panel view, where there is nothing to scroll, the mouse wheel zooms the floorplan and a finger dragged up or down turns it.
- The view the card opens with always shows the whole home, whatever the card's shape: on a square or tall card the camera backs off along the saved angle until everything fits, and can still be zoomed and turned from there. On a card narrower than 600 px, as on a phone, the home is centered and fills the card with only a thin margin.
- A second click on the floor of the room in view always takes the camera back to the whole home, even after turning, panning or zooming inside the room, where it used to fly back to the room's view.

### Fixed

- When picking a device for a blind, window, projector screen or other piece, the devices of its own type are listed first, so a cover without a position is no longer lost among switches.
- A speaker, floor speaker or soundbar on pause stops sending out sound waves, and keeps its lights until it is switched off.
- A piece can be set on top of a basin, where it used to sink into it.

## [1.2.5] - 2026-10-08

### Changed

- On a light dashboard the home is lit brighter, so it no longer looks dark against a white background. The lighter the dashboard, the brighter the room, and dark dashboards look the same as before.

## [1.2.4] - 2026-10-03

### Added

- Every room has a view from the start: one with none saved is framed alone, from the same side as the view the card opens with, so a click on any room flies the camera to it. Forgetting a saved view, of a room or of the card, goes back to the one it comes with.

### Changed

- A click on a device now acts on it from anywhere by default. Set `first_click: room`, or switch the Click button in the editor's 3D view, to have the first click go to the device's room as before.
- Going from one room to another, the room left behind fades out while the new one fades in, for as long as the camera takes to fly there, where the change used to be over well before the camera landed.
- Floors that touch now meet with no gap, and a floor's edges and corners are rounded only where it stands free, top and bottom alike, with a wider rounding than before.
- A floor's boards and tiles are set off a little from the room's outline, so the sides of the floor take the color of a board or a tile, not of the joint between two.

### Fixed

- A door and a window stand exactly on the line between two rooms, as far into one as into the other, where they used to sit a little inside the room they were put in.
- After Save & Close in the editor, the Save button of Home Assistant's own dialog can be pressed to leave, where it used to be greyed out and only Cancel was left.
- The panels inside a kitchen counter no longer show through a sink set where two of its units meet.

## [1.2.3] - 2026-10-03

### Added

- A blind has an Other side of wall switch that hangs it on the far side of the wall it is on, outside the room it belongs to, which is where a shutter on an outside wall goes. It works whether or not there is a room on that side.
- A toaster has a Depth slider, and one made shallow enough has a single slot where it had two.
- A piece that can stand on others has an arrow down and an arrow up in its panel that step it through the heights there are where it stands: the floor, every top under it, and the height it has on its own. A piece sent down to the floor stays on it when dragged, so it can go under a table. A height set with the old slider is kept, as one of the steps.
- A window, a door, a sliding door or a garage door with no device and a blind or a curtain over it passes its clicks to that blind, so a click on the glass works the blind whichever side of the window it hangs on. With two blinds side by side over it, each part of the glass works the blind over it, and where a blind and a curtain hang over the same part the click goes to the blind.

### Changed

- With the camera on a room, a click on a door or a window with no device in one of its walls now takes the camera to the room on the other side, where it used to go back to the whole home. One with a blind or a curtain over it still works that blind.
- On a touch screen, a finger dragged up or down over the card scrolls the dashboard where it used to turn the home. Start the drag sideways to turn the home, and it tilts too for as long as the finger stays down.
- A door, window, blind, curtain or awning in a wall between two rooms now belongs to both: it stays in view and can be pressed when the camera goes to either room, whichever of the two it was put in. From the whole home, a click on it goes to the room it is looked at from, so turning the home round to see the door from its other side sends the click to the other room.

### Removed

- The Standing on slider and dropdown of the pieces that go on tables and counters are gone, replaced by the arrows above.

## [1.2.2] - 2026-10-03

### Added

- `aspect_ratio_mobile` gives the card another shape while it is narrower than 600 px, so one card can be 16:9 on a desktop and square on a phone.

### Changed

- The card has no background, border or shadow of its own any more: the home stands directly on the dashboard, in whatever theme it has, and fades away towards the card's edges where it used to be cut by them.
- A card that sets no `aspect_ratio` is now 16:9, and square while it is narrower than 600 px, where it used to be 4:3 at every width. A card that sets `aspect_ratio` keeps its shape.
- The first click on a device now goes to its room by default, when that room has a view, and the device answers once the camera is there. Set `first_click: device`, or switch the Click button in the editor's 3D view, to have devices answer from anywhere as before.
- The camera flies to a room, and back out of it, more than twice as fast.

### Removed

- The reset button in the card's bottom right corner is gone: a click on the empty space around the home takes the camera back to the opening view.

### Fixed

- A long press never sends the camera to a room or back home any more: on touch screens that call a long press early, holding a finger on a room's floor used to count as a click on it.
- A long press on a touch screen finds a device as far from the finger as a tap does, and opens its dialog where the browser's own menu used to get in the way.

## [1.2.1] - 2026-10-03

### Added

- The card can send the first click on a device to its room instead of the device, which then answers once the camera is in the room: switch it with the Click button in the corner of the editor's 3D view, or with `first_click: room`.

### Changed

- Clicking a room that has a view now fades the rest of the home away, so the room stands alone and only what is in it can be clicked, and clicking outside it brings the camera and the other rooms back.

## [1.2.0] - 2026-10-02

### Added

- The editor can show a picture of your plan under the drawing to trace the rooms over, as just its lines or faded as you like: choose it from the image button in the toolbar, click it to move and resize it to scale, show the whole picture or only its lines, and remove it when the rooms are drawn. The picture stays in your browser and is never saved with the card.

### Changed

- The furniture that stands for no device is drawn a room at a time instead of a part at a time, so the card moves more smoothly on a phone or a tablet and looks the same.
- A click or a tap near a device goes to the device, and only a press with nothing at all around it goes to the floor of the room. A tap with a finger reaches a little further than a click.

### Fixed

- The darkening at the corners of the card showed as rings of gray instead of a smooth shade.
- Flying to a room's view no longer starts with a jump: the camera moves in one continuous motion from where it stands to the view.
- On a dashboard scrolled down, a gesture with one or two fingers no longer opens with a leap of the camera, a sudden zoom, slide or tilt.
- The editor tab showed both the mouse controls and the finger gestures on many phones and tablets. It now shows the finger gestures on a device with a touch screen and the mouse controls on any other, never both.
- Many phones and tablets were drawn with the heavier settings meant for a computer, which made the card slower on them than it should be.
- The first time a light was switched on after the card opened, it came on late and the card stuttered, most of all on a phone or a tablet. It now comes on at once, as it did from the second time on.

## [1.1.0] - 2026-09-27

### Added

- The card's editor tab shows how to rotate, pan and zoom the view, with the mouse buttons or the finger gestures the device uses.
- Corners and edges where things meet are shaded darker, so the furniture sits in the room instead of floating on the floor.
- The corners of the card are darkened, to draw the eye to the home.
- A device that cannot keep up while the camera moves draws the picture a little softer, and goes back to full sharpness once it can.

### Changed

- A click on a piece that stands for no device does what a click on the floor of its room does: the camera flies to that room's view, or back to the opening view when it was already there.
- The space around the home is a dark gray instead of a dark blue.
- Daylight is dimmer, so the lamps still stand out during the day.
- Scrolling over the card no longer zooms it, so a page can be scrolled past it. The mouse zooms by dragging with the wheel pressed, and the wheel still zooms the editor's preview.
- Flying to a room seen from the other side of the home now goes round the home at the camera's height, taking a little longer, instead of swinging over the top and looking down.
- The card only redraws when something in it changes, a light, a door, the camera, so a still home no longer keeps the graphics chip busy or drains a tablet's battery.
- Rounded edges, lamp shades, cushions and rug fringes are built from far fewer triangles, which look the same at the card's size but draw much faster on a phone or a tablet.
- On a phone or a tablet only the two brightest lamps cast shadows, instead of four.

### Fixed

- Zooming by dragging with the wheel pressed follows the distance dragged instead of leaping on fast mice.
- Dragging with a finger turns the camera at half the speed it did, so a touch drag no longer spins the home around.
- A two finger gesture now either pans or zooms, chosen by how it starts, instead of doing both at once.
- Starting a pinch no longer jumps the camera back to its saved view.
- Turning a light on or off no longer freezes the card for a moment while the shaders for the new lighting are built.

## [1.0.1] - 2026-09-27

### Changed

- The card's background is always dark, whatever the Home Assistant theme, so the lights in the home stand out.

## [1.0.0] - 2026-09-27

### Added

- A 3D model of your home drawn from rooms you trace on a plan.
- A catalog of furniture, lights, appliances, doors, windows and sensors, each in several styles.
- Devices from Home Assistant bound to the pieces that stand for them, so a click on a piece controls the device and the piece shows its state.
- A visual editor inside the card's dialog: draw rooms, place and move pieces, bind devices, try states.
- Saved camera views: the one the card opens with and one per room that a click on its floor flies to. A second click on that floor, or a click on the empty space around the home, brings the camera back.

### Fixed

### Changed

[Unreleased]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.5...HEAD
[1.2.5]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.4...v1.2.5
[1.2.4]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.3...v1.2.4
[1.2.3]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.2...v1.2.3
[1.2.2]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/CarlesRojas/ha-floorplan/releases/tag/v1.0.0
