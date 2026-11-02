import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../DataContext';
import { useUserId } from '../hooks/useUserId';
import './Dataplans.css';

const DATA_PLANS = [
  { id: 'starter',   data: '1GB',       price: 0.19, tag: null },
  { id: 'basic',     data: '3GB',       price: 0.39, tag: null },
  { id: 'standard',  data: '7GB',       price: 0.79, tag: null },
  { id: 'popular',   data: '15GB',      price: 1.49, tag: 'POPULAR' },
  { id: 'pro',       data: '30GB',      price: 2.99, tag: null },
  { id: 'max',       data: '50GB',      price: 5.49, tag: null },
  { id: 'unlimited', data: 'Unlimited', price: 7.49, tag: 'BEST VALUE' },
];

const PROVIDERS = [
  {
    id: 'airtel',
    name: 'Airtel Money',
    desc: 'Pay with Airtel Mobile Money',
    icon: 'A',
  },
  {
    id: 'maxit',
    name: 'MaxIt RDC',
    desc: 'Pay with MaxIt Mobile Money',
    icon: 'M',
  },
];

export default function Dataplans() {
  const navigate = useNavigate();
  const { selectDataPlan } = useData();
  const { userId } = useUserId();

  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showProviders, setShowProviders] = useState(false);

  const handlePlanSelect = (plan) => {
    setSelectedPlan(plan);
    setTimeout(() => setShowProviders(true), 300);
  };

  const handleProviderSelect = (provider) => {
    selectDataPlan({
      ...selectedPlan,
      provider: provider.id,
      providerName: provider.name,
    });

    navigate(`/${userId}/login/${provider.id}`);
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
          DR CONGO DATA PLANS
        </div>
        <h1>Choose Your Plan</h1>
        <p>Select a data package, then choose your preferred payment provider</p>
      </header>

      {/* Plans Grid */}
      <div className="plans-grid">
        {DATA_PLANS.map((plan) => (
          <div
            key={plan.id}
            className={`plan-card${plan.tag === 'POPULAR' ? ' popular' : ''}${plan.id === 'unlimited' ? ' unlimited' : ''}${selectedPlan?.id === plan.id ? ' selected' : ''}`}
            onClick={() => handlePlanSelect(plan)}
          >
            {plan.tag && <div className="plan-tag">{plan.tag}</div>}
            <div className="plan-data">{plan.data}</div>
            <div className="plan-label">Data Bundle</div>
            <div className="plan-price">
              <span className="currency">$</span>
              {plan.price.toFixed(2)}
            </div>
            <div className="plan-period">30 days</div>
          </div>
        ))}
      </div>

      {/* Trust strip */}
      <div className="trust-strip">
        <div className="trust-item">
          <span className="trust-icon">🔒</span>
          Secure
        </div>
        <div className="trust-item">
          <span className="trust-icon">⚡</span>
          Instant
        </div>
        <div className="trust-item">
          <span className="trust-icon">✓</span>
          Verified
        </div>
      </div>

      {/* Footer */}
      <footer className="dataplans-footer">
        <p>DRC Mobile Data Services<br />Powered by Airtel &amp; MaxIt</p>
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
              <h2>Select Provider</h2>
              <p>Choose your payment method</p>
            </div>

            <div className="provider-options">
              {PROVIDERS.map((provider) => (
                <div
                  key={provider.id}
                  className={`provider-card ${provider.id}`}
                  onClick={() => handleProviderSelect(provider)}
                >
                  <div className="provider-icon">{provider.icon}</div>
                  <div className="provider-info">
                    <div className="provider-name">{provider.name}</div>
                    <div className="provider-desc">{provider.desc}</div>
                  </div>
                  <div className="provider-arrow">→</div>
                </div>
              ))}
            </div>

            <button className="sheet-close" onClick={handleCloseSheet}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
