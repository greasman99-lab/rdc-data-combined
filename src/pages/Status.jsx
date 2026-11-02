import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUserId } from './UserIdContext';
import './Status.css';

export default function Status() {
  const navigate = useNavigate();
  const { userId, provider } = useParams();
  const { visitorId } = useUserId();
  const { loanApplication } = useLoanApplication();

  const effectiveUserId = userId || visitorId;
  const plan = loanApplication?.selectedPlan || {};
  const providerName = provider === 'maxit' ? 'MaxIt RDC' : 'Airtel Money';
  const providerClass = provider || 'airtel';

  return (
    <div className={`status-page ${providerClass}`}>
      {/* Success Icon */}
      <div className="status-icon-wrap">
        <div className="status-icon-ring" />
        <div className="status-icon-ring" />
        <div className="status-icon-ring" />
        <div className="status-icon-circle">
          <span className="check">✓</span>
        </div>
      </div>

      <h1 className="status-title">Verification Complete</h1>
      <p className="status-subtitle">
        Your {plan.data || 'data'} package has been activated successfully via {providerName}.
      </p>

      {/* Info Card */}
      <div className="status-info-card">
        <div className="status-info-row">
          <span className="status-info-label">Package</span>
          <span className="status-info-value">{plan.data || '—'}</span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Amount</span>
          <span className="status-info-value">
            {plan.price ? `$${plan.price.toFixed(2)}` : '—'}
          </span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Provider</span>
          <span className="status-info-value provider-badge">
            {provider === 'maxit' ? 'M' : 'A'} {providerName}
          </span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Validity</span>
          <span className="status-info-value">30 Days</span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Status</span>
          <span className="status-info-value" style={{ color: '#27ae60' }}>Active ✓</span>
        </div>
      </div>

      {/* Home Button */}
      <button
        className="status-home-btn"
        onClick={() => navigate(`/${effectiveUserId}/dataplans`)}
      >
        ← Back to Plans
      </button>

      <footer className="status-footer">
        <p>🇨🇩 DRC Data Services<br />{providerName}</p>
      </footer>
    </div>
  );
}
