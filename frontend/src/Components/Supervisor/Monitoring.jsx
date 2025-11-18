import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Monitoring.css';
import API_URL from '../../Config/api';

const Monitoring = () => {
  const { participantId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Separate states for each endpoint
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [monitoring, setMonitoring] = useState([]);
  const [documents, setDocuments] = useState([]);
  
  // Loading states for each section
  const [loadingStates, setLoadingStates] = useState({
    profile: true,
    progress: true,
    monitoring: true,
    documents: true
  });
  
  const [weeklyEvaluation, setWeeklyEvaluation] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
  };

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, profile: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${participantId}/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProfile(data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, profile: false }));
    }
  };

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, progress: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${participantId}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (error) {
      console.error('Error fetching progress:', error);
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };

  // Fetch monitoring data (evaluations)
  const fetchMonitoringData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, monitoring: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${participantId}/monitoring`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Monitoring data received:', data);
        
        // Extract monitoring array from response
        const monitoringArray = data.monitoring || data.evaluations || data.data || [];
        setMonitoring(monitoringArray);
      }
    } catch (error) {
      console.error('Error fetching monitoring:', error);
      setMonitoring([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, monitoring: false }));
    }
  };

  // Fetch documents data
  const fetchDocumentsData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, documents: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${participantId}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Documents data received:', data);
        
        // Extract documents array from response
        const documentsArray = data.documents || data.data || [];
        setDocuments(documentsArray);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
    } finally {
      setLoadingStates(prev => ({ ...prev, documents: false }));
    }
  };

  // Fetch task stats from supervisor endpoint
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
        
        // Update progress state with task stats
        setProgress(prev => ({
          ...prev,
          completed_tasks: completed,
          total_tasks: total,
          percent: percentage,
          pending: tasks.filter(t => t.status === 'Pending').length,
          inProgress: tasks.filter(t => t.status === 'In Progress' || t.status === 'In progress').length
        }));
      }
    } catch (error) {
      console.error('Error fetching task stats:', error);
    }
  };

  // Initial load - fetch all data
  useEffect(() => {
    fetchProfileData();
    fetchProgressData();
    fetchMonitoringData();
    fetchDocumentsData();
    fetchTaskStats();
  }, [participantId]);

  const handleEvaluationSubmit = async () => {
    if (!weeklyEvaluation.trim()) {
      showStatus('Please enter an evaluation before submitting', 'error');
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
        showStatus('✓ Weekly evaluation submitted successfully!', 'success');
        setWeeklyEvaluation('');
        // Only refresh monitoring data, not everything
        await fetchMonitoringData();
      } else {
        throw new Error('Failed to submit evaluation');
      }
    } catch (error) {
      showStatus('✗ Error submitting evaluation. Please try again.', 'error');
      console.error('Error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  // Check if all requirements are met for completion
  const areAllRequirementsMet = () => {
    const hasDocuments = documents.length > 0;
    const hasEvaluations = monitoring.length > 0;
    const allTasksCompleted = progress?.percent === 100;
    
    return hasDocuments && hasEvaluations && allTasksCompleted;
  };

  const handleMarkComplete = async () => {
    if (!areAllRequirementsMet()) {
      showStatus('⚠️ Please complete all requirements before marking the program as complete', 'error');
      return;
    }

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
        showStatus('✓ Program marked as completed successfully!', 'success');
        handleEmailCertificate();
        setTimeout(() => navigate('/supervisorDashboard'), 2000);
      } else {
        throw new Error('Failed to mark complete');
      }
    } catch (error) {
      showStatus('✗ Error marking program as complete. Please try again.', 'error');
      console.error('Error:', error);
    }
  };

  const handleDownload = async (documentId, docType) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/documents/download/${documentId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const fileName = `${docType.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showStatus(`✓ Downloaded ${docType} successfully`, 'success');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      showStatus('✗ Error downloading document', 'error');
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

  const handleEmailCertificate = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/certificate/${participantId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        showStatus('✓ Certificate has been sent to the participant\'s email address!', 'success');
      } else {
        showStatus('✗ Failed to send certificate', 'error');
      }
    } catch (err) {
      showStatus('✗ Error sending certificate', 'error');
      console.error(err);
    }
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

  const getDocumentIcon = (docType) => {
    const iconMap = {
      'CV': '📋',
      'Cover Letter': '✉️',
      'Academic Transcript': '🎓',
      'Certificate': '🏆',
      'ID Document': '🆔',
      'Recommendation Letter': '📨',
      'Project Report': '📊',
      'Training Agreement': '📝',
      'Evaluation Form': '✅',
      'Final Report': '📑',
      'Other': '📄'
    };
    return iconMap[docType] || '📄';
  };

  // Check if initial load is complete
  const isInitialLoading = loadingStates.profile;

  if (isInitialLoading) {
    return (
      <div className="monitoring-page">
        <div className="loading-container">Loading participant data...</div>
      </div>
    );
  }

  const allRequirementsMet = areAllRequirementsMet();

  return (
    <div className="monitoring-page">
      {statusMessage.text && (
        <div className={`status-notification ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="monitoring-header">
        <button onClick={() => navigate('/supervisorDashboard')} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>Participant Monitoring</h1>
        <p>Manage and track intern progress</p>
        <button onClick={handleLogout} className="logout-btn">
          Log Out 
        </button>
      </div>

      <div className="participant-info-section">
        <div className="info-card main-info">
          <div className="info-avatar"> 
            {(profile?.full_name || 'P')[0].toUpperCase()}
          </div>
          <div className="info-details">
            <h2>{profile?.full_name || 'Participant'}</h2>
            <p className="info-email">{profile?.email || 'No email'}</p>
            <div className="info-tags">
              <span className="info-tag">
                <span className="tag-icon">💼</span>
                {profile?.training_sector || 'Not specified'}
              </span>
              <span className="info-tag">
                <span className="tag-icon">📚</span>
                {profile?.program?.name || 'Program not specified'}
              </span>
            </div>
          </div>
          {profile?.tutor_final_approval && (
            <div className="approval-badge">✅ Approved</div>
          )}
        </div>

        <div className="info-card dates-card">
          <h3>📅 Program Timeline</h3>
          <div className="timeline-info">
            <div className="timeline-item">
              <span className="timeline-label">Start Date</span>
              <span className="timeline-value">{formatDate(profile?.program?.start_date)}</span>
            </div>
            <div className="timeline-item">
              <span className="timeline-label">End Date</span>
              <span className="timeline-value">{formatDate(profile?.program?.end_date)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="monitoring-grid">
        <div className="monitoring-card evaluation-input-card">
          <div className="card-icon">📝</div>
          <h3 className="card-title">Submit Weekly Evaluation - Week {monitoring.length + 1}</h3>
          <textarea
            value={weeklyEvaluation}
            onChange={(e) => setWeeklyEvaluation(e.target.value)}
            placeholder={`Enter your evaluation of the intern's performance for week ${monitoring.length + 1}...`}
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

        <div className="dashboard-card evaluations-card">
          <div className="card-icon">📝</div>
          <h2 className="card-title">Previous Evaluations</h2>
          {loadingStates.monitoring ? (
            <div className="card-loading">Loading evaluations...</div>
          ) : (
            <div className="evaluations-content">
              {monitoring && monitoring.length > 0 ? (
                <div className="evaluations-list">
                  {monitoring.map((evaluation, index) => (
                    <div key={evaluation.id || index} className="evaluation-item">
                      <div className="evaluation-week">
                        Week {evaluation.week_num || evaluation.weekNum || evaluation.week || (index + 1)}
                      </div>
                      <div className="evaluation-text">
                        {evaluation.tutor_evaluation || evaluation.evaluation || evaluation.comment || 'No evaluation text'}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="no-data">No evaluations yet</p>
              )}
            </div>
          )}
        </div>

        <div className="monitoring-card task-summary-card">
          <div className="card-icon">✅</div>
          <h3 className="card-title">Task Progress</h3>
          {loadingStates.progress ? (
            <div className="card-loading">Loading progress...</div>
          ) : progress ? (
            <>
              <div className="task-stats-summary">
                <div className="stats-circle">
                  <svg className="progress-ring" viewBox="0 0 120 120">
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
                      strokeDasharray={`${326.7 * ((progress.percent || 0) / 100)} 326.7`}
                      transform="rotate(-90 60 60)"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="percentage-text">{progress.percent || 0}%</div>
                </div>
                <div className="task-breakdown">
                  <div className="task-stat">
                    <span className="task-stat-value completed">{progress.completed_tasks || 0}</span>
                    <span className="task-stat-label">Completed</span>
                  </div>
                  <div className="task-stat">
                    <span className="task-stat-value in-progress">{progress.inProgress || 0}</span>
                    <span className="task-stat-label">In Progress</span>
                  </div>
                  <div className="task-stat">
                    <span className="task-stat-value pending">{progress.pending || 0}</span>
                    <span className="task-stat-label">Pending</span>
                  </div>
                </div>
              </div>
              <p className="task-summary-text">
                {progress.completed_tasks || 0} of {progress.total_tasks || 0} tasks completed
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
          {loadingStates.documents ? (
            <div className="card-loading">Loading documents...</div>
          ) : documents.length === 0 ? (
            <p className="no-data">No documents uploaded yet</p>
          ) : (
            <div className="documents-list">
              {documents.map((doc, index) => (
                <div key={doc.id || index} className="document-item">
                  <div className="document-info">
                    <span className="document-icon">
                      {getDocumentIcon(doc.doc_type)}
                    </span>
                    <div className="document-details">
                      <span className="document-type-badge">{doc.doc_type}</span>
                      <span className="document-date">Uploaded: {formatDate(doc.upload_date)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDownload(doc.id, doc.doc_type)}
                    className="download-btn"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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
              <input type="checkbox" disabled checked={monitoring.length > 0} />
              <span>Evaluations submitted ({monitoring.length})</span>
            </label>
            <label className="check-item">
              <input type="checkbox" disabled checked={progress?.percent === 100} />
              <span>All tasks completed ({progress?.percent || 0}%)</span>
            </label>
          </div>
          <button 
            onClick={handleMarkComplete}
            className={`complete-btn ${!allRequirementsMet ? 'disabled' : ''}`}
            disabled={!allRequirementsMet}
          >
            Mark Program as Completed
          </button>
        </div>
      </div>
    </div>
  );
};

export default Monitoring;