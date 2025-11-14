import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import './HrDashboard.css';
import API_URL from '../../Config/api';

const HrDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State for forms
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

  // State for data
  const [internships, setInternships] = useState([]);
  const [allInterns, setAllInterns] = useState([]);
  const [allSupervisors, setAllSupervisors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // New state for tracking pending assignments
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [assigningInterns, setAssigningInterns] = useState(false);

  // Hard-coded training sectors
  const trainingSectors = [
    'IT',
    'Mechatronics'
  ];

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      
      // Fetch internships
      const internshipsResponse = await fetch(`${API_URL}/hr/internships`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (internshipsResponse.ok) {
        const data = await internshipsResponse.json();
        setInternships(data);
      }

      // Fetch all interns for dropdown
      const internsResponse = await fetch(`${API_URL}/getAll/unassignedInterns`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (internsResponse.ok) {
        const data = await internsResponse.json();
        setAllInterns(data);
      }

      // Fetch all supervisors for dropdown
      const supervisorsResponse = await fetch(`${API_URL}/getAll/supervisors`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (supervisorsResponse.ok) {
        const data = await supervisorsResponse.json();
        setAllSupervisors(data);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
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
        alert('Intern created successfully!');
        setInternForm({ full_name: '', email: '', password: '', training_sector: '' });
        fetchDashboardData(); // Refresh data
      } else {
        throw new Error('Failed to create intern');
      }
    } catch (error) {
      alert('Error creating intern: ' + error.message);
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
        alert('Supervisor created successfully!');
        setSupervisorForm({ full_name: '', email: '', password: '' });
        fetchDashboardData(); // Refresh data
      } else {
        throw new Error('Failed to create supervisor');
      }
    } catch (error) {
      alert('Error creating supervisor: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateInternship = async (e) => {
    e.preventDefault();
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
        alert('Internship created successfully!');
        setInternshipForm({
          program_name: '',
          start_date: '',
          end_date: '',
          supervisor_id: ''
        });
        fetchDashboardData(); // Refresh data
      } else {
        throw new Error('Failed to create internship');
      }
    } catch (error) {
      alert('Error creating internship: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Initialize pending assignments when dropdown opens
  const toggleDropdown = (program_id) => {
    if (openDropdown !== program_id) {
      // Opening a new dropdown - initialize pending assignments for this internship
      const internship = internships.find(i => i.id === program_id);
      const currentAssignments = {};
      
      // Mark currently assigned interns
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
      // Closing dropdown
      setOpenDropdown(null);
      setPendingAssignments({});
    }
  };

  // Handle checkbox change (local state only)
  const handleCheckboxChange = (intern_id, isChecked) => {
    setPendingAssignments(prev => ({
      ...prev,
      [intern_id]: isChecked
    }));
  };

  // Submit all assignment changes
  const handleSubmitAssignments = async (program_id) => {
    setAssigningInterns(true);
    
    try {
      const token = localStorage.getItem('token');
      const internship = internships.find(i => i.id === program_id);
      
      // Get currently assigned intern IDs
      const currentlyAssigned = new Set();
      internship?.interns?.forEach(intern => {
        const matchingIntern = allInterns.find(ai => 
          ai.id === intern.id || ai.full_name === intern.full_name
        );
        if (matchingIntern) {
          currentlyAssigned.add(matchingIntern.id);
        }
      });
      
      // Determine which interns to assign and unassign
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
      
      // Execute all assignments
      const assignPromises = toAssign.map(intern_id => 
        console.log('Assigning intern', intern_id, 'to internship', program_id) ||
        fetch(`${API_URL}/hr/assignIntern`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ program_id, intern_id }),
        })
      );
      
      // Execute all unassignments
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
      
      // Wait for all operations to complete
      await Promise.all([...assignPromises, ...unassignPromises]);
      
      alert(`Successfully updated intern assignments!`);
      setOpenDropdown(null);
      setPendingAssignments({});
      fetchDashboardData(); // Refresh data
      
    } catch (error) {
      alert('Error updating intern assignments: ' + error.message);
    } finally {
      setAssigningInterns(false);
    }
  };

  // Cancel assignments and close dropdown
  const handleCancelAssignments = () => {
    setOpenDropdown(null);
    setPendingAssignments({});
  };

  const getInternById = (intern_id) => {
    return allInterns.find(intern => intern.id === intern_id);
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
    const avgCompletion = internships.reduce((sum, prog) => {
      const progAvg = prog.interns?.reduce((s, i) => s + parseFloat(i.completion_percentage || 0), 0) / (prog.interns?.length || 1);
      return sum + (progAvg || 0);
    }, 0) / (totalInternships || 1);

    return {
      totalInternships,
      totalInterns,
      totalSupervisors: allSupervisors.length,
      avgCompletion: Math.round(avgCompletion)
    };
  };

  // Modified click outside handler to prevent closing on button clicks
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
      {/* Header */}
      <div className="dashboard-header">
        <h1>HR Dashboard</h1>
        <p>Welcome, {user?.name || 'HR Manager'}</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Log Out
        </button>
      </div>

      {/* Stats Overview */}
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
            <span className="stat-label">Total Interns</span>
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

      {/* Tab Navigation */}
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

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
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
                          {internship.interns.map((intern, idx) => (
                            <div key={idx} className="intern-item">
                              <span className="intern-name">{intern.full_name}</span>
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
                            </div>
                          ))}
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

        {/* Add Intern Tab */}
        {activeTab === 'addIntern' && (
          <div className="form-section">
            <h2 className="section-title">Add New Intern</h2>
            <form onSubmit={handleCreateIntern} className="hr-form" autoComplete="off">
              {/* Hidden fields to prevent autofill */}
              <input type="text" style={{ display: 'none' }} />
              <input type="password" style={{ display: 'none' }} />
              
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

        {/* Add Supervisor Tab */}
        {activeTab === 'addSupervisor' && (
          <div className="form-section">
            <h2 className="section-title">Add New Supervisor</h2>
            <form onSubmit={handleCreateSupervisor} className="hr-form" autoComplete="off">
              {/* Hidden fields to prevent autofill */}
              <input type="text" style={{ display: 'none' }} />
              <input type="password" style={{ display: 'none' }} />
              
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

        {/* Create Internship Tab */}
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
                    onChange={(e) => setInternshipForm({ ...internshipForm, start_date: e.target.value })}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={internshipForm.end_date}
                    onChange={(e) => setInternshipForm({ ...internshipForm, end_date: e.target.value })}
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