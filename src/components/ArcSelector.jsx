import Card from './ui/Card.jsx'
import { EXPERIENCE_PHASES } from '../data/experience-phases.js'

export default function ArcSelector({ state, dispatch }) {
  const currentPhase = state.arc.phase

  return (
    <div className="step-enter">
      <Card>
        <div className="card-title">Where in the arc?</div>
        <p className="card-desc">
          Experiences unfold in phases. Which phase are you capturing from right now?
        </p>

        <div className="phase-grid">
          {EXPERIENCE_PHASES.map((phase) => (
            <div
              key={phase.id}
              className={`phase-option ${currentPhase === phase.id ? 'active' : ''}`}
              onClick={() =>
                dispatch({
                  type: 'SET_ARC',
                  payload: { phase: currentPhase === phase.id ? null : phase.id },
                })
              }
              title={phase.desc}
            >
              <div className="phase-option-label">{phase.label}</div>
            </div>
          ))}
        </div>

        {currentPhase && (
          <p
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              marginTop: 14,
              lineHeight: 1.5,
            }}
          >
            {EXPERIENCE_PHASES.find((p) => p.id === currentPhase)?.desc}
          </p>
        )}
      </Card>
    </div>
  )
}
