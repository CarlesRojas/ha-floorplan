import { registerIcons, tileForm, titleForm, type Extra } from '#/tiles/editor.ts'
import { stubEntity, TileHost, type GridOptions, type TileConfig } from '#/tiles/host.tsx'
import Button from '#/tiles/cards/Button.tsx'
import Camera, { type CameraConfig } from '#/tiles/cards/Camera.tsx'
import Climate from '#/tiles/cards/Climate.tsx'
import Cover, { type CoverConfig } from '#/tiles/cards/Cover.tsx'
import Entity from '#/tiles/cards/Entity.tsx'
import Lock from '#/tiles/cards/Lock.tsx'
import Media from '#/tiles/cards/Media.tsx'
import Select, { type SelectConfig } from '#/tiles/cards/Select.tsx'
import Title, { type TitleConfig } from '#/tiles/cards/Title.tsx'
import Toggle from '#/tiles/cards/Toggle.tsx'
import Vacuum, { type VacuumConfig } from '#/tiles/cards/Vacuum.tsx'
import AlarmPanel from '#/tiles/cards/AlarmPanel.tsx'
import Calendar, { type CalendarConfig } from '#/tiles/cards/Calendar.tsx'
import Dial from '#/tiles/cards/Dial.tsx'
import Gauge, { type GaugeConfig } from '#/tiles/cards/Gauge.tsx'
import Graph, { isNumeric, type GraphConfig } from '#/tiles/cards/Graph.tsx'
import MapCard, { type MapConfig } from '#/tiles/cards/Map.tsx'
import MediaControl from '#/tiles/cards/MediaControl.tsx'
import Todo from '#/tiles/cards/Todo.tsx'
import Weather, { type WeatherConfig } from '#/tiles/cards/Weather.tsx'
import { besideIcon, featuresFor, isWide } from '#/tiles/features/index.tsx'
import type { HomeAssistant } from '#/types.ts'
import type { ReactNode } from 'react'

// The Floorplan tiles, shipped in the same file as the floorplan card.

const TOGGLE_DOMAINS = [
  'light',
  'switch',
  'input_boolean',
  'fan',
  'humidifier',
  'siren',
  'remote',
  'automation',
  'valve',
]
const BUTTON_DOMAINS = ['button', 'input_button', 'script', 'scene']
const COVER_DOMAINS = ['cover']
const VACUUM_DOMAINS = ['vacuum']
const SELECT_DOMAINS = ['select', 'input_select']
const CAMERA_DOMAINS = ['camera', 'image']
const CLIMATE_DOMAINS = ['climate', 'water_heater']
const MEDIA_DOMAINS = ['media_player']
const LOCK_DOMAINS = ['lock']
const WEATHER_DOMAINS = ['weather']
const GRAPH_DOMAINS = ['sensor', 'binary_sensor', 'input_number', 'number', 'counter', 'person', 'device_tracker']
const GAUGE_DOMAINS = ['sensor', 'input_number', 'number', 'counter']
const DIAL_DOMAINS = ['climate', 'water_heater', 'humidifier', 'light']
const MAP_DOMAINS = ['person', 'device_tracker', 'zone']

// What the dial is called for each domain in the card picker.
const DIAL_NAMES: Record<string, string> = {
  climate: 'Thermostat',
  water_heater: 'Water heater',
  humidifier: 'Humidifier',
  light: 'Brightness dial',
}

type EntityView<C extends TileConfig> = (props: {
  env: { hass: HomeAssistant; host: HTMLElement; entityId?: string }
  config: C
}) => ReactNode

// One class per card, which only names its domains and its view. A wide
// card starts wide in the card picker, to show its controls.
function entityCard<C extends TileConfig>(
  domains: string[] | 'any',
  View: EntityView<C>,
  extras: Extra[] = [],
  wide = false,
  panel = false,
) {
  return class extends TileHost<C> {
    protected readonly domains = domains

    static getConfigForm() {
      return tileForm(domains, extras, panel)
    }

    static getStubConfig(hass?: HomeAssistant) {
      const named = domains === 'any' ? ['sensor'] : domains
      return { entity: stubEntity(hass, named) ?? `${named[0]}.example`, ...(wide && { size: 'wide' }) }
    }

    protected view() {
      if (!this._hass) return null
      const env = { hass: this._hass, host: this, entityId: this._config!.entity }
      return <View env={env} config={this._config!} />
    }
  }
}

class TitleCard extends TileHost<TitleConfig & TileConfig> {
  protected readonly domains = null

  static getStubConfig() {
    return { title: 'Living Room' }
  }

  static getConfigForm() {
    return titleForm()
  }

  getCardSize() {
    return 1
  }

  getGridOptions(): GridOptions {
    return { columns: 'full', rows: 1 }
  }

  protected view() {
    return <Title hass={this._hass} config={this._config!} area={this.area()} />
  }
}

class CameraCard extends entityCard<CameraConfig>(CAMERA_DOMAINS, Camera, ['camera']) {
  getCardSize() {
    return 4
  }

  getGridOptions(): GridOptions {
    return { columns: 12, rows: 'auto' }
  }
}

class WeatherCard extends entityCard<WeatherConfig>(WEATHER_DOMAINS, Weather, ['forecast']) {
  getCardSize() {
    return 3
  }

  getGridOptions(): GridOptions {
    return { columns: 'full', rows: 3 }
  }
}

// A wide thermostat, not a water heater, is a row taller, for its modes
// along the bottom, unless a feature sits beside its icon instead.
class ClimateCard extends entityCard(CLIMATE_DOMAINS, Climate, [], true) {
  getCardSize() {
    return this.tall() ? 3 : 2
  }

  getGridOptions(): GridOptions {
    return this.tall() ? { columns: 12, rows: 3 } : super.getGridOptions()
  }

  private tall() {
    return (
      this._config?.size === 'wide' &&
      !!this._config.entity?.startsWith('climate.') &&
      !besideIcon(this._config.feature)
    )
  }
}

// A card bigger than a tile, like the calendar, as wide and as tall as the
// grid says, whatever size its config names.
function panelCard<C extends TileConfig>(
  domains: string[],
  View: EntityView<C>,
  grid: GridOptions,
  size: number,
  extras: Extra[] = [],
) {
  return class extends entityCard<C>(domains, View, extras, false, true) {
    getCardSize() {
      return size
    }

    getGridOptions(): GridOptions {
      return grid
    }
  }
}

type Card = {
  type: string
  element: CustomElementConstructor
  name: string
  description: string
  // The entity domains it shows, any for every one, none for no entity.
  domains: string[] | 'any' | null
  // Wide, it shows its controls, and small it does not.
  wide?: boolean
  // A card of its own for a few domains, like the alarm panel, offered
  // beside the tile of the domain rather than in its place.
  extra?: boolean
  // What the card picker says for each suggestion, when there is more than
  // one.
  suggest?: (hass: HomeAssistant, entityId: string) => Suggestion[] | null
}

type Suggestion = { label?: string; config: Record<string, unknown> }

const CARDS: Card[] = [
  {
    type: 'fp-title',
    element: TitleCard,
    domains: null,
    name: 'Floorplan Title',
    description: 'Section heading that follows the room filter',
  },
  {
    type: 'fp-toggle',
    element: entityCard(TOGGLE_DOMAINS, Toggle),
    domains: TOGGLE_DOMAINS,
    name: 'Floorplan Toggle',
    description: 'Light, switch, fan, valve or anything else on or off',
  },
  {
    type: 'fp-button',
    element: entityCard(BUTTON_DOMAINS, Button),
    domains: BUTTON_DOMAINS,
    name: 'Floorplan Button',
    description: 'Button, script or scene tile',
  },
  {
    type: 'fp-cover',
    element: entityCard<CoverConfig>(COVER_DOMAINS, Cover, ['invert'], true),
    wide: true,
    domains: COVER_DOMAINS,
    name: 'Floorplan Cover',
    description: 'Blind or screen tile with up, stop and down',
  },
  {
    type: 'fp-vacuum',
    element: entityCard<VacuumConfig>(VACUUM_DOMAINS, Vacuum, ['battery_entity'], true),
    wide: true,
    domains: VACUUM_DOMAINS,
    name: 'Floorplan Vacuum',
    description: 'Robot vacuum tile',
  },
  {
    type: 'fp-select',
    element: entityCard<SelectConfig>(SELECT_DOMAINS, Select, ['tap_behavior']),
    domains: SELECT_DOMAINS,
    name: 'Floorplan Select',
    description: 'Option tile with a menu',
  },
  {
    type: 'fp-climate',
    element: ClimateCard,
    wide: true,
    domains: CLIMATE_DOMAINS,
    name: 'Floorplan Climate',
    description: 'Thermostat or water heater tile with its temperature and modes',
  },
  {
    type: 'fp-media',
    element: entityCard(MEDIA_DOMAINS, Media, [], true),
    wide: true,
    domains: MEDIA_DOMAINS,
    name: 'Floorplan Media',
    description: 'Speaker or TV tile with play, pause and tracks',
  },
  {
    type: 'fp-lock',
    element: entityCard(LOCK_DOMAINS, Lock),
    name: 'Floorplan Lock',
    description: 'Lock tile',
    domains: LOCK_DOMAINS,
  },
  {
    type: 'fp-entity',
    element: entityCard('any', Entity),
    domains: 'any',
    name: 'Floorplan Entity',
    description: 'Any entity, like a sensor, with its state',
  },
  {
    type: 'fp-weather',
    element: WeatherCard,
    domains: WEATHER_DOMAINS,
    name: 'Floorplan Weather',
    description: 'The weather now and the next hours',
    suggest: (hass, entityId) => {
      const features = Number(hass.states[entityId]?.attributes.supported_features ?? 0)
      const config = { type: 'custom:fp-weather', entity: entityId }
      // Both forecasts offered, one suggestion each, the hours first.
      if (!(features & 1) || !(features & 2)) return [{ config }]
      return [
        { label: 'Next hours', config: { ...config, forecast_type: 'hourly' } },
        { label: 'Next days', config: { ...config, forecast_type: 'daily' } },
      ]
    },
  },
  {
    type: 'fp-camera',
    element: CameraCard,
    name: 'Floorplan Camera',
    description: 'Camera or image picture tile',
    domains: CAMERA_DOMAINS,
  },
  {
    type: 'fp-alarm-panel',
    element: panelCard(['alarm_control_panel'], AlarmPanel, { columns: 'full', rows: 'auto' }, 7),
    extra: true,
    domains: ['alarm_control_panel'],
    name: 'Floorplan Alarm Panel',
    description: 'The alarm with a button for each mode and a keypad for its code',
  },
  {
    type: 'fp-dial',
    element: panelCard(DIAL_DOMAINS, Dial, { columns: 12, rows: 'auto' }, 6),
    extra: true,
    domains: DIAL_DOMAINS,
    name: 'Floorplan Dial',
    description: 'A thermostat, water heater, humidifier or light on a big ring you drag',
    suggest: (hass, entityId) => {
      const entity = hass.states[entityId]
      const domain = entityId.split('.')[0]
      if (domain === 'light' && !featuresFor(entity).some(feature => feature.id === 'brightness')) return null
      return [{ label: DIAL_NAMES[domain], config: { type: 'custom:fp-dial', entity: entityId } }]
    },
  },
  {
    type: 'fp-media-control',
    element: panelCard(MEDIA_DOMAINS, MediaControl, { columns: 'full', rows: 'auto' }, 4),
    extra: true,
    domains: MEDIA_DOMAINS,
    name: 'Floorplan Media Control',
    description: 'What is playing, with its art, how far in it is, its buttons and volume',
  },
  {
    type: 'fp-calendar',
    element: panelCard<CalendarConfig>(['calendar'], Calendar, { columns: 'full', rows: 7 }, 7, ['calendar']),
    extra: true,
    domains: ['calendar'],
    name: 'Floorplan Calendar',
    description: 'The coming events of one calendar or more, day by day',
  },
  {
    type: 'fp-todo',
    element: panelCard(['todo'], Todo, { columns: 'full', rows: 'auto' }, 5),
    extra: true,
    domains: ['todo'],
    name: 'Floorplan To-do List',
    description: 'A list to add to and tick off',
  },
  {
    type: 'fp-graph',
    element: panelCard<GraphConfig>(GRAPH_DOMAINS, Graph, { columns: 12, rows: 4 }, 4, ['graph']),
    extra: true,
    domains: GRAPH_DOMAINS,
    name: 'Floorplan Graph',
    description: 'The history of a reading, or the times something was on',
    suggest: (hass, entityId) => {
      const entity = hass.states[entityId]
      const config = { type: 'custom:fp-graph', entity: entityId }
      const numeric = isNumeric(entity)
      const daily = numeric && typeof entity?.attributes.state_class === 'string'
      return [
        // A strip of on and off needs less height than a line.
        { label: 'History', config: numeric ? config : { ...config, grid_options: { columns: 12, rows: 3 } } },
        ...(daily ? [{ label: 'Last week', config: { ...config, chart: 'bar' } }] : []),
      ]
    },
  },
  {
    type: 'fp-gauge',
    element: panelCard<GaugeConfig>(GAUGE_DOMAINS, Gauge, { columns: 6, rows: 3 }, 3, ['gauge']),
    extra: true,
    domains: GAUGE_DOMAINS,
    name: 'Floorplan Gauge',
    description: 'A reading on a ring',
    suggest: (hass, entityId) =>
      isNumeric(hass.states[entityId]) ? [{ config: { type: 'custom:fp-gauge', entity: entityId } }] : null,
  },
  {
    type: 'fp-map',
    element: panelCard<MapConfig>(MAP_DOMAINS, MapCard, { columns: 12, rows: 4 }, 4, ['map']),
    extra: true,
    domains: MAP_DOMAINS,
    name: 'Floorplan Map',
    description: 'Where a person, a tracker or a zone is',
  },
]

export function registerTiles() {
  registerIcons()
  window.customCards = window.customCards ?? []
  for (const card of CARDS) {
    if (!customElements.get(card.type)) customElements.define(card.type, card.element)
    if (!window.customCards.some(c => c.type === card.type))
      window.customCards.push({
        type: card.type,
        name: card.name,
        description: card.description,
        preview: true,
        getEntitySuggestion: (hass, entityId) => suggestions(card, hass, entityId),
      })
  }
}

// The suggestions of a card for an entity picked in Home Assistant's card
// picker: the tile, wide first for a tile with controls, then the tile with
// each control it can show along its bottom, as Home Assistant offers its
// own tile with each of its features.
function suggestions(card: Card, hass: HomeAssistant, entityId: string): Suggestion[] | null {
  if (!shows(card, entityId)) return null
  const type = `custom:${card.type}`
  if (card.suggest) return card.suggest(hass, entityId)
  const config = { type, entity: entityId }
  const base = card.wide ? [{ config: { ...config, size: 'wide' } }, { label: 'Small', config }] : [{ config }]
  if (card.extra) return base
  const features = featuresFor(hass.states[entityId]).map(feature => {
    const featured = { ...config, feature: feature.id }
    return {
      label: feature.label,
      config: isWide(featured, hass.states[entityId]) ? { ...featured, size: 'wide' } : featured,
    }
  })
  return [...base, ...features]
}

// Whether a card is the one to offer for an entity picked in Home
// Assistant's card picker. Floorplan Entity is offered only for an entity
// no other tile is made for, like a sensor.
function shows(card: Card, entityId: string) {
  const domain = entityId.split('.')[0]
  if (card.domains === 'any')
    return !CARDS.some(other => !other.extra && Array.isArray(other.domains) && other.domains.includes(domain))
  return !!card.domains?.includes(domain)
}
