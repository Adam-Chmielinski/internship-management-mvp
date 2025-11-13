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
    const fetchTasks = async () => {
      try {
        const response = await fetch(`${API_URL}/checklist/${participantId || user?.id}`);
        const data = await response.json();
        
        console.log('Raw tasks response:', data);
        
        // Ensure tasks is always an array
        let tasksArray = [];
        
        // Handle different response formats
        if (Array.isArray(data)) {
          tasksArray = data;
        } else if (data && typeof data === 'object') {
          // Check for common response patterns
          if (data.tasks && Array.isArray(data.tasks)) {
            tasksArray = data.tasks;
          } else if (data.data && Array.isArray(data.data)) {
            tasksArray = data.data;
          } else if (data.checklist && Array.isArray(data.checklist)) {
            tasksArray = data.checklist;
          } else {
            // If it's an object with numbered keys, convert to array
            tasksArray = Object.values(data).filter(item => 
              item && typeof item === 'object' && 'assignment_id' in item
            );
          }
        }
        
        console.log('Processed tasks array:', tasksArray);
        setTasks(tasksArray);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching tasks:', err);
        setTasks([]); // Set to empty array on error
        setLoading(false);
        alert('Error fetching tasks');
      }
    };

    fetchTasks();
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
        // Ensure tasks is an array before mapping
        setTasks(currentTasks => {
          if (!Array.isArray(currentTasks)) return [];
          return currentTasks.map(task =>
            task.assignment_id === taskId ? { ...task, status: newStatus } : task
          );
        });
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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getFilteredTasks = () => {
    // Ensure tasks is an array before filtering
    if (!Array.isArray(tasks)) return [];
    
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
    // Ensure tasks is an array before filtering
    if (!Array.isArray(tasks)) {
      return { completed: 0, inProgress: 0, pending: 0, total: 0 };
    }
    
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const inProgress = tasks.filter(t => t.status === 'In Progress' || t.status === 'In progress').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    return { completed, inProgress, pending, total: tasks.length };
  };

  if (loading) {
    return (
      <div className="tasks-page">
        <div className="loading-container">Loading tasks...</div>
      </div>
    );
  }

  const filteredTasks = getFilteredTasks();
  const stats = getTaskStats();

  return (
    <div className="tasks-page">
      {/* Header */}
      <div className="tasks-header">
        <button onClick={handleGoBack} className="back-btn">
          ← Back to Dashboard
        </button>
        <h1>My Tasks</h1>
        <p>Manage and track your internship assignments</p>
        <button onClick={handleLogout} className="logout-btn">
          🚪 Log Out
        </button>
      </div>

      {/* Stats Overview */}
      <div className="tasks-stats">
        <div className="stat-card">
          <span className="stat-number completed">{stats.completed}</span>
          <span className="stat-label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-number in-progress">{stats.inProgress}</span>
          <span className="stat-label">In Progress</span>
        </div>
        <div className="stat-card">
          <span className="stat-number pending">{stats.pending}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="stat-card">
          <span className="stat-number total">{stats.total}</span>
          <span className="stat-label">Total Tasks</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button 
          className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Tasks ({stats.total})
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
      <div className="tasks-container">
        {!Array.isArray(filteredTasks) || filteredTasks.length === 0 ? (
          <div className="no-tasks">
            <p>No tasks found in this category.</p>
          </div>
        ) : (
          <ul className="tasks-list">
            {filteredTasks.map(task => (
              <li
                key={task.assignment_id}
                className={`task-item ${
                  task.status === 'Completed'
                    ? 'completed'
                    : task.status === 'In progress' || task.status === 'In Progress'
                    ? 'in-progress'
                    : 'pending'
                }`}
              >
                <label className="task-checkbox-label">
                  <input
                    type="checkbox"
                    checked={task.status === 'Completed'}
                    disabled={updating === task.assignment_id}
                    onChange={() =>
                      handleStatusChange(
                        task.assignment_id,
                        task.status === 'Pending' ? 'In Progress' : 'Completed'
                      )
                    }
                  />
                  <span className="custom-checkbox"></span>
                </label>
                <div className="task-content">
                  <span className="task-description">{task.function_description}</span>
                  <span
                    className={`task-status ${
                      task.status === 'Completed'
                        ? 'status-completed'
                        : task.status === 'In Progress' || task.status === 'In progress'
                        ? 'status-inprogress'
                        : 'status-pending'
                    }`}
                  >
                    {task.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default ActivityChecklist;