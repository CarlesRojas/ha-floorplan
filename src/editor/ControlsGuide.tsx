import { cn } from '#/lib/utils.ts'
import { useEffect, useState, type ReactNode } from 'react'

// How to move the view, shown under the way into the editor. The card is
// driven with a mouse or with fingers, and the two differ, so only the kinds
// of pointer the device has are shown: a laptop with a touchscreen gets
// both, a phone the fingers, a desktop the mouse.
type Pointers = { mouse: boolean; touch: boolean }

function usePointers(): Pointers {
  const [pointers, setPointers] = useState<Pointers>({ mouse: true, touch: true })
  useEffect(() => {
    if (typeof matchMedia !== 'function') return
    const fine = matchMedia('(any-pointer: fine)')
    const coarse = matchMedia('(any-pointer: coarse)')
    const read = () => {
      // A device that reports neither is shown both, rather than nothing.
      const both = !fine.matches && !coarse.matches
      setPointers({ mouse: fine.matches || both, touch: coarse.matches || both })
    }
    read()
    fine.addEventListener('change', read)
    coarse.addEventListener('change', read)
    return () => {
      fine.removeEventListener('change', read)
      coarse.removeEventListener('change', read)
    }
  }, [])
  return pointers
}

export default function ControlsGuide({ className }: { className?: string }) {
  const { mouse, touch } = usePointers()
  return (
    <div className={cn('flex flex-wrap justify-center gap-x-10 gap-y-4', className)}>
      {mouse && (
        <Section title="Mouse">
          <Row icon={<Mouse button="left" />} action="Rotate" how="Drag with the left button" />
          <Row icon={<Mouse button="right" />} action="Pan" how="Drag with the right button" />
          <Row icon={<Mouse button="middle" />} action="Zoom" how="Drag with the wheel pressed" />
        </Section>
      )}
      {touch && (
        <Section title="Touch">
          <Row icon={<Fingers gesture="rotate" />} action="Rotate" how="Drag with one finger" />
          <Row icon={<Fingers gesture="pan" />} action="Pan" how="Slide two fingers together" />
          <Row icon={<Fingers gesture="zoom" />} action="Zoom" how="Pinch with two fingers" />
        </Section>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2 text-left">
      <p className="text-xs font-semibold tracking-wide text-(--secondary-text-color) uppercase">{title}</p>
      {children}
    </div>
  )
}

function Row({ icon, action, how }: { icon: ReactNode; action: string; how: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex size-9 shrink-0 items-center justify-center text-(--primary-text-color)">{icon}</span>
      <div className="flex flex-col">
        <span className="text-sm font-medium">{action}</span>
        <span className="text-xs text-(--secondary-text-color)">{how}</span>
      </div>
    </div>
  )
}

// A mouse seen from above, with the button being pressed filled in.
function Mouse({ button }: { button: 'left' | 'right' | 'middle' }) {
  return (
    <svg viewBox="0 0 24 32" className="h-8 w-6" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {button === 'left' && <path d="M12 2.8A9.2 9.2 0 0 0 2.8 12v2h9.2z" fill="currentColor" stroke="none" />}
      {button === 'right' && <path d="M12 2.8A9.2 9.2 0 0 1 21.2 12v2H12z" fill="currentColor" stroke="none" />}
      {button === 'middle' && <rect x="10" y="4.5" width="4" height="7" rx="2" fill="currentColor" stroke="none" />}
      <rect x="2" y="2" width="20" height="28" rx="10" />
      <path d="M2 14h20" />
      {button !== 'middle' && <path d="M12 2v12" />}
      {button === 'middle' && <rect x="10" y="4.5" width="4" height="7" rx="2" />}
    </svg>
  )
}

// One or two fingertips and the arrows for where they go.
function Fingers({ gesture }: { gesture: 'rotate' | 'pan' | 'zoom' }) {
  const arrow = 'M0 0l-3 -3M0 0l-3 3'
  return (
    <svg viewBox="0 0 32 32" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
      {gesture === 'rotate' && (
        <>
          <circle cx="16" cy="16" r="4" fill="currentColor" stroke="none" />
          <path d="M6 16h4M22 16h4" />
          <g transform="translate(6 16)">
            <path d={arrow} transform="scale(-1 1)" />
          </g>
          <g transform="translate(26 16)">
            <path d={arrow} />
          </g>
        </>
      )}
      {gesture === 'pan' && (
        <>
          <circle cx="11" cy="20" r="3.5" fill="currentColor" stroke="none" />
          <circle cx="21" cy="20" r="3.5" fill="currentColor" stroke="none" />
          <path d="M11 14V6M21 14V6" />
          <g transform="translate(11 6) rotate(-90)">
            <path d={arrow} />
          </g>
          <g transform="translate(21 6) rotate(-90)">
            <path d={arrow} />
          </g>
        </>
      )}
      {gesture === 'zoom' && (
        <>
          <circle cx="12" cy="20" r="3.5" fill="currentColor" stroke="none" />
          <circle cx="20" cy="12" r="3.5" fill="currentColor" stroke="none" />
          <path d="M9 23l-5 5M23 9l5-5" />
          <g transform="translate(4 28) rotate(135)">
            <path d={arrow} />
          </g>
          <g transform="translate(28 4) rotate(-45)">
            <path d={arrow} />
          </g>
        </>
      )}
    </svg>
  )
}
