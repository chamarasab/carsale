const sparkles = [
  { left: '12%', top: '18%', color: '#ffffff', size: 10, duration: 4.5, delay: 0 },
  { left: '21%', top: '64%', color: '#2979ff', size: 14, duration: 5.2, delay: 1.3 },
  { left: '82%', top: '20%', color: '#00c4b4', size: 12, duration: 3.8, delay: 2.1 },
  { left: '76%', top: '68%', color: '#00c4b4', size: 10, duration: 6, delay: 0.7 },
  { left: '31%', top: '12%', color: '#00c4b4', size: 10, duration: 4.8, delay: 2.9 },
  { left: '68%', top: '10%', color: '#2979ff', size: 8, duration: 3.5, delay: 0.4 },
  { left: '48%', top: '72%', color: '#ffffff', size: 12, duration: 6.3, delay: 1.1 },
  { left: '91%', top: '48%', color: '#7c4dff', size: 11, duration: 5.5, delay: 2.5 },
];

const markers = [
  { left: '9%', top: '42%', color: '#2979ff', duration: 5.5, delay: 0.5 },
  { left: '84%', top: '38%', color: '#00c4b4', duration: 4, delay: 2 },
  { left: '17%', top: '84%', color: '#00c4b4', duration: 6.2, delay: 1.4 },
  { left: '81%', top: '82%', color: '#7c4dff', duration: 3.8, delay: 3 },
  { left: '42%', top: '8%', color: '#ffffff', duration: 5, delay: 0.8 },
];

export function OwlesterAuthBackground() {
  return (
    <div aria-hidden className="owlester-auth-background fixed">
      <div className="owlester-glow owlester-glow-purple" />
      <div className="owlester-glow owlester-glow-teal" />
      <div className="owlester-glow owlester-glow-blue" />
      <div className="owlester-dot-field" />

      <svg className="owlester-orbit owlester-orbit-left" viewBox="0 0 520 520">
        <circle cx="260" cy="260" r="240" stroke="#fff" strokeWidth="1" fill="none" strokeDasharray="2 8" />
        <circle cx="260" cy="260" r="180" stroke="#2979ff" strokeWidth="1.5" fill="none" />
        <circle cx="260" cy="260" r="120" stroke="#fff" strokeWidth="1" fill="none" strokeDasharray="4 10" />
        <circle cx="260" cy="260" r="60" stroke="#00c4b4" strokeWidth="1.5" fill="none" />
        <circle cx="260" cy="40" r="6" fill="#2979ff" />
        <circle cx="440" cy="260" r="4" fill="#00c4b4" />
        <circle cx="260" cy="380" r="5" fill="#fff" />
      </svg>

      <svg className="owlester-orbit owlester-orbit-right" viewBox="0 0 460 460">
        <circle cx="230" cy="230" r="220" stroke="#00c4b4" strokeWidth="1.5" fill="none" />
        <circle cx="230" cy="230" r="160" stroke="#fff" strokeWidth="1" fill="none" strokeDasharray="3 8" />
        <circle cx="230" cy="230" r="100" stroke="#7c4dff" strokeWidth="1.5" fill="none" />
        <circle cx="230" cy="10" r="5" fill="#00c4b4" />
        <circle cx="380" cy="230" r="6" fill="#7c4dff" />
      </svg>

      {sparkles.map((sparkle, index) => (
        <svg
          className="owlester-sparkle"
          key={index}
          style={{
            left: sparkle.left,
            top: sparkle.top,
            width: sparkle.size,
            height: sparkle.size,
            animationDuration: `${sparkle.duration}s`,
            animationDelay: `${sparkle.delay}s`,
          }}
          viewBox="0 0 16 16"
        >
          <path d="M8 0v6L14 8 8 10v6L6 10 0 8l6-2z" fill={sparkle.color} />
        </svg>
      ))}

      {markers.map((marker, index) => (
        <span
          className="owlester-marker"
          key={index}
          style={{
            left: marker.left,
            top: marker.top,
            color: marker.color,
            animationDuration: `${marker.duration}s`,
            animationDelay: `${marker.delay}s`,
          }}
        >
          +
        </span>
      ))}
    </div>
  );
}
