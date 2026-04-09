export default function Slider({ label, value, onChange, lo, hi, color }) {
  return (
    <div className="slider-group">
      <div className="slider-header">
        <span className="slider-label">{label}</span>
        <span className="slider-value" style={{ color }}>{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
        style={{ accentColor: color }}
      />
      <div className="slider-anchors">
        <span className="slider-anchor">{lo}</span>
        <span className="slider-anchor">{hi}</span>
      </div>
    </div>
  )
}
