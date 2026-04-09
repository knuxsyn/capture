import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import { BODY_REGIONS } from '../data/body-regions.js'
import { PHYSICAL_FACTORS } from '../data/physical-factors.js'

function BodyMap({ active, onToggle }) {
  return (
    <svg viewBox="0 0 100 100" className="body-svg">
      {/* Body outline */}
      <ellipse cx="50" cy="12" rx="10.5" ry="11.5" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />
      <rect x="35" y="23" width="30" height="31" rx="9" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />
      <rect x="21" y="26" width="12" height="33" rx="5.5" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />
      <rect x="67" y="26" width="12" height="33" rx="5.5" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />
      <rect x="35" y="54" width="13" height="36" rx="5.5" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />
      <rect x="52" y="54" width="13" height="36" rx="5.5" fill="none" stroke="rgba(232,228,223,0.08)" strokeWidth="0.6" />

      {/* Interactive regions */}
      {BODY_REGIONS.map((r) => {
        const level = active[r.id] || 0
        return (
          <ellipse
            key={r.id}
            cx={r.cx}
            cy={r.cy}
            rx={r.rx}
            ry={r.ry}
            fill={level > 0 ? `rgba(13,74,50,${level * 0.25})` : 'transparent'}
            stroke={level > 0 ? 'var(--phthalo-bright)' : 'transparent'}
            strokeWidth={level > 0 ? 0.6 + level * 0.3 : 0}
            opacity={level > 0 ? 0.5 + level * 0.15 : 0.25}
            onClick={() => onToggle(r.id)}
          >
            <title>{r.label}</title>
          </ellipse>
        )
      })}
    </svg>
  )
}

export default function BodyCapture({ state, dispatch }) {
  const { regions, notes, physicalFactors, physicalNotes } = state.body

  return (
    <div className="step-enter">
      <Card>
        <div className="card-title">The body</div>
        <p className="card-desc">
          Tap once for mild, twice for strong, three times for intense. Tap again to clear.
        </p>

        <div className="body-map-container">
          <BodyMap
            active={regions}
            onToggle={(id) => dispatch({ type: 'TOGGLE_BODY_REGION', payload: id })}
          />

          <div className="chips" style={{ justifyContent: 'center' }}>
            {BODY_REGIONS.map((r) => {
              const level = regions[r.id] || 0
              return (
                <Chip
                  key={r.id}
                  small
                  active={level > 0}
                  onClick={() => dispatch({ type: 'TOGGLE_BODY_REGION', payload: r.id })}
                  style={level > 0 ? { borderWidth: level + 'px' } : {}}
                >
                  {r.label}
                  {level > 0 && (
                    <span style={{ marginLeft: 4, fontSize: 10, opacity: 0.6 }}>
                      {['\u00B7', '\u25CF', '\u2B24'][level - 1]}
                    </span>
                  )}
                </Chip>
              )
            })}
          </div>
        </div>
      </Card>

      <Card>
        <label className="field-label">What was the body telling you?</label>
        <textarea
          className="field-textarea"
          placeholder="Warmth rising through the chest, tingling in the hands, a sense of expansion..."
          value={notes}
          onChange={(e) => dispatch({ type: 'SET_BODY', payload: { notes: e.target.value } })}
        />
      </Card>

      <Card>
        <div className="card-title">Physical context</div>
        <p className="card-desc">
          Anything physical that shaped things &mdash; how you felt going in, discomfort, side effects.
        </p>

        <div className="chips">
          {PHYSICAL_FACTORS.map((f) => (
            <Chip
              key={f}
              label={f}
              small
              active={physicalFactors.includes(f)}
              onClick={() => {
                const next = physicalFactors.includes(f)
                  ? physicalFactors.filter((x) => x !== f)
                  : [...physicalFactors, f]
                dispatch({ type: 'SET_BODY', payload: { physicalFactors: next } })
              }}
            />
          ))}
        </div>

        {physicalFactors.length > 0 && (
          <div className="field" style={{ marginTop: 12 }}>
            <textarea
              className="field-textarea"
              placeholder="How did these show up in the experience?"
              value={physicalNotes}
              onChange={(e) =>
                dispatch({ type: 'SET_BODY', payload: { physicalNotes: e.target.value } })
              }
              style={{ minHeight: 60 }}
            />
          </div>
        )}
      </Card>
    </div>
  )
}
