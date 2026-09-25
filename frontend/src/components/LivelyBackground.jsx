function PlateSVG(props) {
  return (
    <svg viewBox="0 0 100 100" {...props}>
      <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="3" />
      <circle cx="50" cy="50" r="32" fill="none" stroke="currentColor" strokeWidth="2" />
      <circle cx="50" cy="50" r="10" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  );
}

export default function LivelyBackground() {
  return (
    <div className="bg-layer" aria-hidden="true">
      <div className="bg-chevrons" />
      <div className="bg-stripes" />
      <div className="bg-halftone" />
      <div className="bg-glow" />
      <div className="bg-glow-2" />
      <div className="bg-ring r1" />
      <div className="bg-ring r2" />
      <div className="bg-ring r3" />
      <PlateSVG className="bg-plate-watermark" style={{ color: 'var(--brass)' }} />
      <PlateSVG className="bg-plate-watermark two" style={{ color: 'var(--ink)' }} />
    </div>
  );
}
