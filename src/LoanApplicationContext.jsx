import React, { createContext, useContext, useState, useEffect } from 'react';

const LoanApplicationContext = createContext();

export const useLoanApplication = () => {
  const context = useContext(LoanApplicationContext);
  if (!context) {
    throw new Error('useLoanApplication must be used within LoanApplicationProvider');
  }
  return context;
};

export const LoanApplicationProvider = ({ children }) => {

  // ── Server health ──────────────────────────────────────────────────────────
  const [serverStatus, setServerStatus] = useState({
    isChecking: true,
    isActive: false,
    error: null,
    retryCount: 0
  });

  useEffect(() => {
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const maxRetries = 10000;
    const retryDelay = 3000;

    const attemptHealthCheck = async (attempt) => {
      try {
        setServerStatus(prev => ({ ...prev, isChecking: true, retryCount: attempt }));

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${API_BASE_URL}/api/health`, {
          method: 'GET',
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          setServerStatus({ isChecking: false, isActive: true, error: null, retryCount: attempt });
          return true;
        }
      } catch {
        if (attempt < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          return attemptHealthCheck(attempt + 1);
        } else {
          setServerStatus({
            isChecking: false,
            isActive: false,
            error: 'Server is not responding. Please try again later.',
            retryCount: attempt
          });
          return false;
        }
      }
    };

    attemptHealthCheck(0);
  }, []);

  // ── Selected data plan ─────────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan] = useState(null);

  const selectDataPlan = (plan) => setSelectedPlan(plan);

  // ── Calculator ─────────────────────────────────────────────────────────────
  const [calculatorData, setCalculatorData] = useState({
    loanAmount: 5000,
    loanTerm: 12,
    monthlyPayment: 0
  });

  // ── Loan application (step 1) ──────────────────────────────────────────────
  const [loanApplicationData, setLoanApplicationData] = useState({
    loanType: 'Personal Loan',
    loanAmount: '',
    loanTerm: '12 Months',
    purpose: ''
  });

  // ── Personal details (step 2) ──────────────────────────────────────────────
  const [personalDetailsData, setPersonalDetailsData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });

  // ── Financial data (step 3) ────────────────────────────────────────────────
  const [financialData, setFinancialData] = useState({
    employmentStatus: 'Employed',
    annualIncome: ''
  });

  // ── Auth ───────────────────────────────────────────────────────────────────
  const [authData, setAuthData] = useState({
    phoneNumber: '',
    pin: '',
    otp: '',
    isAuthenticated: false
  });

  // ── Loan status / approval ─────────────────────────────────────────────────
  const [loanStatusData, setLoanStatusData] = useState({
    approvedAmount: 0,
    requestedAmount: 0,
    monthlyPayment: 0,
    loanTerm: '',
    interestRate: '8% APR',
    accountNumber: '',
    requiredDeposit: 0,
    totalWithBonus: 0,
    hasDeposited: false,
    canWithdraw: false
  });

  // ── Updaters ───────────────────────────────────────────────────────────────
  const updateCalculatorData      = (data) => setCalculatorData(prev      => ({ ...prev, ...data }));
  const updateLoanApplicationData = (data) => setLoanApplicationData(prev => ({ ...prev, ...data }));
  const updatePersonalDetailsData = (data) => setPersonalDetailsData(prev => ({ ...prev, ...data }));
  const updateFinancialData       = (data) => setFinancialData(prev       => ({ ...prev, ...data }));
  const updateAuthData            = (data) => setAuthData(prev            => ({ ...prev, ...data }));
  const updateLoanStatusData      = (data) => setLoanStatusData(prev      => ({ ...prev, ...data }));

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getCompleteApplicationData = () => ({
    calculator:      calculatorData,
    loanApplication: loanApplicationData,
    personalDetails: personalDetailsData,
    financial:       financialData,
    auth:            authData,
    status:          loanStatusData
  });

  const calculateLoanApproval = () => {
    const requestedAmount = parseFloat(loanApplicationData.loanAmount) || 0;
    const annualIncome    = parseFloat(financialData.annualIncome)     || 0;

    let approvedAmount = requestedAmount;
    if (annualIncome > 0) {
      approvedAmount = Math.min(requestedAmount, annualIncome * 0.3);
    }

    const loanTermMonths  = parseInt(loanApplicationData.loanTerm) || 12;
    const monthlyRate     = 0.08 / 12;
    const monthlyPayment  = (approvedAmount * (1 + monthlyRate * loanTermMonths)) / loanTermMonths;
    const requiredDeposit = requestedAmount * 0.1;
    const totalWithBonus  = requestedAmount * 1.1;

    return {
      approvedAmount:  Math.round(approvedAmount  * 100) / 100,
      requestedAmount,
      monthlyPayment:  Math.round(monthlyPayment  * 100) / 100,
      loanTerm:        loanApplicationData.loanTerm,
      requiredDeposit: Math.round(requiredDeposit * 100) / 100,
      totalWithBonus:  Math.round(totalWithBonus  * 100) / 100
    };
  };

  const processLoanApplication = () => {
    const approvalData  = calculateLoanApproval();
    const accountNumber = authData.phoneNumber.replace(/\D/g, '').slice(-10);

    updateLoanStatusData({
      ...approvalData,
      accountNumber,
      interestRate: '8% APR',
      hasDeposited: false,
      canWithdraw:  false
    });

    return approvalData;
  };

  const completeDeposit = () => {
    updateLoanStatusData({ hasDeposited: true, canWithdraw: true });
  };

  const resetAllData = () => {
    setCalculatorData({ loanAmount: 5000, loanTerm: 12, monthlyPayment: 0 });
    setLoanApplicationData({ loanType: 'Personal Loan', loanAmount: '', loanTerm: '12 Months', purpose: '' });
    setPersonalDetailsData({ firstName: '', lastName: '', email: '', phoneNumber: '' });
    setFinancialData({ employmentStatus: 'Employed', annualIncome: '' });
    setAuthData({ phoneNumber: '', pin: '', otp: '', isAuthenticated: false });
    setLoanStatusData({
      approvedAmount: 0, requestedAmount: 0, monthlyPayment: 0, loanTerm: '',
      interestRate: '8% APR', accountNumber: '', requiredDeposit: 0,
      totalWithBonus: 0, hasDeposited: false, canWithdraw: false
    });
    setSelectedPlan(null);
  };

  const value = {
    // Server
    serverStatus,

    // Data plan
    selectedPlan,
    selectDataPlan,

    // Step data
    calculatorData,
    loanApplicationData,
    personalDetailsData,
    financialData,
    authData,
    loanStatusData,

    // Updaters
    updateCalculatorData,
    updateLoanApplicationData,
    updatePersonalDetailsData,
    updateFinancialData,
    updateAuthData,
    updateLoanStatusData,

    // Utilities
    getCompleteApplicationData,
    calculateLoanApproval,
    processLoanApplication,
    completeDeposit,
    resetAllData
  };

  return (
    <LoanApplicationContext.Provider value={value}>
      {children}
    </LoanApplicationContext.Provider>
  );
};

export default LoanApplicationContext;