import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './HrDashboard.css';
import API_URL from '../../Config/api';

const HrDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [internForm, setInternForm] = useState({
    full_name: '',
    email: '',
    password: '',
    training_sector: ''
  });

  const [supervisorForm, setSupervisorForm] = useState({
    full_name: '',
    email: '',
    password: ''
  });

  const [internshipForm, setInternshipForm] = useState({
    program_name: '',
    start_date: '',
    end_date: '',
    supervisor_id: ''
  });

  const [internships, setInternships] = useState([]);
  const [allInterns, setAllInterns] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [fullName, setFullName] = useState('');
  
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [assigningInterns, setAssigningInterns] = useState(false);

  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const showStatus = (text, type = 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage({ text: '', type: '' }), 3000);
  };

  const trainingSectors = [
    'IT',
    'Mechatronics'
  ];

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTomorrowDate = (startDate) => {
    if (!startDate) return getTodayDate();
    const date = new Date(startDate);
    date.setDate(date.getDate() + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Separate fetch functions for partial refresh
  const fetchInternships = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/hr/internships`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setInternships(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching internships:', error);
      return false;
    }
  };

  const fetchUnassignedInterns = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/getAll/unassignedInterns`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAllInterns(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching unassigned interns:', error);
      return false;
    }
  };

  const fetchSupervisors = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/getAll/supervisors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAllSupervisors(data);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error fetching supervisors:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch all data in parallel
      const [internshipsResult, fullNameResult, internsResult, supervisorsResult] = await Promise.all([
        fetchInternships(),
        fetch(`${API_URL}/hr/fullName`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        fetchUnassignedInterns(),
        fetchSupervisors()
      ]);
      
      // Handle fullName response
      if (fullNameResult.ok) {
        const data = await fullNameResult.json();
        const name = Array.isArray(data) && data.length > 0 
          ? data[0].full_name 
          : data?.full_name || data?.fullName || data?.name || data;
        if (name) setFullName(name);
      }

      showStatus('✓ Dashboard data loaded successfully', 'success');

    } catch (error) {
      console.error('Error fetching data:', error);
      showStatus('✗ Error loading dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateIntern = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/HR/createIntern`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(internForm),
      });

      if (response.ok) {
        showStatus('✓ Intern created successfully!', 'success');
        setInternForm({ full_name: '', email: '', password: '', training_sector: '' });
        // Only refresh unassigned interns list
        await fetchUnassignedInterns();
      } else {
        throw new Error('Failed to create intern');
      }
    } catch (error) {
      showStatus(`✗ Error creating intern: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSupervisor = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/HR/createSupervisor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(supervisorForm),
      });

      if (response.ok) {
        showStatus('✓ Supervisor created successfully!', 'success');
        setSupervisorForm({ full_name: '', email: '', password: '' });
        // Only refresh supervisors list
        await fetchSupervisors();
      } else {
        throw new Error('Failed to create supervisor');
      }
    } catch (error) {
      showStatus(`✗ Error creating supervisor: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInternship = async (e) => {
    e.preventDefault();
    
    const startDate = new Date(internshipForm.start_date);
    const endDate = new Date(internshipForm.end_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (startDate < today) {
      showStatus('Start date cannot be in the past', 'error');
      return;
    }
    
    if (endDate <= startDate) {
      showStatus('End date must be after the start date', 'error');
      return;
    }
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/hr/createInternship`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(internshipForm),
      });

      if (response.ok) {
        showStatus('✓ Internship created successfully!', 'success');
        setInternshipForm({
          program_name: '',
          start_date: '',
          end_date: '',
          supervisor_id: ''
        });
        // Only refresh internships list
        await fetchInternships();
      } else {
        throw new Error('Failed to create internship');
      }
    } catch (error) {
      showStatus(`✗ Error creating internship: ${error.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartDateChange = (e) => {
    const newStartDate = e.target.value;
    setInternshipForm(prev => {
      const updatedForm = { ...prev, start_date: newStartDate };
      
      if (prev.end_date && new Date(prev.end_date) <= new Date(newStartDate)) {
        updatedForm.end_date = '';
      }
      
      return updatedForm;
    });
  };

  const toggleDropdown = (program_id) => {
    if (openDropdown !== program_id) {
      const internship = internships.find(i => i.id === program_id);
      const currentAssignments = {};
      
      internship?.interns?.forEach(intern => {
        const matchingIntern = allInterns.find(ai => 
          ai.id === intern.id || ai.full_name === intern.full_name
        );
        if (matchingIntern) {
          currentAssignments[matchingIntern.id] = true;
        }
      });
      
      setPendingAssignments(currentAssignments);
      setOpenDropdown(program_id);
    } else {
      setOpenDropdown(null);
      setPendingAssignments({});
    }
  };

  const handleCheckboxChange = (intern_id, isChecked) => {
    setPendingAssignments(prev => ({
      ...prev,
      [intern_id]: isChecked
    }));
  };

  const handleUnassignIntern = async (program_id, intern_id, intern_name) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${intern_name} from this internship program? This action cannot be undone.`
    );
  
    if (!confirmed) return;
  
    try {
      setAssigningInterns(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/hr/unassignIntern`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ intern_id }),
      });

      if (response.ok) {
        showStatus(`✓ ${intern_name} removed from internship`, 'success');
        // Only refresh internships and unassigned interns list
        await Promise.all([
          fetchInternships(),
          fetchUnassignedInterns()
        ]);
      } else {
        throw new Error('Failed to unassign intern');
      }
    } catch (error) {
      showStatus(`✗ Error removing intern: ${error.message}`, 'error');
    } finally {
      setAssigningInterns(false);
    }
  };

  const getInternId = (intern) => {
    // If the intern already has an ID, use it
    if (intern.id) return intern.id;
  
    // Otherwise, find the intern in allInterns by name
    const matchingIntern = allInterns.find(ai => 
      ai.full_name === intern.full_name
    );
    return matchingIntern?.id || intern.intern_id || null;
  };

  const handleSubmitAssignments = async (program_id) => {
    setAssigningInterns(true);
    
    try {
      const token = localStorage.getItem('token');
      const internship = internships.find(i => i.id === program_id);
      
      const currentlyAssigned = new Set();
      internship?.interns?.forEach(intern => {
        const matchingIntern = allInterns.find(ai => 
          ai.id === intern.id || ai.full_name === intern.full_name
        );
        if (matchingIntern) {
          currentlyAssigned.add(matchingIntern.id);
        }
      });
      
      const toAssign = [];
      const toUnassign = [];
      
      allInterns.forEach(intern => {
        const shouldBeAssigned = pendingAssignments[intern.id] || false;
        const isCurrentlyAssigned = currentlyAssigned.has(intern.id);
        
        if (shouldBeAssigned && !isCurrentlyAssigned) {
          toAssign.push(intern.id);
        } else if (!shouldBeAssigned && isCurrentlyAssigned) {
          toUnassign.push(intern.id);
        }
      });
      
      const assignPromises = toAssign.map(intern_id => 
        fetch(`${API_URL}/hr/assignIntern`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ program_id, intern_id }),
        })
      );
      
      const unassignPromises = toUnassign.map(intern_id => 
        fetch(`${API_URL}/hr/unassignIntern`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ program_id, intern_id }),
        })
      );
      
      await Promise.all([...assignPromises, ...unassignPromises]);
      
      showStatus('✓ Successfully updated intern assignments!', 'success');
      setOpenDropdown(null);
      setPendingAssignments({});
      
      // Only refresh internships and unassigned interns list
      await Promise.all([
        fetchInternships(),
        fetchUnassignedInterns()
      ]);
      
    } catch (error) {
      showStatus(`✗ Error updating intern assignments: ${error.message}`, 'error');
    } finally {
      setAssigningInterns(false);
    }
  };

  const handleCancelAssignments = () => {
    setOpenDropdown(null);
    setPendingAssignments({});
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStats = () => {
    const totalInternships = internships.length;
    const totalInterns = internships.reduce((sum, prog) => sum + (prog.interns?.length || 0), 0);
  
    // Only count assigned interns (those with a valid completion percentage)
    let totalAssignedInterns = 0;
    let totalCompletionSum = 0;
  
    internships.forEach(prog => {
      prog.interns?.forEach(intern => {
        // Only count interns who are actually assigned (have a non-null completion percentage)
        if (intern.completion_percentage !== null && intern.completion_percentage !== undefined) {
          totalAssignedInterns++;
          totalCompletionSum += parseFloat(intern.completion_percentage || 0);
        }
      });
    });
  
    const avgCompletion = totalAssignedInterns > 0 
      ? Math.round(totalCompletionSum / totalAssignedInterns)
      : 0;

    return {
      totalInternships,
      totalInterns,
      totalSupervisors: allSupervisors.length,
      avgCompletion
    };
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.assign-dropdown-container')) {
        if (openDropdown !== null && !assigningInterns) {
          handleCancelAssignments();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [openDropdown, assigningInterns]);

  if (loading) {
    return (
      <div className="hr-dashboard">
        <div className="loading-container">Loading dashboard...</div>
      </div>
    );
  }

  const stats = getStats();

  return (
    <div className="hr-dashboard">
      {statusMessage.text && (
        <div className={`status-notification ${statusMessage.type}`}>
          {statusMessage.text}
        </div>
      )}

      <div className="dashboard-header">
        <h1>HR Dashboard</h1>
        <p>Welcome, {fullName || user?.fullName || 'HR Manager'}</p>
        <button onClick={handleLogout} className="logout-btn">
          Log Out
        </button>
      </div>

      <div className="stats-overview">
        <div className="stat-card">
          <div className="stat-icon">🎓</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalInternships}</span>
            <span className="stat-label">Internship Programs</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalInterns}</span>
            <span className="stat-label">Assigned Interns</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👔</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalSupervisors}</span>
            <span className="stat-label">Supervisors</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-value">{stats.avgCompletion}%</span>
            <span className="stat-label">Avg. Completion</span>
          </div>
        </div>
      </div>

      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          📋 Internship Overview
        </button>
        <button
          className={`tab-btn ${activeTab === 'addIntern' ? 'active' : ''}`}
          onClick={() => setActiveTab('addIntern')}
        >
          ➕ Add Intern
        </button>
        <button
          className={`tab-btn ${activeTab === 'addSupervisor' ? 'active' : ''}`}
          onClick={() => setActiveTab('addSupervisor')}
        >
          ➕ Add Supervisor
        </button>
        <button
          className={`tab-btn ${activeTab === 'createInternship' ? 'active' : ''}`}
          onClick={() => setActiveTab('createInternship')}
        >
          🚀 Create Internship
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="internships-overview">
            <h2 className="section-title">Internship Programs</h2>
            {internships.length === 0 ? (
              <div className="empty-state">
                <p>No internship programs created yet.</p>
              </div>
            ) : (
              <div className="internships-grid">
                {internships.map((internship) => (
                  <div key={internship.id} className="internship-card">
                    <div className="internship-header">
                      <div className="header-top">
                        <h3>{internship.program_name}</h3>
                        <div className="assign-dropdown-container">
                          <button
                            className="assign-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDropdown(internship.id);
                            }}
                          >
                            ➕ Assign Interns
                          </button>
                          {openDropdown === internship.id && (
                            <div className="assign-dropdown">
                              <div className="dropdown-header">Select Interns to Assign</div>
                              <div className="dropdown-content">
                                {allInterns.length === 0 ? (
                                  <div className="dropdown-empty">No interns available</div>
                                ) : (
                                  allInterns.map((intern) => (
                                    <label key={intern.id} className="dropdown-item">
                                      <input
                                        type="checkbox"
                                        checked={pendingAssignments[intern.id] || false}
                                        onChange={(e) => handleCheckboxChange(intern.id, e.target.checked)}
                                      />
                                      <span className="intern-info">
                                        <span className="intern-name">{intern.full_name}</span>
                                        <span className="intern-sector">{intern.training_sector}</span>
                                      </span>
                                    </label>
                                  ))
                                )}
                              </div>
                              <div className="dropdown-actions">
                                <button
                                  className="cancel-assignments-btn"
                                  onClick={handleCancelAssignments}
                                  disabled={assigningInterns}
                                >
                                  Cancel
                                </button>
                                <button
                                  className="submit-assignments-btn"
                                  onClick={() => handleSubmitAssignments(internship.id)}
                                  disabled={assigningInterns || allInterns.length === 0}
                                >
                                  {assigningInterns ? 'Assigning...' : 'Apply Changes'}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <span className="internship-dates">
                        {formatDate(internship.start_date)} - {formatDate(internship.end_date)}
                      </span>
                    </div>
                    
                    <div className="internship-supervisor">
                      <span className="supervisor-label">Supervisor:</span>
                      <span className="supervisor-name">{internship.full_name || 'Not assigned'}</span>
                    </div>

                    <div className="interns-section">
                      <h4>Assigned Interns ({internship.interns?.length || 0})</h4>
                      {internship.interns && internship.interns.length > 0 ? (
                        <div className="interns-list">
                          {internship.interns.map((intern, idx) => {
                            const internId = getInternId(intern);
                            return (
                              <div key={idx} className="intern-item">
                                <span className="intern-name">{intern.full_name}</span>
                                <div className="intern-actions">
                                  <div className="completion-badge">
                                    <div className="mini-progress-ring">
                                      <svg width="30" height="30">
                                        <circle
                                          cx="15"
                                          cy="15"
                                          r="12"
                                          stroke="#e5e7eb"
                                          strokeWidth="2"
                                          fill="none"
                                        />
                                        <circle
                                          cx="15"
                                          cy="15"
                                          r="12"
                                          stroke="url(#mini-gradient)"
                                          strokeWidth="2"
                                          fill="none"
                                          strokeDasharray={`${75.4 * (parseFloat(intern.completion_percentage) / 100)} 75.4`}
                                          transform="rotate(-90 15 15)"
                                        />
                                        <defs>
                                          <linearGradient id="mini-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                            <stop offset="0%" stopColor="#667eea" />
                                            <stop offset="100%" stopColor="#764ba2" />
                                          </linearGradient>
                                        </defs>
                                      </svg>
                                      <span className="completion-text">{intern.completion_percentage}%</span>
                                    </div>
                                  </div>
                                  <button
                                    className="unassign-btn"
                                    onClick={() => handleUnassignIntern(internship.id, internId, intern.full_name)}
                                    disabled={assigningInterns || !internId}
                                    title={`Remove ${intern.full_name}`}
                                    aria-label={`Remove ${intern.full_name} from internship`}
                                  >
                                    ✕
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="no-interns">No interns assigned</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'addIntern' && (
          <div className="form-section">
            <h2 className="section-title">Add New Intern</h2>
            <form onSubmit={handleCreateIntern} className="hr-form" autoComplete="off">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="intern-fullname"
                  id="intern-fullname"
                  value={internForm.full_name}
                  onChange={(e) => setInternForm({ ...internForm, full_name: e.target.value })}
                  placeholder="Enter intern's full name"
                  autoComplete="off"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="intern-email-new"
                  id="intern-email-new"
                  value={internForm.email}
                  onChange={(e) => setInternForm({ ...internForm, email: e.target.value })}
                  placeholder="Enter email address"
                  autoComplete="new-email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="intern-password-new"
                  id="intern-password-new"
                  value={internForm.password}
                  onChange={(e) => setInternForm({ ...internForm, password: e.target.value })}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Training Sector</label>
                <select
                  name="intern-sector"
                  id="intern-sector"
                  value={internForm.training_sector}
                  onChange={(e) => setInternForm({ ...internForm, training_sector: e.target.value })}
                  autoComplete="off"
                  required
                >
                  <option value="">Select a sector</option>
                  {trainingSectors.map((sector) => (
                    <option key={sector} value={sector}>{sector}</option>
                  ))}
                </select>
              </div>
              
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Intern'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'addSupervisor' && (
          <div className="form-section">
            <h2 className="section-title">Add New Supervisor</h2>
            <form onSubmit={handleCreateSupervisor} className="hr-form" autoComplete="off">
              <div className="form-group">
                <label>Full Name</label>
                <input
                  type="text"
                  name="supervisor-fullname"
                  id="supervisor-fullname"
                  value={supervisorForm.full_name}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, full_name: e.target.value })}
                  placeholder="Enter supervisor's full name"
                  autoComplete="off"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Email</label>
                <input
                  type="email"
                  name="supervisor-email-new"
                  id="supervisor-email-new"
                  value={supervisorForm.email}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, email: e.target.value })}
                  placeholder="Enter email address"
                  autoComplete="new-email"
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password</label>
                <input
                  type="password"
                  name="supervisor-password-new"
                  id="supervisor-password-new"
                  value={supervisorForm.password}
                  onChange={(e) => setSupervisorForm({ ...supervisorForm, password: e.target.value })}
                  placeholder="Enter password"
                  autoComplete="new-password"
                  required
                />
              </div>
              
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Supervisor'}
              </button>
            </form>
          </div>
        )}

        {activeTab === 'createInternship' && (
          <div className="form-section">
            <h2 className="section-title">Create New Internship Program</h2>
            <form onSubmit={handleCreateInternship} className="hr-form">
              <div className="form-group">
                <label>Program Name</label>
                <input
                  type="text"
                  value={internshipForm.program_name}
                  onChange={(e) => setInternshipForm({ ...internshipForm, program_name: e.target.value })}
                  placeholder="e.g., Summer Internship 2024"
                  required
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={internshipForm.start_date}
                    onChange={handleStartDateChange}
                    min={getTodayDate()}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={internshipForm.end_date}
                    onChange={(e) => setInternshipForm({ ...internshipForm, end_date: e.target.value })}
                    min={internshipForm.start_date ? getTomorrowDate(internshipForm.start_date) : getTodayDate()}
                    disabled={!internshipForm.start_date}
                    required
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label>Assign Supervisor</label>
                <select
                  value={internshipForm.supervisor_id}
                  onChange={(e) => setInternshipForm({ ...internshipForm, supervisor_id: e.target.value })}
                  required
                >
                  <option value="">Select a supervisor</option>
                  {allSupervisors.map((supervisor) => (
                    <option key={supervisor.id} value={supervisor.id}>
                      {supervisor.full_name} - {supervisor.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <button type="submit" className="submit-btn" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Internship'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default HrDashboard;