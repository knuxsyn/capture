import Card from './ui/Card.jsx'
import Slider from './ui/Slider.jsx'

export default function Connectedness({ state, dispatch }) {
  const { self, others, world } = state.connection

  return (
    <div className="step-enter">
      <Card>
        <div className="card-title">Connection</div>
        <p className="card-desc">Where did your sense of connection land?</p>

        <Slider
          label="Connection to yourself"
          value={self}
          onChange={(v) => dispatch({ type: 'SET_CONNECTION', payload: { self: v } })}
          lo="Distant from myself"
          hi="Completely at home in myself"
          color="var(--cyan)"
        />

        <Slider
          label="Connection to others"
          value={others}
          onChange={(v) => dispatch({ type: 'SET_CONNECTION', payload: { others: v } })}
          lo="Isolated"
          hi="Profoundly connected"
          color="var(--phthalo-glow)"
        />

        <Slider
          label="Connection to the world"
          value={world}
          onChange={(v) => dispatch({ type: 'SET_CONNECTION', payload: { world: v } })}
          lo="Disconnected from everything"
          hi="Woven into everything"
          color="var(--phthalo-bright)"
        />
      </Card>
    </div>
  )
}
