import { useState } from 'react'
import Card from './ui/Card.jsx'
import Chip from './ui/Chip.jsx'
import SearchSelect from './ui/SearchSelect.jsx'
import { METHODS } from '../data/methods.js'
import { SOCIAL_CONTEXTS } from '../data/social-contexts.js'

export default function ContextForm({ state, dispatch }) {
  const { methods, setting, socialContext, intention } = state.context
  const [customMethod, setCustomMethod] = useState('')

  const selectedNames = methods.map((m) => m.name)
  const groups = METHODS.map((g) => ({ group: g.group, items: g.items }))

  function addMethod(name) {
    const isPrimary = methods.length === 0
    dispatch({
      type: 'SET_CONTEXT',
      payload: {
        methods: [...methods, { name, dose: '', isPrimary }],
      },
    })
  }

  function removeMethod(name) {
    const next = methods.filter((m) => m.name !== name)
    // If we removed the primary, promote the first remaining
    if (next.length > 0 && !next.some((m) => m.isPrimary)) {
      next[0].isPrimary = true
    }
    dispatch({ type: 'SET_CONTEXT', payload: { methods: next } })
  }

  function setPrimary(name) {
    dispatch({
      type: 'SET_CONTEXT',
      payload: {
        methods: methods.map((m) => ({ ...m, isPrimary: m.name === name })),
      },
    })
  }

  function setDose(name, dose) {
    dispatch({
      type: 'SET_CONTEXT',
      payload: {
        methods: methods.map((m) => (m.name === name ? { ...m, dose } : m)),
      },
    })
  }

  return (
    <div className="step-enter">
      <Card>
        <div className="card-title">What were you exploring?</div>
        <p className="card-desc">Add each compound, practice, or modality involved.</p>

        <SearchSelect
          groups={groups}
          selected={selectedNames}
          onSelect={addMethod}
          placeholder="Search methods, compounds, practices..."
        />

        {methods.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {methods.map((m) => (
              <div
                key={m.name}
                className={`method-item ${m.isPrimary ? 'primary' : ''}`}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        color: m.isPrimary ? 'var(--phthalo-bright)' : 'var(--text-primary)',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                      onClick={() => setPrimary(m.name)}
                    >
                      {m.name}
                    </span>
                    {m.isPrimary && methods.length > 1 && (
                      <span className="method-item-badge">PRIMARY</span>
                    )}
                  </div>
                  <input
                    className="field-input"
                    placeholder="Dose — e.g. 100mg, 3g, 2 hits, moderate"
                    value={m.dose}
                    onChange={(e) => setDose(m.name, e.target.value)}
                    style={{ padding: '8px 12px', fontSize: 12, borderRadius: 8 }}
                  />
                </div>
                <span
                  onClick={() => removeMethod(m.name)}
                  style={{
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    fontSize: 16,
                    flexShrink: 0,
                    padding: '0 4px',
                  }}
                >
                  &times;
                </span>
              </div>
            ))}
          </div>
        )}

        {methods.length > 1 && (
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 4 }}>
            Tap a name to mark the lead. Each one gets its own dose field.
          </p>
        )}

        {methods.some((m) => m.name === 'Other (describe below)') && (
          <input
            className="field-input"
            placeholder="Describe the method or state"
            value={customMethod}
            onChange={(e) => setCustomMethod(e.target.value)}
            style={{ marginTop: 8 }}
          />
        )}
      </Card>

      <Card>
        <div className="card-title">Context</div>
        <div className="field">
          <label className="field-label">Setting</label>
          <input
            className="field-input"
            placeholder="Forest, ceremony, bedroom, retreat center"
            value={setting}
            onChange={(e) => dispatch({ type: 'SET_CONTEXT', payload: { setting: e.target.value } })}
          />
        </div>
        <div className="field">
          <label className="field-label">Who were you with?</label>
          <div className="chips">
            {SOCIAL_CONTEXTS.map((s) => (
              <Chip
                key={s}
                label={s}
                small
                active={socialContext === s}
                onClick={() =>
                  dispatch({
                    type: 'SET_CONTEXT',
                    payload: { socialContext: socialContext === s ? '' : s },
                  })
                }
              />
            ))}
          </div>
        </div>
        <div className="field">
          <label className="field-label">Intention</label>
          <input
            className="field-input"
            placeholder="Healing, curiosity, surrender, connection, or nothing at all..."
            value={intention}
            onChange={(e) =>
              dispatch({ type: 'SET_CONTEXT', payload: { intention: e.target.value } })
            }
          />
        </div>
      </Card>
    </div>
  )
}
