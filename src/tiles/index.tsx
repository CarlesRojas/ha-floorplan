import { registerIcons, tileForm, titleForm } from '#/tiles/editor.ts'
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
import Weather from '#/tiles/cards/Weather.tsx'
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
const CAMERA_DOMAINS = ['camera']
const CLIMATE_DOMAINS = ['climate', 'water_heater']
const MEDIA_DOMAINS = ['media_player']
const LOCK_DOMAINS = ['lock']
const WEATHER_DOMAINS = ['weather']

type EntityView<C extends TileConfig> = (props: {
  env: { hass: HomeAssistant; host: HTMLElement; entityId?: string }
  config: C
}) => ReactNode

// One class per card, which only names its domains and its view. A wide
// card starts wide in the card picker, to show its controls.
function entityCard<C extends TileConfig>(
  domains: string[] | 'any',
  View: EntityView<C>,
  extras: Parameters<typeof tileForm>[1] = [],
  wide = false,
) {
  return class extends TileHost<C> {
    protected readonly domains = domains

    static getConfigForm() {
      return tileForm(domains, extras)
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

class WeatherCard extends entityCard(WEATHER_DOMAINS, Weather) {
  getCardSize() {
    return 3
  }

  getGridOptions(): GridOptions {
    return { columns: 'full', rows: 3 }
  }
}

// A wide thermostat, not a water heater, is a row taller, for its modes along the bottom.
class ClimateCard extends entityCard(CLIMATE_DOMAINS, Climate, [], true) {
  getCardSize() {
    return this.tall() ? 3 : 2
  }

  getGridOptions(): GridOptions {
    return this.tall() ? { columns: 12, rows: 3 } : super.getGridOptions()
  }

  private tall() {
    return this._config?.size === 'wide' && !!this._config.entity?.startsWith('climate.')
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
}

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
  },
  {
    type: 'fp-camera',
    element: CameraCard,
    name: 'Floorplan Camera',
    description: 'Camera picture tile',
    domains: CAMERA_DOMAINS,
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
        getEntitySuggestion: (_hass, entityId) => {
          if (!shows(card, entityId)) return null
          const config = { type: `custom:${card.type}`, entity: entityId }
          return card.wide ? [{ config: { ...config, size: 'wide' } }, { label: 'Small', config }] : { config }
        },
      })
  }
}

// Whether a card is the one to offer for an entity picked in Home
// Assistant's card picker. Floorplan Entity is offered only for an entity
// no other tile is made for, like a sensor.
function shows(card: Card, entityId: string) {
  const domain = entityId.split('.')[0]
  if (card.domains === 'any')
    return !CARDS.some(other => Array.isArray(other.domains) && other.domains.includes(domain))
  return !!card.domains?.includes(domain)
}
