import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import MainApp from './components/MainApp';
import LiveTracking from './components/LiveTracking';
import AdminCampusPilot from './components/AdminCampusPilot';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/app" element={<MainApp />} />
        <Route path="/track/:id" element={<LiveTracking />} />
        <Route path="/admin/pilot" element={<AdminCampusPilot />} />
      </Routes>
    </Router>
  );
}

export default App;
