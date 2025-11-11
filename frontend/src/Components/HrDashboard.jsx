import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './dashboards.css';  // <-- Changed to single file

const HrDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard hr-dashboard">
      <h2>HR Dashboard</h2>
      <p>Welcome, {user?.name || user?.username || `User #${user?.id ?? 'Guest'}`}!</p>

      <div className="dashboard-actions">
        <Link to="/Management" className="dashboard-btn primary">
          🗂️ Master Management
        </Link>
        <Link to="/Reports" className="dashboard-btn secondary">
          📊 Reports
        </Link>
        <Link to="/FinalDocuments" className="dashboard-btn tertiary">
          📁 Final Documents
        </Link>
      </div>

      <div className="logout-container">
        <button onClick={handleLogout} className="logout-btn">
          🚪 Log Out
        </button>
      </div>
    </div>
  );
};

export default HrDashboard;