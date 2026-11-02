import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { useUserId } from '../hooks/useUserId';
import './Status.css';

export default function Status() {
  const navigate = useNavigate();
  const { userId, provider } = useParams();
  const { userId: hookUserId } = useUserId();
  const { selectedPlan } = useData();

  const effectiveUserId = userId || hookUserId;
  const plan = selectedPlan || {};
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

      <h1 className="status-title">Vérification Terminée</h1>
      <p className="status-subtitle">
        Votre forfait {plan.data || 'data'} a été activé avec succès via {providerName}.
      </p>

      {/* Info Card */}
      <div className="status-info-card">
        <div className="status-info-row">
          <span className="status-info-label">Forfait</span>
          <span className="status-info-value">{plan.data || '—'}</span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Montant</span>
          <span className="status-info-value">
            {plan.price ? `${plan.price.toFixed(2)} $` : '—'}
          </span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Fournisseur</span>
          <span className="status-info-value provider-badge">
            {providerName}
          </span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Validité</span>
          <span className="status-info-value">30 Jours</span>
        </div>
        <div className="status-info-row">
          <span className="status-info-label">Statut</span>
          <span className="status-info-value" style={{ color: '#27ae60' }}>Actif ✓</span>
        </div>
      </div>

      {/* Home Button */}
      <button
        className="status-home-btn"
        onClick={() => navigate(`/${effectiveUserId}`)}
      >
        ← Retour aux Forfaits
      </button>

      <footer className="status-footer">
        <p>🇨🇩 Services Data RDC<br />{providerName}</p>
      </footer>
    </div>
  );
}
