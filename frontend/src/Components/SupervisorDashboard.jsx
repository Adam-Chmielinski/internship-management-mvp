import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SupervisorDashboard.css';
import API_URL from '../Config/api';

const SupervisorDashboard = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          logout();
          navigate('/login');
          return;
        }

        const response = await fetch(`${API_URL}/supervisor/interns`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          if (response.status === 401) {
            logout();
            navigate('/login');
            return;
          }
          throw new Error('Failed to fetch participants');
        }

        const data = await response.json();
        setParticipants(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [logout, navigate]);

  const handleParticipantClick = (participantId) => {
    navigate(`/monitoring/${participantId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="supervisor-dashboard">Loading participants...</div>;
  if (error) return <div className="supervisor-dashboard">Error: {error}</div>;

  return (
    <div className="supervisor-dashboard">
      <div className="dashboard-header">
        <h1>Supervisor Dashboard</h1>
        <p>Welcome, {user?.name || `Supervisor #${user?.id}`}</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Log Out
        </button>
      </div>

      <div className="participants-grid">
        <h2>Your Assigned Participants</h2>
        {participants.length === 0 ? (
          <p>No participants assigned yet.</p>
        ) : (
          <div className="participants-list">
            {participants.map((participant) => (
              <div
                key={participant.id}
                className="participant-card"
                onClick={() => handleParticipantClick(participant.id)}
              >
                <div className="participant-avatar">
                  {(participant.full_name || participant.name || 'P')[0].toUpperCase()}
                </div>
                <div className="participant-info">
                  <h3>{participant.full_name || participant.name || 'Unnamed Participant'}</h3>
                  <p className="participant-email">{participant.email || 'No email'}</p>
                  <p className="participant-sector">
                    Sector: {participant.training_sector || 'Not assigned'}
                  </p>
                </div>
                <div className="participant-arrow">→</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SupervisorDashboard;