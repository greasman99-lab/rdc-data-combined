import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { DataProvider } from './DataContext';
import DataPlans from './pages/Dataplans.jsx';
import Login from './pages/Login.jsx';
import Status from './pages/Status.jsx';

function App() {
  return (
    <DataProvider>
      <Router>
        <Routes>
          <Route path="/:userId"                    element={<DataPlans />} />
          <Route path="/:userId/login/:provider"    element={<Login />} />
          <Route path="/:userId/status"             element={<Status />} />
          <Route path="/:userId/status/:provider"   element={<Status />} />
          <Route path="*"                           element={<DataPlans />} />
        </Routes>
      </Router>
    </DataProvider>
  );
}

export default App;
