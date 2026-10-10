# Changelog

All notable changes to this project are listed here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the versions
follow [Semantic Versioning](https://semver.org/).

Write every change under Unreleased as you make it. The release workflow
moves that section under the new version and uses it as the release notes.

## [Unreleased]

### Added

- The floorplan card lays a soft gradient behind its view, with five to choose from in the card's editor and a separate choice for a light and a dark dashboard.
- Buttons, scripts and scenes can drive nearly every piece that switches on: each press plays it once and it goes back, so a light blinks, a fan goes one turn round, a fridge or a window opens and shuts, and a litter box turns over and back a single time.

- The preview in the card's editor shows the chosen background, and picking another one there changes only the background without loading the flat again.
- The side panel's tiles fade out and the next room's fade in when the floorplan card flies to a room or back to the whole home.
- On a light dashboard a tile that is on is dark with white text, so it stands out from the page.
- A room flown to shows a small rounded triangle, made of the next room's floor, just past each stretch it shares with a room beside it that has no door in between, and a click on it flies to that room, the way a click on a door does.
- A room selected in the editor lists the rooms beside it, shows which ones a door leads into, and has a switch for each open one to show or hide the triangle into it.
- Twelve tile cards come with the floorplan card: a heading, and tiles for lights, switches and anything else on or off, buttons and scenes, covers, vacuums, option lists, cameras, thermostats, media players, locks, the weather with its forecast, and any other entity with its state. A tap does the obvious thing, a long press opens the entity's dialog, and each one can be set up in the visual card editor.
- When the floorplan card flies to a room, the Floorplan tiles of every other area hide and empty sections fold away, until the card goes back to the whole home.
- A Floorplan Glass theme with a dark gradient background, and dialogs and cards to match the tiles.
- The floorplan card can show a side panel of tiles, switched on in its editor in any kind of view: the floorplan takes two thirds of the card and a tile for each device on the plan fills the rest, room by room, and on a phone the tiles go under a square floorplan. Scenes, sensors, thermostats and other entities with no piece on the plan can be added to a room's tiles from the same editor. Each room's tiles can be put in order by dragging them in the editor.
- The tile icons can be picked as `ph:` icons in Home Assistant's icon picker and used on any card.
- The floorplan card's `aspect_ratio` can be `fill`, to take the whole height of what holds it.
- The side panel can have a section for the whole home, set in the card's editor above the tiles by room, with a heading that reads Home unless it is renamed and any entities, such as a scene, a script, the weather or a group of lights; with any there, the whole home shows only those tiles and each room's tiles show only while that room is in view.
- A tile with no icon of its own shows the icon picked for its entity in Home Assistant.
- A TV or a monitor that is on lights the room around it in the colors on its screen, so it shows it is on even when the screen faces away.
- The tile cards show a preview in Home Assistant's card picker, and the ones made for an entity show up under Community when a card is added by entity, with the cover, media, vacuum and climate tiles offered wide with their buttons and also small.
- A tile's `room_filter` can be `room`, to show only while its room is in view, or `home`, to show only while the whole home is.
- A leak sensor to put on the floor: it glows blue and a puddle spreads round it when it gets wet.
- A device removed from Home Assistant is dropped from the card the next time its editor is opened, along with its bindings, so the card never keeps pointing at an entity that is gone.
- A lowered projection screen shows the same moving colors as a TV that is on when a projector that is on faces it, from either side, and the room around the end of a projector's beam is lit in those colors.
- Every setting of a piece or a room, its sizes, rotation, colors, style and floor included, has a button beside it that puts it back to its default, and the button only shows once the setting has changed.
- The 3D preview of a selected piece in the editor can be zoomed and panned as well as turned, and a button in its corner brings the view back.
- When a card is added by entity, every tile is also offered with each control it can show beside its icon, like a fan's direction, a thermostat's modes, an alarm's modes or a media player's volume, the same way Home Assistant offers its own tile.
- A light tile can be its own brightness slider: the whole tile fills as far as the light is bright, a drag sideways anywhere on it dims or brightens it, and a tap still turns it on or off.
- A fan tile can be its own speed slider the same way, moving freely under the finger and settling on the nearest speed the fan has when it lifts.
- A cover or a valve tile can be its own position slider the same way, filling as far as it is open, or as far as its slats are tilted, and a tap opens or closes it.
- A tile's control sits in its top right corner beside the icon, so a tile with one is as short as a plain tile, and the few with too many buttons for a small tile, like favorite positions, an alarm's modes or a vacuum's commands, always make it wide.
- A light tile can show a slim color temperature or color bar beside its icon, with a round handle, so it stays as short as a plain tile, and its state line says the light's white in kelvin or the name of its color, whichever the light is in, with a faint handle on the bar for the other one, and while the bar is dragged the tile takes that color and keeps it until the light answers.
- Eight larger cards come with the tiles and are offered beside them when a card is added by entity: an alarm panel with a keypad, a dial for a thermostat, a water heater, a humidifier or a light's brightness, a media control with the cover art, a calendar agenda, a to-do list, a history graph, a gauge and a map.

### Changed

- The rainbow of a light's color bar and its favorite colors are softer and even in lightness, so no color glares on the tile.
- The on and off switch under a light's or a humidifier's dial and a fan's oscillate control are now pills that fill in while on, in place of switches.
- A cover that cannot stop shows only up and down on its wide tile.
- The weather tile can show the next hours or the next days, and the card picker offers both.
- The camera tile also shows an image entity.
- The shower's glass door stays shut, so a click on the shower always goes to the device behind it, like any other piece.

- The editor's Discard button is now Close: it closes straight away when there is nothing to save, and asks before throwing changes away when there is.
- Color settings in the editor show just the rounded color, with no gray box behind it.
- The sizes of every piece go in steps of 5 cm, the same steps it moves by on the plan, and its rotation goes in steps of 5°.
- The 2D plan in the editor looks cleaner: a fainter grid, no lines through the origin, every room in the same light gray with an outline, pieces without a device in a neutral gray, plain round icons with no ring, and a scale drawn as one rounded line.
- The editor's sidebar starts wider.
- Rooms first and the direction of the sun moved out of the editor into the card's settings, right under the button that opens the editor.
- In the card's settings, each list of entities ends in an Add entity button that opens a search right under it, listing each entity with its icon, name and id, and picking one with a click or Enter adds it.
- In the editor, clicking a piece with a device, or changing it under Try its states, only tries it out there and never switches the real device. The editor starts from how the home is when it opens and shows it that way again once it closes.
- The full screen editor has a cleaner look, with softer colors, settings gathered in rounded groups, frosted menus and tooltips, switches, slim sliders with a pill shaped handle and lighter buttons.
- The card's settings in the dashboard dialog share the editor's look, with each setting in a rounded group and its explanation under it.
- The background that keeps the dashboard's own is now called Plain and shows as a flat swatch like the others, without the dotted outline.
- Under the pointer, the sign that leads into the next room darkens a little instead of lighting up.
- Up to eight lamps cast shadows at once on a computer and four on a phone or tablet, up from four and two.
- When a lamp hands its shadow to a brighter light that comes on, the shadow fades out and the new one fades in instead of switching at once.
- A projector's beam goes through the same colors as a TV that is on, where it used to be white.
- The demo flat in demoflat.yaml is refurnished, with a camera, an alarm panel, a humidifier and a water heater, its side panel on with the tiles of each room in order, and a click on another room flying to it first.
- A TV or laptop that is on shows deep, muted colors glowing out of black, swaying between greens and blues and now and then going round every other color, and moves faster than before.
- A smart lock glows red while it is locked and green while it is unlocked.
- A click on a piece bound to something it cannot switch, like a camera or a thermostat, opens its dialog, where it used to do nothing.
- The air out of an air conditioner is a haze of many fine, soft specks that leave from its outlet, blue when cooling and red when heating, which blends into the room, where it used to be bright blue or orange puffs.
- A towel rail has an Off the floor setting for how high it hangs, and by default hangs half a meter higher than before.
- In a panel view, where there is nothing to scroll, the mouse wheel zooms the floorplan and a finger dragged up or down turns it.
- The view the card opens with always shows the whole home, whatever the card's shape: on a square or tall card the camera backs off along the saved angle until everything fits, and can still be zoomed and turned from there. On a card narrower than 600 px, as on a phone, the home is centered and fills the card with only a thin margin.
- A room flown to is fitted to the card the same way, with almost no margin: its saved view keeps its angle and backs off until the whole room shows, on a phone the room is centered and fills the card, and a room with no saved view is centered in the card. The camera flies straight to that view, and keeps the room fitted while the card changes size until it is turned, panned or zoomed.
- A second click on the floor of the room in view always takes the camera back to the whole home, even after turning, panning or zooming inside the room, where it used to fly back to the room's view.
- In the card's settings, pressing or changing the tiles of a room flies the preview to that room, and the Home tiles take it back to the whole home.
- A button, script or scene tile lights up when pressed, stays lit for half a second and then fades slowly back, and its Press pill does the same on its own.
- On a small tile, a pill that does something, like Press, is as wide as its words and sits at the right, as on a wide tile.
- The position tile of a blind, a shutter, a garage door or another cover that goes up and down fills from the bottom as it rises and is dragged up and down, an inverted one like a projector screen fills from the top as it comes down, and curtains, gates, doors and valves still fill from the left.
- A slider tile that is empty shows a faint handle at the side to pull it from, and the handles at both ends sit exactly halfway across the tile's padding.
- A thermostat's target temperature tile is always wide when it holds a range of two temperatures, since a small one had no room for them.
- A wide thermostat is two rows tall, with its mode buttons across from its name so the name and the state stay in the bottom left corner like on every other tile.
- A thermostat's modes tile is always wide, since a small one had no room for every mode.
- Temperatures on thermostats and dials show a degree sign, like 22°, and a thermostat's state reads as one phrase, like 20.5° to 22°.
- A thermostat's icon takes the color of the mode it runs in on every one of its tiles, and that color washes down from the top of the tile while it is on. In auto, or keeping a range, it takes the color of what it is doing, like orange while it heats, and no color while it waits.
- Each thermostat mode has its own color: grey for auto, green for keeping a range, orange for heating, blue for cooling, yellow for drying and teal for the fan alone.

### Fixed

- Buttons keep their fill and stay readable under the pointer, on a tile that is on or off and on a light or a dark dashboard.
- Colored icons, words and lines on the tiles, like the chosen mode, the Clear link of a to-do list or a light's icon, now stand out clearly from the tile in light and in dark, and the dimmer second lines are a little stronger.
- The editor's Discard changes dialog shows its buttons in their proper colors.
- When picking a device for a blind, window, projector screen or other piece, the devices of its own type are listed first, so a cover without a position is no longer lost among switches.
- A speaker, floor speaker or soundbar on pause stops sending out sound waves, and keeps its lights until it is switched off.
- A piece can be set on top of a basin, where it used to sink into it.
- Picking an option from a menu on a tile, like the mode of a humidifier, or typing an alarm code, no longer also turns the tile on or off.
- A small tile with a menu where nothing is chosen, like a fan running without a preset, now says what the menu picks instead of showing an empty pill.

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
