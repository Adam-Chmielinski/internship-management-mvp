import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './SupervisorDashboard.css';
import API_URL from '../../Config/api';

const SupervisorDashboard = () => {
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user, logout } = useAuth();
  const [supervisorName, setSupervisorName] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSupervisorName = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('No token found for supervisor name fetch');
          return;
        }

        console.log('Fetching supervisor name from:', `${API_URL}/supervisor/fullName`);
        
        const response = await fetch(`${API_URL}/supervisor/fullName`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        console.log('Supervisor name response status:', response.status);

        if (!response.ok) {
          console.error('Failed to fetch supervisor name, status:', response.status);
          if (response.status === 401) {
            logout();
            navigate('/login');
            return;
          }
          return;
        }

        const data = await response.json();
        console.log('Supervisor name response data:', data);
        
        // Handle the array response with an object containing full_name
        if (Array.isArray(data) && data.length > 0 && data[0].full_name) {
          setSupervisorName(data[0].full_name);
        } else if (typeof data === 'string') {
          setSupervisorName(data);
        } else if (data.name) {
          setSupervisorName(data.name);
        } else if (data.fullName) {
          setSupervisorName(data.fullName);
        } else if (data.full_name) {
          setSupervisorName(data.full_name);
        } else {
          console.log('Unexpected data structure:', data);
        }
        
      } catch (err) {
        console.error('Error in fetchSupervisorName:', err);
      }
    };

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
        console.log('Fetched participants:', data);
        setParticipants(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err.message);
      }
    };

    // Fetch both in parallel but handle loading state properly
    const fetchAllData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSupervisorName(),
        fetchParticipants()
      ]);
      setLoading(false);
    };

    fetchAllData();
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
        <p>Welcome, {supervisorName || user?.fullName || `Supervisor #${user?.id}`}</p>
        <button onClick={handleLogout} className="logout-btn">
          Log Out
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