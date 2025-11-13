import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './ActivityChecklistReadOnly.css';
import API_URL from '../Config/api';
import { useParams } from 'react-router-dom';

function ActivityChecklistReadOnly() {
  const { participantId } = useParams();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    console.log(participantId);
    fetch(`${API_URL}/supervisor/checklist/${participantId}`)
      .then(res => res.json())
      .then(data => {
        setTasks(data);
        setLoading(false);
      })
      .catch(err => {
        setLoading(false);
        console.error('Error fetching tasks:', err);
      });
  }, [participantId]);

  const handleGoBack = () => {
    navigate(`/monitoring/${participantId}`);
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
      <div className="checklist-readonly-container">
        <div className="loading-message">Loading tasks...</div>
      </div>
    );
  }

  if (!tasks.length) {
    return (
      <div className="checklist-readonly-container">
        <button onClick={handleGoBack} className="back-to-monitoring-btn">
          ← Back to Monitoring
        </button>
        <div className="empty-message">No tasks assigned to this intern.</div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const stats = getTaskStats();

  return (
    <div className="checklist-readonly-container">
      {/* Back Button */}
      <button onClick={handleGoBack} className="back-to-monitoring-btn">
        ← Back to Monitoring
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
          <ul className="readonly-task-list">
            {filteredTasks.map(task => (
              <li
                key={task.assignment_id}
                className={`task-item-readonly ${
                  task.status === 'Completed'
                    ? 'completed'
                    : task.status === 'In progress' || task.status === 'In Progress'
                    ? 'in-progress'
                    : 'pending'
                }`}
              >
                <div className="task-checkbox-readonly">
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    disabled={true}
                    readOnly
                  />
                  <span className="checkbox-display"></span>
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

export default ActivityChecklistReadOnly;