import { haptic } from '#/tiles/actions.ts'
import { insideTile } from '#/tiles/gestures.ts'
import { Icon } from '#/tiles/Icon.tsx'
import { useState, type KeyboardEvent } from 'react'

// The code of an alarm, entered on round keys like a phone's, or typed in
// a field for an alarm whose code is not only digits.

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

type Props = {
  // number for a keypad, text for a field.
  format: 'number' | 'text'
  // What the code is for, said on the button that sends it, like Disarm.
  action: string
  onSubmit: (code: string) => void
  onCancel?: () => void
  // False while the code has nothing to do yet, like a panel where no mode
  // is picked.
  ready?: boolean
}

export function Keypad({ format, action, onSubmit, onCancel, ready = true }: Props) {
  const [code, setCode] = useState('')
  const type = (key: string) => {
    haptic('selection')
    setCode(now => (now + key).slice(0, 12))
  }
  const back = () => setCode(now => now.slice(0, -1))
  const submit = () => {
    if (!code || !ready) return
    onSubmit(code)
    setCode('')
  }
  const onKeyDown = (e: KeyboardEvent) => {
    e.stopPropagation()
    if (format !== 'number') return
    if (/^\d$/.test(e.key)) type(e.key)
    else if (e.key === 'Backspace') back()
    else if (e.key === 'Enter') submit()
    else if (e.key === 'Escape') onCancel?.()
    else return
    e.preventDefault()
  }
  return (
    <div className="fp-keypad" onKeyDown={onKeyDown} onPointerDown={e => e.stopPropagation()}>
      {format === 'number' ? (
        <div className="fp-keypad-dots" aria-live="polite" aria-label={`${code.length} digits entered`}>
          {code.length === 0 ? (
            <span className="fp-keypad-hint">Enter code</span>
          ) : (
            [...code].map((_, i) => <span key={i} className="fp-keypad-dot" />)
          )}
        </div>
      ) : (
        <input
          className="fp-keypad-field"
          type="password"
          autoComplete="off"
          placeholder="Code"
          aria-label="Code"
          value={code}
          onChange={e => setCode(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
        />
      )}
      {format === 'number' && (
        <div className="fp-keypad-keys">
          {KEYS.map(key => (
            <Key key={key} label={key} onPress={() => type(key)} />
          ))}
          <span />
          <Key label="0" onPress={() => type('0')} />
          <button
            {...insideTile}
            type="button"
            aria-label="Delete"
            className="fp-key fp-key-plain"
            disabled={!code}
            onClick={e => {
              e.stopPropagation()
              back()
            }}
          >
            <Icon icon="ph:backspace" />
          </button>
        </div>
      )}
      <div className="fp-keypad-actions">
        {onCancel && (
          <button
            {...insideTile}
            type="button"
            className="fp-pill fp-pill-action"
            onClick={e => {
              e.stopPropagation()
              setCode('')
              onCancel()
            }}
          >
            <span className="fp-pill-label">Cancel</span>
          </button>
        )}
        <button
          {...insideTile}
          type="button"
          className="fp-pill fp-pill-action fp-pill-primary"
          disabled={!code || !ready}
          onClick={e => {
            e.stopPropagation()
            submit()
          }}
        >
          <span className="fp-pill-label">{action}</span>
        </button>
      </div>
    </div>
  )
}

function Key({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <button
      {...insideTile}
      type="button"
      className="fp-key"
      onClick={e => {
        e.stopPropagation()
        onPress()
      }}
    >
      {label}
    </button>
  )
}
