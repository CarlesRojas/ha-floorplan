import * as climate from '#/tiles/features/climate.tsx'
import * as cover from '#/tiles/features/cover.tsx'
import * as light from '#/tiles/features/light.tsx'
import * as media from '#/tiles/features/media.tsx'
import * as other from '#/tiles/features/other.tsx'
import { domainOf, listOf, numberOf, supports, type FeatureProps } from '#/tiles/features/parts.tsx'
import type { EntityState } from '#/types.ts'
import type { ComponentType } from 'react'

// The features a tile can show beside its icon, by the names Home
// Assistant gives its own tile features. Each says which domains it is
// for and whether an entity has what it needs, so the card picker offers
// only the ones that work.

export type FeatureDef = {
  id: string
  // How the card picker names the suggestion, and the editor the choice.
  label: string
  domains: string[]
  supports?: (entity: EntityState) => boolean
  // What it draws across from the icon, so the tile stays two rows tall.
  // A feature without one is the whole tile instead, drawn by the tile
  // itself.
  View?: ComponentType<FeatureProps>
  // Too big to sit beside the icon, so it goes along the bottom and makes
  // the tile a row taller.
  row?: boolean
  // Too many buttons to fit beside the icon of a small tile, so a tile
  // with it is always wide, or only for an entity it says.
  wide?: boolean | ((entity: EntityState) => boolean)
  // What the tile says under its name while it is on, in place of what it
  // would say without the feature, like a light's white in kelvin.
  state?: (entity: EntityState) => string | undefined
}

const has = (attribute: string) => (entity: EntityState) => listOf(entity, attribute).length > 0
const bit = (value: number) => (entity: EntityState) => supports(entity, value)
const numeric = (entity: EntityState) => Number.isFinite(Number(entity.state)) && entity.state !== ''
const menu = (id: keyof typeof climate.MENUS) => (props: FeatureProps) => (
  <climate.ModeMenu {...props} menu={climate.MENUS[id]} />
)

const COVERS = ['cover', 'valve']

export const FEATURES: FeatureDef[] = [
  { id: 'brightness', label: 'Brightness', domains: ['light'], supports: light.dims },
  {
    id: 'color-temp',
    label: 'Color temperature',
    domains: ['light'],
    supports: light.warms,
    View: light.ColorTemp,
    state: light.tempState,
  },
  {
    id: 'color',
    label: 'Color',
    domains: ['light'],
    supports: light.colors,
    View: light.Hue,
    state: light.hueState,
  },
  {
    id: 'color-favorites',
    label: 'Favorite colors',
    domains: ['light'],
    supports: e => light.warms(e) || light.colors(e),
    View: light.ColorFavorites,
  },
  { id: 'effect', label: 'Effect', domains: ['light'], supports: has('effect_list'), View: light.Effect },
  {
    id: 'open-close',
    label: 'Open and close',
    domains: COVERS,
    supports: e => supports(e, cover.OPEN) || supports(e, cover.CLOSE),
    View: cover.OpenClose,
  },
  { id: 'position', label: 'Position', domains: COVERS, supports: bit(cover.SET_POSITION) },
  {
    id: 'position-favorite',
    label: 'Favorite positions',
    domains: COVERS,
    supports: bit(cover.SET_POSITION),
    View: cover.Favorites,
    wide: true,
  },
  {
    id: 'tilt',
    label: 'Tilt',
    domains: ['cover'],
    supports: e => supports(e, cover.OPEN_TILT) || supports(e, cover.CLOSE_TILT),
    View: cover.Tilt,
  },
  {
    id: 'tilt-position',
    label: 'Tilt position',
    domains: ['cover'],
    supports: bit(cover.SET_TILT),
  },
  {
    id: 'tilt-favorite',
    label: 'Favorite tilts',
    domains: ['cover'],
    supports: bit(cover.SET_TILT),
    View: props => <cover.Favorites {...props} tilt />,
    wide: true,
  },
  { id: 'speed', label: 'Speed', domains: ['fan'], supports: bit(cover.FAN.speed) },
  {
    id: 'preset-modes',
    label: 'Preset',
    domains: ['fan'],
    supports: e => supports(e, cover.FAN.preset) && has('preset_modes')(e),
    View: cover.FanPreset,
  },
  {
    id: 'direction',
    label: 'Direction',
    domains: ['fan'],
    supports: bit(cover.FAN.direction),
    View: cover.FanDirection,
  },
  {
    id: 'oscillate',
    label: 'Oscillate',
    domains: ['fan'],
    supports: bit(cover.FAN.oscillate),
    View: cover.FanOscillate,
  },
  {
    id: 'hvac-modes',
    label: 'Modes',
    domains: ['climate'],
    supports: has('hvac_modes'),
    View: climate.HvacModes,
    wide: true,
  },
  {
    id: 'target-temperature',
    label: 'Target temperature',
    domains: ['climate', 'water_heater'],
    supports: e => numberOf(e, 'temperature') !== null || numberOf(e, 'target_temp_low') !== null,
    View: climate.TargetTemperature,
    // A range is two temperatures with minus and plus around them.
    wide: e => numberOf(e, 'temperature') === null && numberOf(e, 'target_temp_low') !== null,
  },
  {
    id: 'preset-modes',
    label: 'Preset',
    domains: ['climate'],
    supports: has('preset_modes'),
    View: menu('preset-modes'),
  },
  { id: 'fan-modes', label: 'Fan', domains: ['climate'], supports: has('fan_modes'), View: menu('fan-modes') },
  { id: 'swing-modes', label: 'Swing', domains: ['climate'], supports: has('swing_modes'), View: menu('swing-modes') },
  {
    id: 'swing-horizontal-modes',
    label: 'Side to side swing',
    domains: ['climate'],
    supports: has('swing_horizontal_modes'),
    View: menu('swing-horizontal-modes'),
  },
  {
    id: 'target-humidity',
    label: 'Target humidity',
    domains: ['climate', 'humidifier'],
    supports: e => numberOf(e, 'humidity') !== null && (domainOf(e) === 'humidifier' || supports(e, 4)),
    View: climate.TargetHumidity,
  },
  {
    id: 'operation-modes',
    label: 'Operation mode',
    domains: ['water_heater'],
    supports: has('operation_list'),
    View: menu('operation-modes'),
  },
  { id: 'modes', label: 'Mode', domains: ['humidifier'], supports: has('available_modes'), View: menu('modes') },
  {
    id: 'playback',
    label: 'Playback',
    domains: ['media_player'],
    supports: e =>
      [media.MEDIA.pause, media.MEDIA.play, media.MEDIA.previous, media.MEDIA.next].some(b => supports(e, b)),
    View: media.Playback,
  },
  {
    id: 'volume-slider',
    label: 'Volume',
    domains: ['media_player'],
    supports: bit(media.MEDIA.volumeSet),
    View: media.VolumeSlider,
  },
  {
    id: 'volume-buttons',
    label: 'Volume buttons',
    domains: ['media_player'],
    supports: e => supports(e, media.MEDIA.volumeStep) || supports(e, media.MEDIA.volumeSet),
    View: media.VolumeButtons,
  },
  {
    id: 'source',
    label: 'Source',
    domains: ['media_player'],
    supports: e => supports(e, media.MEDIA.source) && has('source_list')(e),
    View: media.Source,
  },
  {
    id: 'sound-mode',
    label: 'Sound mode',
    domains: ['media_player'],
    supports: e => supports(e, media.MEDIA.soundMode) && has('sound_mode_list')(e),
    View: media.SoundMode,
  },
  { id: 'commands', label: 'Lock and unlock', domains: ['lock'], View: other.LockCommands },
  { id: 'open-door', label: 'Open the door', domains: ['lock'], supports: bit(1), View: other.OpenDoor },
  { id: 'commands', label: 'Commands', domains: ['vacuum'], View: other.VacuumCommands, wide: true },
  {
    id: 'fan-speed',
    label: 'Suction',
    domains: ['vacuum'],
    supports: e => supports(e, other.VACUUM_FAN_SPEED) && has('fan_speed_list')(e),
    View: other.VacuumFanSpeed,
  },
  { id: 'commands', label: 'Commands', domains: ['lawn_mower'], View: other.MowerCommands },
  {
    id: 'alarm-modes',
    label: 'Alarm modes',
    domains: ['alarm_control_panel'],
    View: other.AlarmModes,
    wide: true,
  },
  { id: 'actions', label: 'Counter buttons', domains: ['counter'], View: other.CounterActions },
  { id: 'actions', label: 'Timer buttons', domains: ['timer'], View: other.TimerActions },
  {
    id: 'select-options',
    label: 'Options',
    domains: ['select', 'input_select'],
    supports: has('options'),
    View: other.SelectOptions,
  },
  {
    id: 'numeric-input',
    label: 'Number',
    domains: ['number', 'input_number'],
    supports: numeric,
    View: other.NumericInput,
  },
  { id: 'date-set', label: 'Date', domains: ['date', 'datetime', 'input_datetime'], View: other.DateSet },
  { id: 'update-actions', label: 'Install', domains: ['update'], View: other.UpdateActions },
  {
    id: 'button',
    label: 'Button',
    domains: ['button', 'input_button', 'script', 'scene'],
    View: other.PressButton,
  },
  {
    id: 'trend-graph',
    label: 'Graph',
    domains: ['sensor'],
    supports: e => numeric(e) && typeof e.attributes.unit_of_measurement === 'string',
    View: other.TrendGraph,
  },
  {
    id: 'bar-gauge',
    label: 'Bar',
    domains: ['sensor'],
    supports: e => numeric(e) && e.attributes.unit_of_measurement === '%',
    View: other.BarGauge,
  },
]

// The features an entity can have, in the order the card picker offers them.
export function featuresFor(entity: EntityState | undefined) {
  if (!entity) return []
  const domain = domainOf(entity)
  return FEATURES.filter(f => f.domains.includes(domain) && (f.supports?.(entity) ?? true))
}

// Whether a tile's feature goes along its bottom, making it a row taller.
export const addsRow = (feature: string | undefined) =>
  !!feature && !!FEATURES.find(f => f.id === feature && f.View && f.row)

// What a tile with the feature says under its name, when the feature
// has something to say.
export const featureState = (feature: string | undefined, entity: EntityState) =>
  FEATURES.find(f => f.id === feature && f.domains.includes(domainOf(entity)))?.state?.(entity)

// Whether a tile is wide, because its config says so or because its
// feature only fits a wide one, for its entity when it is known.
export const isWide = (config: { size?: string; entity?: string; feature?: string }, entity?: EntityState) =>
  config.size === 'wide' ||
  (!!config.feature &&
    FEATURES.some(
      f =>
        f.id === config.feature &&
        f.domains.includes(config.entity?.split('.')[0] ?? '') &&
        (typeof f.wide === 'function' ? !!entity && f.wide(entity) : !!f.wide),
    ))

// Whether the feature is drawn across from the icon.
export const besideIcon = (feature: string | undefined) =>
  !!feature && !!FEATURES.find(f => f.id === feature && f.View && !f.row)

// The features of a domain, for the editor, whatever the entity has.
export function featuresOf(domains: string[] | 'any') {
  const seen = new Map<string, string>()
  for (const f of FEATURES)
    if ((domains === 'any' || f.domains.some(d => domains.includes(d))) && !seen.has(f.id)) seen.set(f.id, f.label)
  return [...seen].map(([value, label]) => ({ value, label }))
}

// The feature a tile's config names, drawn for its entity.
export function Feature(props: FeatureProps) {
  const domain = domainOf(props.entity)
  const def = FEATURES.find(f => f.id === props.config.feature && f.domains.includes(domain))
  if (!def?.View) return null
  const View = def.View
  return (
    <div className="fp-feature">
      <View {...props} />
    </div>
  )
}
