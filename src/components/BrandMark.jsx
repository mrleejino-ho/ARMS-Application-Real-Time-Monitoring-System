import { MonitorCheck } from "lucide-react";

export default function BrandMark({ compact = false, fullLogo = false }) {
  if (fullLogo) {
    return (
      <div className="arms-full-logo">
        <img src="/assets/arms-logo.png" alt="ARMS - Application Real-Time Monitoring System" />
      </div>
    );
  }

  return (
    <div className="arms-brand-mark">
      <div className="arms-brand-icon">
        <img
          src="/assets/arms-logo.png"
          alt="ARMS logo"
          onError={(event) => {
            event.currentTarget.style.display = "none";
            event.currentTarget.nextElementSibling.style.display = "block";
          }}
        />
        <MonitorCheck className="arms-brand-fallback" size={compact ? 20 : 24} />
      </div>
      {!compact && (
        <div className="arms-brand-copy">
          <strong>ARMS</strong>
          <span>Teacher Console</span>
        </div>
      )}
    </div>
  );
}
