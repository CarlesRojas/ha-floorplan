import { callService, formatState, type TileEnv } from '#/tiles/actions.ts'
import { Keypad } from '#/tiles/features/Keypad.tsx'
import { alarmModes, codeFormat, needsCode, type AlarmMode } from '#/tiles/features/other.tsx'
import { Pill } from '#/tiles/features/parts.tsx'
import type { TileConfig } from '#/tiles/host.tsx'
import { Panel } from '#/tiles/Panel.tsx'
import { useState } from 'react'

type Props = { env: TileEnv; config: TileConfig }

// The states an alarm passes through on its way to another, in amber.
const MOVING = ['arming', 'pending', 'disarming']

// The whole alarm on one card, the whole width: what it is doing, a button
// for each mode it has and, for one with a code, the keypad. A mode that
// needs no code is set as soon as it is pressed. One that does is picked
// first and set by the button under the keypad once the code is in.
export default function AlarmPanel({ env, config }: Props) {
  const entity = env.hass.states[config.entity!]
  const [picked, setPicked] = useState<AlarmMode | null>(null)
  if (!entity) return <Panel env={env} config={config} entity={entity} state="" />
  const modes = alarmModes(entity)
  const coded = entity.attributes.code_format === 'number' || entity.attributes.code_format === 'text'
  const armed = entity.state !== 'disarmed'
  // Armed, the code is for disarming until another mode is picked.
  const target = picked ?? (armed ? (modes.find(mode => mode.state === 'disarmed') ?? null) : null)
  const accent =
    entity.state === 'triggered'
      ? 'var(--_alarm-armed)'
      : MOVING.includes(entity.state)
        ? 'var(--_accent-climate)'
        : armed
          ? 'var(--_alarm-armed)'
          : 'var(--_alarm-disarmed)'
  const set = (mode: AlarmMode, code?: string) => {
    void callService(env.hass, `alarm_control_panel.${mode.service}`, {
      entity_id: entity.entity_id,
      ...(code && { code }),
    })
    setPicked(null)
  }
  return (
    <Panel env={env} config={config} entity={entity} state={formatState(env.hass, entity)} accent={accent}>
      <div className="fp-group fp-alarm-modes" role="radiogroup" aria-label="Mode">
        {modes.map(mode => (
          <Pill
            key={mode.state}
            icon={mode.icon}
            label={mode.label}
            checked={target ? target.state === mode.state : entity.state === mode.state}
            onPress={() => {
              if (entity.state === mode.state && !picked) return
              if (needsCode(entity, mode)) setPicked(mode)
              else set(mode)
            }}
          />
        ))}
      </div>
      {coded && (
        <Keypad
          format={codeFormat(entity)}
          ready={!!target}
          action={!target ? 'Pick a mode' : target.state === 'disarmed' ? 'Disarm' : `Arm ${target.label}`}
          onSubmit={code => target && set(target, code)}
        />
      )}
    </Panel>
  )
}
