import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './InternDashboard.css';
import API_URL from '../../Config/api';

const InternDashboard = () => {
  const [internData, setInternData] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingAction, setProcessingAction] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Hardcoded document types
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

  useEffect(() => {
    fetchInternData();
  }, []);

  const fetchInternData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        logout();
        navigate('/login');
        return;
      }

      // Fetch intern profile and data
      const response = await fetch(`${API_URL}/intern/${user.id}/overview`, {
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
          // Intern not enrolled in any program
          setInternData(null);
          setLoading(false);
          return;
        }
        throw new Error('Failed to fetch intern data');
      }

      const data = await response.json();
      console.log(data);
      setInternData(data);

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      } else {
        alert('Failed to download certificate');
      }
    } catch (err) {
      alert('Error downloading certificate');
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };
  
  const handleUnenroll = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to unenroll from this internship?\n\n' +
      '⚠️ WARNING: This action will permanently delete all your data associated with this internship, including:\n' +
      '• Task progress\n' +
      '• Evaluations\n' +
      '• Uploaded documents\n' +
      '• Completion status\n\n' +
      'This action cannot be undone!'
    );

    if (!confirmed) return;

    const doubleConfirm = window.confirm(
      'This is your final confirmation.\n\n' +
      'Type "DELETE" to confirm that you want to permanently delete all your internship data.'
    );

    if (!doubleConfirm) return;

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/intern/unenroll`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('You have been successfully unenrolled from the internship.');
        fetchInternData(); // Refresh to show not-enrolled state
      } else {
        alert('Failed to unenroll from internship');
      }
    } catch (err) {
      alert('Error processing unenrollment');
      console.error(err);
    } finally {
      setProcessingAction(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    
    if (!uploadFile) {
      setUploadStatus('Please select a file to upload');
      return;
    }

    if (!documentType) {
      setUploadStatus('Please select a document type');
      return;
    }

    const formData = new FormData();
    formData.append('documentType', documentType);
    formData.append('document', uploadFile);

    try {
      setUploadStatus('Uploading...');
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

      setUploadStatus('✓ Document uploaded successfully!');
      setUploadFile(null);
      setDocumentType('');
      document.getElementById('file-upload').value = '';
      setTimeout(() => setUploadStatus(''), 3000);
      fetchInternData();
    } catch (err) {
      setUploadStatus('✗ Failed to upload document');
      setTimeout(() => setUploadStatus(''), 3000);
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

  if (loading) return <div className="intern-dashboard">Loading dashboard...</div>;
  if (error) return <div className="intern-dashboard">Error: {error}</div>;

  // Check if intern is not enrolled in any program
  if (!internData.profile.is_enrolled) {
    return (
      <div className="intern-dashboard">
        <div className="dashboard-header">
          <h1>Intern Dashboard</h1>
          <p>Welcome, {internData.profile?.full_name || 'Intern'}</p>
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
          <button onClick={() => navigate('/programs')} className="browse-programs-btn">
            Browse Available Programs
          </button>
        </div>
      </div>
    );
  }

  const { profile, progress, recentMonitoring, recentDocuments } = internData;
  const isCompleted = profile?.tutor_final_approval === true;

  return (
    <div className="intern-dashboard">
      <div className="dashboard-header">
        <h1>Intern Dashboard</h1>
        <p>Welcome, {profile?.full_name || 'Intern'}</p>
        <button onClick={handleLogout} className="logout-btn">
          Log Out
        </button>
      </div>

      {/* Completion Card - Shows only when internship is completed */}
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
                <span className="stat-number">{recentDocuments?.length || 0}</span>
                <span className="stat-label">Documents Uploaded</span>
              </div>
            </div>
            <div className="completion-actions">
              <button 
                onClick={handleDownloadCertificate} 
                className="completion-btn download-cert"
                disabled={processingAction}
              >
                📥 Download Certificate
              </button>
              <button 
                onClick={handleUnenroll} 
                className="completion-btn unenroll"
                disabled={processingAction}
              >
                🚪 Unenroll from Program
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-grid">
        {/* Rest of your existing dashboard cards */}
        {/* Row 1 - Program Info and Progress */}
        <div className="dashboard-card program-info-card">
          <div className="card-icon">📚</div>
          <h2 className="card-title">Internship Program</h2>
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
        </div>

        <div className="dashboard-card progress-card">
          <div className="card-icon">📊</div>
          <h2 className="card-title">Task Progress</h2>
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
        </div>

        {/* Row 2 - Supervisor Contact and Recent Evaluations */}
        <div className="dashboard-card supervisor-card">
          <div className="card-icon">👤</div>
          <h2 className="card-title">Supervisor Contact</h2>
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
        </div>

        <div className="dashboard-card evaluations-card">
          <div className="card-icon">📝</div>
          <h2 className="card-title">Recent Evaluations</h2>
          <div className="evaluations-content">
            {recentMonitoring && recentMonitoring.length > 0 ? (
              <div className="evaluations-list">
                {recentMonitoring.slice(0, 3).map((evaluation) => (
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
        </div>

        {/* Row 3 - Document Upload (full width) - Hide if completed */}
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
              {uploadStatus && (
                <div className={`upload-status ${uploadStatus.includes('✓') ? 'success' : uploadStatus.includes('✗') ? 'error' : ''}`}>
                  {uploadStatus}
                </div>
              )}
            </form>
            {recentDocuments && recentDocuments.length > 0 && (
              <div className="recent-documents">
                <h4>Recently Uploaded:</h4>
                <ul>
                  {recentDocuments.slice(0, 3).map((doc) => (
                    <li key={doc.id}>
                      <span className="doc-type-badge">{doc.doc_type}</span>
                      <span className="doc-date">{formatDate(doc.upload_date)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InternDashboard;