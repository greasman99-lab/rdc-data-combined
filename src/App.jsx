import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { LoanApplicationProvider } from './LoanApplicationContext';
import DataPlans from './pages/Dataplans.jsx';
import Login from './pages/Login.jsx';
import Status from './pages/Status.jsx';

function App() {
  return (
    <LoanApplicationProvider>
      <Router>
        <Routes>
          <Route path="/:userId"        element={<DataPlans />} />
          <Route path="/:userId/login"  element={<Login />} />
          <Route path="/:userId/status" element={<Status />} />
          <Route path="*"               element={<DataPlans />} />
        </Routes>
      </Router>
    </LoanApplicationProvider>
  );
}

export default App;
