import { cn } from '#/lib/utils.ts'
import { useEffect, type ReactNode } from 'react'

// Confirmation dialog in the shadcn style, without Radix for the same reason
// as the context menu: it must live inside the fullscreen editor's own
// dialog, where document level listeners never fire.

type AlertDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}

export function AlertDialog({ open, onOpenChange, children }: AlertDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onOpenChange(false)
      }
    }
    document.addEventListener('keydown', onKeyDown, true)
    return () => document.removeEventListener('keydown', onKeyDown, true)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onPointerDown={() => onOpenChange(false)}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        className="bg-background text-foreground border-border w-full max-w-sm rounded-lg border p-6 shadow-lg"
        onPointerDown={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

export function AlertDialogHeader({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-2">{children}</div>
}

export function AlertDialogTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-base font-semibold">{children}</h2>
}

export function AlertDialogDescription({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground text-sm">{children}</p>
}

export function AlertDialogFooter({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex justify-end gap-2">{children}</div>
}

const button =
  'inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-semibold transition-colors outline-none'

export function AlertDialogCancel({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn(button, 'border-border hover:bg-accent border')}>
      {children}
    </button>
  )
}

export function AlertDialogAction({
  children,
  onClick,
  variant = 'default',
}: {
  children: ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive'
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        button,
        variant === 'destructive'
          ? 'bg-destructive text-white hover:opacity-90'
          : 'bg-primary text-primary-foreground hover:opacity-90',
      )}
    >
      {children}
    </button>
  )
}
