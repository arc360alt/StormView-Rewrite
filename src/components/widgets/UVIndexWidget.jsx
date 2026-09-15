import './widgets.css';

function uvInfo(uv) {
  if (uv <= 2)  return { label: 'Low', color: '#4ADE80', tip: 'Minimal protection needed for most people.' };
  if (uv <= 5)  return { label: 'Moderate', color: '#FACC15', tip: 'Wear sunglasses and use sunscreen on bright days.' };
  if (uv <= 7)  return { label: 'High', color: '#FB923C', tip: 'Wear sunscreen and a hat — seek shade around midday.' };
  if (uv <= 10) return { label: 'Very High', color: '#F87171', tip: 'Unprotected skin can burn quickly — take extra precautions.' };
  return { label: 'Extreme', color: '#E879F9', tip: 'Avoid sun exposure during midday hours if possible.' };
}

export function UVIndexWidget({ data }) {
  const cu = data.current ?? {};
  if (cu.uvIndex == null) return null;

  const { label, color, tip } = uvInfo(cu.uvIndex);
  const pct = Math.min(100, (cu.uvIndex / 11) * 100);

  return (
    <div className="widget-uv sidebar-section">
      <div className="sidebar-section-title">UV Index</div>
      <div className="widget-uv-top">
        <div className="widget-uv-number" style={{ color }}>{cu.uvIndex}</div>
        <div className="widget-uv-label" style={{ color }}>{label}</div>
      </div>
      <div className="widget-uv-track">
        <div className="widget-uv-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="widget-uv-tip">{tip}</div>
    </div>
  );
}
