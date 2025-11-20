import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './InternDashboard.css';
import API_URL from '../../Config/api';

const InternDashboard = () => {
  // Separate states for each endpoint
  const [profile, setProfile] = useState(null);
  const [progress, setProgress] = useState(null);
  const [recentMonitoring, setRecentMonitoring] = useState([]);
  const [documents, setRecentDocuments] = useState([]);
  
  // Loading states for each section
  const [loadingStates, setLoadingStates] = useState({
    profile: true,
    progress: true,
    monitoring: true,
    documents: true
  });
  
  const [uploadFile, setUploadFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [error, setError] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const documentTypes = [
    'CV',
    'Cover Letter',
    'Academic Transcript',
    'Certificate',
    'ID Document',
    'Recommendation Letter',
    'Project Report',
    'Training Agreement',
    'Evaluation Form',
    'Other'
  ];

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
  };

  // Fetch profile data
  const fetchProfileData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, profile: true }));
      const token = localStorage.getItem('token');
      
      if (!token) {
        logout();
        navigate('/login');
        return;
      }

      const response = await fetch(`${API_URL}/intern/${user.id}/profile`, {
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
        if (response.status === 404) {
          setProfile(null);
          return;
        }
        throw new Error('Failed to fetch profile data');
      }

      const data = await response.json();
      setProfile(data);
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError(err.message);
    } finally {
      setLoadingStates(prev => ({ ...prev, profile: false }));
    }
  };

  // Fetch progress data
  const fetchProgressData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, progress: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${user.id}/progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, progress: false }));
    }
  };

  // Fetch monitoring data
  const fetchMonitoringData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, monitoring: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${user.id}/monitoring`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Raw monitoring response:', data);
        const recentMonitoringArray = data.monitoring || data.data || data.recentMonitoring || [];
        setRecentMonitoring(recentMonitoringArray);
      }
    } catch (err) {
      console.error('Error fetching monitoring:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, monitoring: false }));
    }
  };

  // Fetch documents data
  const fetchDocumentsData = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, documents: true }));
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/intern/${user.id}/documents`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Raw documents response:', data);
  
        // Extract the array from the response
        const documentsArray = data.documents || data.data || data.recentDocuments || [];
        setRecentDocuments(documentsArray);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    } finally {
      setLoadingStates(prev => ({ ...prev, documents: false }));
    }
  };

  // Fetch all data on mount
  useEffect(() => {
    fetchProfileData();
    fetchProgressData();
    fetchMonitoringData();
    fetchDocumentsData();
  }, []);

  const handleDownloadCertificate = async () => {
    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/certificate/download`, {
        headers: {
          'Authorization': `Bearer ${token}`, 
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificate_${profile?.full_name?.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showStatus('✓ Certificate downloaded successfully!', 'success');
      } else {
        showStatus('✗ Failed to download certificate', 'error');
      }
    } catch (err) {
      showStatus('✗ Error downloading certificate', 'error');
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      showStatus('Please select a file to upload', 'error');
      return;
    }

    if (!documentType) {
      showStatus('Please select a document type', 'error');
      return;
    }

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', uploadFile);

    try {
      showStatus('Uploading...', 'info');
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/documents/upload/${user.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      showStatus('✓ Document uploaded successfully!', 'success');
      setUploadFile(null);
      setDocumentType('');
      document.getElementById('file-upload').value = '';
      
      // Only refresh documents data, not the entire dashboard
      await fetchDocumentsData();
    } catch (err) {
      showStatus('✗ Failed to upload document', 'error');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const navigateToTasks = () => {
    navigate('/tasks');
  };

  // Check if initial load is complete
  const isInitialLoading = loadingStates.profile;
  
  if (isInitialLoading) {
    return <div className="intern-dashboard">Loading dashboard...</div>;
  }
  
  if (error) {
    return <div className="intern-dashboard">Error: {error}</div>;
  }

  if (!profile || !profile.is_enrolled) {
    return (
      <div className="intern-dashboard">
        <div className="dashboard-header">
          <h1>Intern Dashboard</h1>
          <p>Welcome, {profile?.full_name || 'Intern'}</p>
          <button onClick={handleLogout} className="logout-btn">
            Log Out
          </button>
        </div>

        <div className="not-enrolled-card">
          <div className="not-enrolled-icon">🎓</div>
          <h2>No Active Internship</h2>
          <p>You are not currently enrolled in any internship programs.</p>
          <p className="not-enrolled-subtext">
            Please contact your administrator or supervisor to get enrolled in an internship program.
          </p>
        </div>
      </div>
    );
  }

  const isCompleted = profile?.tutor_final_approval === true;

  return (
    <div className="intern-dashboard">
      {statusMessage.text && (
        <div className={`status-notification ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="dashboard-header">
        <h1>Intern Dashboard</h1>
        <p>Welcome, {profile?.full_name || 'Intern'}</p>
        <button onClick={handleLogout} className="logout-btn">
          Log Out
        </button>
      </div>

      {isCompleted && (
        <div className="completion-celebration-card">
          <div className="celebration-content">
            <div className="celebration-icon">🎉</div>
            <h2>Congratulations!</h2>
            <p className="celebration-text">
              You have successfully completed the {profile?.program?.name || 'internship program'} internship.<br></br>
              The certificate has been sent to your registered email address.
            </p>
            <div className="celebration-stats">
              <div className="celebration-stat">
                <span className="stat-number">{progress?.completed_tasks || 0}</span>
                <span className="stat-label">Tasks Completed</span>
              </div>
              <div className="celebration-stat">
                <span className="stat-number">{recentMonitoring?.length || 0}</span>
                <span className="stat-label">Weekly Evaluations</span>
              </div>
              <div className="celebration-stat">
                <span className="stat-number">{documents?.length || 0}</span>
                <span className="stat-label">Documents Uploaded</span>
              </div>
            </div>
            <div className="completion-actions">
              <button 
                onClick={handleDownloadCertificate} 
                className="completion-btn download-cert"
                disabled={processingAction}
              >
                Download Certificate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        <div className="dashboard-card program-info-card">
          <div className="card-icon">📚</div>
          <h2 className="card-title">Internship Program</h2>
          {loadingStates.profile ? (
            <div className="card-loading">Loading...</div>
          ) : (
            <div className="program-content">
              <h3>{profile?.program?.name || 'Internship Program'}</h3>
              <p className="training-sector">Training Sector: <strong>{profile?.training_sector || 'N/A'}</strong></p>
              <div className="program-dates">
                <div className="date-item">
                  <span className="date-label">Start Date</span>
                  <span className="date-value">{formatDate(profile?.program?.start_date)}</span>
                </div>
                <div className="date-item">
                  <span className="date-label">End Date</span>
                  <span className="date-value">{formatDate(profile?.program?.end_date)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="dashboard-card progress-card">
          <div className="card-icon">📊</div>
          <h2 className="card-title">Task Progress</h2>
          {loadingStates.progress ? (
            <div className="card-loading">Loading progress...</div>
          ) : (
            <div className="progress-content">
              <div className="task-progress-summary">
                <div className="progress-circle-container">
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
                      strokeDasharray={`${326.7 * ((progress?.percent || 0) / 100)} 326.7`}
                      transform="rotate(-90 60 60)"
                    />
                    <defs>
                      <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#667eea" />
                        <stop offset="100%" stopColor="#764ba2" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="percentage-display">{progress?.percent || 0}%</div>
                </div>
                <div className="task-stats-breakdown">
                  <div className="stat-row">
                    <span className="stat-value completed">{progress?.completed_tasks || 0}</span>
                    <span className="stat-label">Completed</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-value pending">{(progress?.total_tasks || 0) - (progress?.completed_tasks || 0)}</span>
                    <span className="stat-label">Remaining</span>
                  </div>
                  <div className="stat-row">
                    <span className="stat-value total">{progress?.total_tasks || 0}</span>
                    <span className="stat-label">Total Tasks</span>
                  </div>
                </div>
              </div>
              <p className="progress-summary-text">
                {progress?.completed_tasks || 0} of {progress?.total_tasks || 0} tasks completed
              </p>
              <button onClick={navigateToTasks} className="view-tasks-btn">
                View All Tasks →
              </button>
            </div>
          )}
        </div>

        <div className="dashboard-card supervisor-card">
          <div className="card-icon">👤</div>
          <h2 className="card-title">Supervisor Contact</h2>
          {loadingStates.profile ? (
            <div className="card-loading">Loading...</div>
          ) : (
            <div className="supervisor-content">
              {profile?.supervisor ? (
                <>
                  <div className="supervisor-avatar">
                    {(profile.supervisor.name || 'S')[0].toUpperCase()}
                  </div>
                  <div className="supervisor-details">
                    <h3>{profile.supervisor.name}</h3>
                    <a href={`mailto:${profile.supervisor.email}`} className="email-link">
                      ✉️ {profile.supervisor.email}
                    </a>
                  </div>
                </>
              ) : (
                <p className="no-data">No supervisor assigned</p>
              )}
            </div>
          )}
        </div>

        <div className="dashboard-card evaluations-card">
          <div className="card-icon">📝</div>
          <h2 className="card-title">Recent Evaluations</h2>
          {loadingStates.monitoring ? (
            <div className="card-loading">Loading evaluations...</div>
          ) : (
            <div className="evaluations-content">
              {recentMonitoring && recentMonitoring.length > 0 ? (
                <div className="evaluations-list">
                  {recentMonitoring.map((evaluation) => (
                    <div key={evaluation.id} className="evaluation-item">
                      <div className="evaluation-week">
                        Week {evaluation.week_num}
                      </div>
                      <div className="evaluation-text">
                        {evaluation.tutor_evaluation}
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

        {!isCompleted && (
          <div className="dashboard-card upload-card">
            <div className="card-icon">📄</div>
            <h2 className="card-title">Document Upload</h2>
            <form onSubmit={handleFileUpload} className="upload-form">
              <div className="upload-inputs">
                <div className="document-type-wrapper">
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="document-type-select"
                    required
                  >
                    <option value="">Select document type...</option>
                    {documentTypes.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <div className="file-input-wrapper">
                  <input
                    type="file"
                    id="file-upload"
                    className="file-input"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  />
                  <label htmlFor="file-upload" className="file-label">
                    {uploadFile ? uploadFile.name : 'Choose a file...'}
                  </label>
                </div>
                <button type="submit" className="upload-btn">
                  📤 Upload
                </button>
              </div>
            </form>
            {loadingStates.documents ? (
              <div className="card-loading">Loading documents...</div>
            ) : (
              documents && documents.length > 0 && (
                <div className="recent-documents">
                  <h4>Recently Uploaded:</h4>
                  <ul>
                    {documents.map((doc) => (
                      <li key={doc.id}>
                        <span className="doc-type-badge">{doc.doc_type}</span>
                        <span className="doc-date">{formatDate(doc.upload_date)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternDashboard;