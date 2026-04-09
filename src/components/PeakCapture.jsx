import Card from './ui/Card.jsx'
import Slider from './ui/Slider.jsx'
import Chip from './ui/Chip.jsx'
import { TIME_OPTIONS } from '../data/time-options.js'
import { CHALLENGING_TYPES } from '../data/challenging-types.js'

export default function PeakCapture({ state, dispatch }) {
  const { arousal, valence, ego, timePer, noetic, challenging } = state.peak

  return (
    <div className="step-enter">
      <Card>
        <div className="card-title">The peak</div>
        <p className="card-desc">
          Go back to the most vivid moment. Where were you on these?
        </p>

        <Slider
          label="Intensity"
          value={arousal}
          onChange={(v) => dispatch({ type: 'SET_PEAK', payload: { arousal: v } })}
          lo="Subtle"
          hi="Overwhelming"
          color="var(--cyan)"
        />

        <Slider
          label="Emotional tone"
          value={valence}
          onChange={(v) => dispatch({ type: 'SET_PEAK', payload: { valence: v } })}
          lo="Deeply challenging"
          hi="Profoundly beautiful"
          color="var(--phthalo-glow)"
        />

        <Slider
          label="Sense of self"
          value={ego}
          onChange={(v) => dispatch({ type: 'SET_PEAK', payload: { ego: v } })}
          lo="Intact, familiar self"
          hi="Self completely dissolved"
          color="var(--phthalo-bright)"
        />

        <Slider
          label="Insight / noetic quality"
          value={noetic}
          onChange={(v) => dispatch({ type: 'SET_PEAK', payload: { noetic: v } })}
          lo="No insights"
          hi="Profound revelation"
          color="var(--gold)"
        />
      </Card>

      <Card>
        <div className="card-title">Time</div>
        <p className="card-desc">What was time doing?</p>
        <div className="time-grid">
          {TIME_OPTIONS.map((t) => (
            <div
              key={t.value}
              className={`time-option ${timePer === t.value ? 'active' : ''}`}
              onClick={() => dispatch({ type: 'SET_PEAK', payload: { timePer: t.value } })}
            >
              <div className="time-option-icon">{t.icon}</div>
              <div className="time-option-label">{t.label}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <div className="gate-question">
          <span className="gate-label">Did you encounter challenging moments?</span>
          <div
            className={`toggle-track ${challenging.encountered ? 'on' : ''}`}
            onClick={() =>
              dispatch({
                type: 'SET_PEAK_CHALLENGING',
                payload: { encountered: !challenging.encountered },
              })
            }
          >
            <div className="toggle-thumb" />
          </div>
        </div>

        {challenging.encountered && (
          <div style={{ marginTop: 8 }}>
            <label className="field-label">What came up?</label>
            <div className="chips">
              {CHALLENGING_TYPES.map((ct) => (
                <Chip
                  key={ct.id}
                  label={ct.label}
                  small
                  active={challenging.types.includes(ct.id)}
                  onClick={() => {
                    const types = challenging.types.includes(ct.id)
                      ? challenging.types.filter((x) => x !== ct.id)
                      : [...challenging.types, ct.id]
                    dispatch({ type: 'SET_PEAK_CHALLENGING', payload: { types } })
                  }}
                />
              ))}
            </div>
            <p
              style={{
                fontSize: 11,
                color: 'var(--text-tertiary)',
                marginTop: 8,
                lineHeight: 1.5,
              }}
            >
              Difficult moments are information, not pathology. They often hold the richest signal.
            </p>
          </div>
        )}
      </Card>
    </div>
  )
}
