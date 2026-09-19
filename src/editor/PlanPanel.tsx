import type { PlanImageConfig } from '#/types.ts'

type Props = {
  plan: PlanImageConfig | undefined
  calibrating: boolean
  onChange: (plan: PlanImageConfig | undefined) => void
  onCalibrate: () => void
}

const input = 'rounded border border-(--divider-color) bg-transparent px-2 py-1 text-xs text-(--primary-text-color)'
const button = 'rounded-full border border-(--divider-color) px-3 py-1 text-xs font-semibold'

export default function PlanPanel({ plan, calibrating, onChange, onCalibrate }: Props) {
  return (
    <div className="flex flex-col gap-2 border-t border-(--divider-color) pt-3">
      <p className="text-xs font-semibold">Floor plan image</p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          className={`${input} min-w-48 flex-1`}
          placeholder="/local/floorplan-3d/plan.png"
          value={plan?.url ?? ''}
          onChange={e => {
            const url = e.target.value
            if (!url) onChange(undefined)
            else onChange({ width: 10, x: 0, y: 0, opacity: 0.5, ...plan, url })
          }}
        />
        {plan && (
          <>
            <label className="flex items-center gap-1 text-xs">
              Opacity
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.1}
                value={plan.opacity ?? 0.5}
                onChange={e => onChange({ ...plan, opacity: Number(e.target.value) })}
              />
            </label>
            <button type="button" className={button} onClick={onCalibrate} disabled={calibrating}>
              {calibrating ? 'Calibrating' : 'Calibrate scale'}
            </button>
            <button type="button" className={button} onClick={() => onChange(undefined)}>
              Remove
            </button>
          </>
        )}
      </div>
      <p className="text-xs text-(--secondary-text-color)">
        Put the image under www/floorplan-3d in your Home Assistant config and reference it as /local/... Then
        calibrate: click two points on the plan whose real distance you know.
      </p>
    </div>
  )
}
