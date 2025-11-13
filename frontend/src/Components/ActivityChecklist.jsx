import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './ActivityChecklist.css';
import API_URL from '../Config/api';

function ActivityChecklist({ participantId }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [filter, setFilter] = useState('all');
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Use the same approach as supervisor view
    const internId = participantId || user?.id;
    console.log('Fetching tasks for intern ID:', internId);
    
    fetch(`${API_URL}/supervisor/checklist/${internId}`)
      .then(res => res.json())
      .then(data => {
        console.log('Tasks data received:', data);
        setTasks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching tasks:', err);
        setTasks([]); // Set to empty array on error
        setLoading(false);
      });
  }, [user?.id, participantId]);

  const handleStatusChange = (taskId, newStatus) => {
    setUpdating(taskId);
    
    fetch(`${API_URL}/checklist/update/${taskId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId, status: newStatus }),
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to update');
        // Update the task in the state
        setTasks(currentTasks => 
          currentTasks.map(task =>
            task.assignment_id === taskId ? { ...task, status: newStatus } : task
          )
        );
        if (newStatus === 'Completed') {
          setTimeout(() => {
            alert('Task marked as completed!');
          }, 100);
        }
      })
      .catch(() => alert('Failed to update status'))
      .finally(() => setUpdating(null));
  };

  const handleGoBack = () => {
    navigate('/InternDashboard');
  };

  const getFilteredTasks = () => {
    switch(filter) {
      case 'completed':
        return tasks.filter(task => task.status === 'Completed');
      case 'in-progress':
        return tasks.filter(task => task.status === 'In Progress' || task.status === 'In progress');
      case 'pending':
        return tasks.filter(task => task.status === 'Pending');
      default:
        return tasks;
    }
  };

  const getTaskStats = () => {
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress' || t.status === 'In progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const completionRate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
    return { completed, inProgress, pending, total: tasks.length, completionRate };
  };

  if (loading) {
    return (
      <div className="checklist-container">
        <div className="loading-message">Loading tasks...</div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="checklist-container">
        <div className="empty-message">No tasks assigned yet.</div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const stats = getTaskStats();

  return (
    <div className="checklist-container">
      {/* Back Button */}
      <button onClick={handleGoBack} className="back-to-dashboard-btn">
        ← Back to Dashboard
      </button>

      {/* Task Stats Overview */}
      <div className="task-stats-grid">
        <div className="task-stat-card">
          <span className="stat-icon">📋</span>
          <div className="stat-details">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Tasks</span>
          </div>
        </div>
        <div className="task-stat-card">
          <span className="stat-icon">✅</span>
          <div className="stat-details">
            <span className="stat-number completed">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
        </div>
        <div className="task-stat-card">
          <span className="stat-icon">⏳</span>
          <div className="stat-details">
            <span className="stat-number in-progress">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
        <div className="task-stat-card">
          <span className="stat-icon">📊</span>
          <div className="stat-details">
            <span className="stat-number rate">{stats.completionRate}%</span>
            <span className="stat-label">Completion</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="overall-progress">
        <div className="progress-header">
          <h3>Overall Progress</h3>
          <span className="progress-text">
            {stats.completed} of {stats.total} tasks completed
          </span>
        </div>
        <div className="progress-bar-wrapper">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${stats.completionRate}%` }}
            >
              <span className="progress-label">{stats.completionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="task-filters">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All ({stats.total})
        </button>
        <button 
          className={`filter-tab ${filter === 'pending' ? 'active' : ''}`}
          onClick={() => setFilter('pending')}
        >
          Pending ({stats.pending})
        </button>
        <button 
          className={`filter-tab ${filter === 'in-progress' ? 'active' : ''}`}
          onClick={() => setFilter('in-progress')}
        >
          In Progress ({stats.inProgress})
        </button>
        <button 
          className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
          onClick={() => setFilter('completed')}
        >
          Completed ({stats.completed})
        </button>
      </div>

      {/* Tasks List */}
      <div className="tasks-list-container">
        <h3 className="list-title">Task Details</h3>
        {filteredTasks.length === 0 ? (
          <div className="no-tasks-message">No tasks in this category.</div>
        ) : (
          <ul className="task-list">
            {filteredTasks.map(task => (
              <li
                key={task.assignment_id}
                className={`task-item-styled ${
                  task.status === 'Completed'
                    ? 'completed'
                    : task.status === 'In progress' || task.status === 'In Progress'
                    ? 'in-progress'
                    : 'pending'
                }`}
              >
                <div className="task-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id={`task-${task.assignment_id}`}
                    checked={task.status === 'Completed'}
                    disabled={updating === task.assignment_id}
                    onChange={() =>
                      handleStatusChange(
                        task.assignment_id,
                        task.status === 'Pending' ? 'In Progress' : 'Completed'
                      )
                    }
                  />
                  <label htmlFor={`task-${task.assignment_id}`} className="checkbox-display"></label>
                </div>
                <span className="task-description">{task.function_description}</span>
                <span className={`task-status-badge ${task.status.toLowerCase().replace(' ', '-')}`}>
                  {task.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ActivityChecklist;