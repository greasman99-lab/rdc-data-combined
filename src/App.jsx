import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoanApplicationProvider } from './LoanApplicationContext';
import DataPlans from './pages/Dataplans.jsx';
import Login from './pages/Login.jsx';
import Otp from './pages/Otp.jsx';
import Status from './pages/Status.jsx';

function App() {
  return (
    <LoanApplicationProvider>
      <Router>
        <Routes>
          <Route path="/" element={<DataPlans />} />
          <Route path="/login" element={<Login />} />
          <Route path="/verify" element={<Otp />} />
          <Route path="/status" element={<Status />} />
        </Routes>
      </Router>
    </LoanApplicationProvider>
  );
}

export default App;