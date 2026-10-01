# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions
follow [Semantic Versioning](https://semver.org/).

Write every change under Unreleased as you make it. The release workflow
moves that section under the new version and uses it as the release notes.

## [Unreleased]

### Changed

- The furniture that stands for no device is drawn a room at a time instead of a part at a time, so the card moves more smoothly on a phone or a tablet and looks the same.
- A click or a tap near a device goes to the device, and only a press with nothing at all around it goes to the floor of the room. A tap with a finger reaches a little further than a click.

### Fixed

- The darkening at the corners of the card showed as rings of gray instead of a smooth shade.
- Flying to a room's view no longer starts with a jump: the camera moves in one continuous motion from where it stands to the view.
- On a dashboard scrolled down, a gesture with one or two fingers no longer opens with a leap of the camera, a sudden zoom, slide or tilt.
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

[Unreleased]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.0.1...v1.1.0
[1.0.1]: https://github.com/CarlesRojas/ha-floorplan/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/CarlesRojas/ha-floorplan/releases/tag/v1.0.0
