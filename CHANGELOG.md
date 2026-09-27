# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions
follow [Semantic Versioning](https://semver.org/).

Write every change under Unreleased as you make it. The release workflow
moves that section under the new version and uses it as the release notes.

## [Unreleased]

### Added

- A 3D model of your home drawn from rooms you trace on a plan.
- A catalog of furniture, lights, appliances, doors, windows and sensors, each in several styles.
- Devices from Home Assistant bound to the pieces that stand for them, so a click on a piece controls the device and the piece shows its state.
- A visual editor inside the card's dialog: draw rooms, place and move pieces, bind devices, try states.
- Saved camera views: the one the card opens with and one per room that a click on its floor flies to. A second click on that floor, or a click on the empty space around the home, brings the camera back.

### Fixed

- Moving the camera with the right or middle button no longer toggles the piece under the pointer or opens its dialog. A right click still opens the dialog once let go.
- The robot vacuum drives straight off its dock and backs onto it, instead of turning on the spot when it leaves or comes home, and it always swings round the shorter way.

### Changed

- The camera view buttons in the editor light up under the pointer, and saving a view says so for a moment.

[Unreleased]: https://github.com/CarlesRojas/ha-floorplan/compare/main...HEAD
