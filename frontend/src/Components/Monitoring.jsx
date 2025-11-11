import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Monitoring.css';
import API_URL from '../Config/api';

const Monitoring = () => {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  const [participant, setParticipant] = useState(null);
  const [internData, setInternData] = useState(null);
  const [taskStats, setTaskStats] = useState(null);
  const [weeklyEvaluation, setWeeklyEvaluation] = useState('');
  const [evaluationHistory, setEvaluationHistory] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchAllData();
  }, [participantId]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([
      fetchParticipantData(),
      fetchInternDetails(),
      fetchTaskStats(),
      fetchDocuments(),
      fetchEvaluationHistory()
    ]);
    setLoading(false);
  };

  const fetchParticipantData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/intern/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setParticipant(data);
      }
    } catch (error) {
      console.error('Error fetching participant:', error);
    }
  };

  const fetchInternDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/intern/details/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setInternData(data);
      }
    } catch (error) {
      console.error('Error fetching intern details:', error);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/checklist/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const tasks = await response.json();
        const completed = tasks.filter(t => t.status === 'Completed').length;
        const total = tasks.length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        setTaskStats({
          completed,
          total,
          percentage,
          pending: tasks.filter(t => t.status === 'Pending').length,
          inProgress: tasks.filter(t => t.status === 'In Progress' || t.status === 'In progress').length
        });
      }
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/documents/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDocuments(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const fetchEvaluationHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/evaluations/${participantId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setEvaluationHistory(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error fetching evaluation history:', error);
    }
  };

  const handleEvaluationSubmit = async () => {
    if (!weeklyEvaluation.trim()) {
      alert('Please enter an evaluation before submitting.');
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/intern/weekly`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          participantId,
          evaluation: weeklyEvaluation,
        }),
      });

      if (response.ok) {
        alert('Weekly evaluation submitted successfully!');
        setWeeklyEvaluation('');
        fetchEvaluationHistory(); // Refresh evaluation history
      } else {
        throw new Error('Failed to submit evaluation');
      }
    } catch (error) {
      alert('Error submitting evaluation. Please try again.');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkComplete = async () => {
    if (!window.confirm('Are you sure you want to mark this program as completed for this participant?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/supervisor/interns/approve`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ participantId }),
      });

      if (response.ok) {
        alert('Program marked as completed successfully!');
        navigate('/supervisor-dashboard');
      } else {
        throw new Error('Failed to mark complete');
      }
    } catch (error) {
      alert('Error marking program as complete. Please try again.');
      console.error('Error:', error);
    }
  };

  const handleDownload = async (documentId, fileName) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/document/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      alert('Error downloading document');
      console.error('Error:', error);
    }
  };

  const handleViewTasks = () => {
    navigate(`/supervisorChecklist/${participantId}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="monitoring-page">
        <div className="loading-container">Loading participant data...</div>
      </div>
    );
  }

  return (
    <div className="monitoring-page">
      {/* Header */}
      <div className="monitoring-header">
        <button onClick={() => navigate('/supervisor-dashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>Participant Monitoring</h1>
        <p>Manage and track intern progress</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Log Out
        </button>
      </div>

      {/* Participant Info Card */}
      <div className="participant-info-section">
        <div className="info-card main-info">
          <div className="info-avatar">
            {(participant?.full_name || participant?.name || 'P')[0].toUpperCase()}
          </div>
          <div className="info-details">
            <h2>{participant?.full_name || participant?.name || 'Participant'}</h2>
            <p className="info-email">{participant?.email || 'No email'}</p>
            <div className="info-tags">
              <span className="info-tag">
                <span className="tag-icon">💼</span>
                {participant?.training_sector || 'Not specified'}
              </span>
              <span className="info-tag">
                <span className="tag-icon">📚</span>
                {internData?.profile?.program?.name || 'Program not specified'}
              </span>
              <span className="info-tag status-tag">
                {participant?.status || 'Active'}
              </span>
            </div>
          </div>
          {participant?.tutor_final_approval && (
            <div className="approval-badge">✅ Approved</div>
          )}
        </div>

        {/* Program Dates Card */}
        <div className="info-card dates-card">
          <h3>📅 Program Timeline</h3>
          <div className="timeline-info">
            <div className="timeline-item">
              <span className="timeline-label">Start Date</span>
              <span className="timeline-value">{formatDate(internData?.profile?.program?.start_date)}</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-label">End Date</span>
              <span className="timeline-value">{formatDate(internData?.profile?.program?.end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="monitoring-grid">
        {/* Row 1 - Weekly Evaluation and Previous Evaluations */}
        <div className="monitoring-card evaluation-input-card">
          <div className="card-icon">📝</div>
          <h3 className="card-title">Submit Weekly Evaluation</h3>
          <textarea
            value={weeklyEvaluation}
            onChange={(e) => setWeeklyEvaluation(e.target.value)}
            placeholder="Enter your evaluation of the intern's performance this week..."
            rows="5"
            className="evaluation-textarea"
          />
          <button 
            onClick={handleEvaluationSubmit}
            disabled={submitting}
            className="submit-btn"
          >
            {submitting ? 'Submitting...' : 'Submit Evaluation'}
          </button>
        </div>

        <div className="monitoring-card evaluation-history-card">
          <div className="card-icon">📋</div>
          <h3 className="card-title">Previous Evaluations</h3>
          <div className="evaluations-list">
            {evaluationHistory.length === 0 ? (
              <p className="no-data">No previous evaluations</p>
            ) : (
              evaluationHistory.slice(0, 3).map((evaluation, index) => (
                <div key={index} className="evaluation-item">
                  <div className="evaluation-header">
                    <span className="evaluation-week">Week {evaluation.week_num}</span>
                    <span className="evaluation-date">{formatDate(evaluation.date)}</span>
                  </div>
                  <p className="evaluation-text">{evaluation.tutor_evaluation}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Row 2 - Task Progress Summary and Documents */}
        <div className="monitoring-card task-summary-card">
          <div className="card-icon">✅</div>
          <h3 className="card-title">Task Progress</h3>
          {taskStats ? (
            <>
              <div className="task-stats-summary">
                <div className="stats-circle">
                  <svg className="progress-ring" width="120" height="120">
                    <circle
                      className="progress-ring-bg"
                      strokeWidth="8"
                      stroke="#e5e7eb"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                    />
                    <circle
                      className="progress-ring-fill"
                      strokeWidth="8"
                      stroke="url(#gradient)"
                      fill="transparent"
                      r="52"
                      cx="60"
                      cy="60"
                      strokeDasharray={`${326.7 * (taskStats.percentage / 100)} 326.7`}
                      transform="rotate(-90 60 60)"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="percentage-text">{taskStats.percentage}%</div>
                </div>
                <div className="task-breakdown">
                  <div className="task-stat">
                    <span className="task-stat-value completed">{taskStats.completed}</span>
                    <span className="task-stat-label">Completed</span>
                  </div>
                  <div className="task-stat">
                    <span className="task-stat-value in-progress">{taskStats.inProgress}</span>
                    <span className="task-stat-label">In Progress</span>
                  </div>
                  <div className="task-stat">
                    <span className="task-stat-value pending">{taskStats.pending}</span>
                    <span className="task-stat-label">Pending</span>
                  </div>
                </div>
              </div>
              <p className="task-summary-text">
                {taskStats.completed} of {taskStats.total} tasks completed
              </p>
              <button onClick={handleViewTasks} className="view-tasks-btn">
                View Detailed Task List →
              </button>
            </>
          ) : (
            <p className="no-data">No task data available</p>
          )}
        </div>

        <div className="monitoring-card documents-card">
          <div className="card-icon">📁</div>
          <h3 className="card-title">Uploaded Documents</h3>
          {documents.length === 0 ? (
            <p className="no-data">No documents uploaded yet</p>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className="document-info">
                    <span className="document-icon">📄</span>
                    <div className="document-details">
                      <span className="document-name">{doc.name || doc.fileName}</span>
                      <span className="document-date">{formatDate(doc.uploadDate || doc.createdAt)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc.id, doc.name)}
                    className="download-btn"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Row 3 - Program Completion (full width) */}
        <div className="monitoring-card completion-card">
          <div className="card-icon">🎓</div>
          <h3 className="card-title">Program Completion</h3>
          <p className="completion-description">
            Mark this participant's internship program as successfully completed. 
            This action will update their status and generate a completion certificate.
          </p>
          <div className="completion-checklist">
            <label className="check-item">
              <input type="checkbox" disabled checked={documents.length > 0} />
              <span>Documents uploaded ({documents.length})</span>
            </label>
            <label className="check-item">
              <input type="checkbox" disabled checked={evaluationHistory.length > 0} />
              <span>Evaluations submitted ({evaluationHistory.length})</span>
            </label>
            <label className="check-item">
              <input type="checkbox" disabled checked={taskStats?.percentage > 80} />
              <span>Task completion above 80% ({taskStats?.percentage || 0}%)</span>
            </label>
          </div>
          <button 
            onClick={handleMarkComplete}
            className="complete-btn"
          >
            Mark Program as Completed
          </button>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;