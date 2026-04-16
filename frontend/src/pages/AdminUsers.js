import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAllUsers, updateUserRole } from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [roleSelections, setRoleSelections] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await getAllUsers();
        setUsers(response.data);
      } catch (err) {
        setFeedback({
          type: 'error',
          message: err.response?.data?.message || 'Unable to load users'
        });
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, []);

  const filtered = filter === 'all' ? users : users.filter((user) => user.role === filter);
  const pendingCount = users.filter((user) => user.role === 'pending').length;

  const handleApprove = async (userId) => {
    const role = roleSelections[userId] || 'author';
    setSavingId(userId);
    setFeedback({ type: '', message: '' });

    try {
      await updateUserRole(userId, role);
      setUsers((current) => current.map((user) => (
        user.id === userId ? { ...user, role } : user
      )));
      setFeedback({ type: 'success', message: `User approved as ${role}.` });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.message || 'Unable to approve user'
      });
    } finally {
      setSavingId(null);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>User Management</h1>
        <p>{users.length} total registered users, including {pendingCount} pending approvals</p>
      </div>
      {feedback.message && (
        <div className={`alert alert-${feedback.type === 'error' ? 'error' : 'success'}`}>
          {feedback.message}
        </div>
      )}
      <div className="tabs">
        {['all', 'pending', 'author', 'reviewer', 'admin', 'coordinator'].map((role) => (
          <button key={role} className={`tab-btn${filter === role ? ' active' : ''}`} onClick={() => setFilter(role)}>
            {role.charAt(0).toUpperCase() + role.slice(1)} ({role === 'all' ? users.length : users.filter((user) => user.role === role).length})
          </button>
        ))}
      </div>
      {loading ? <div className="spinner" /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Institution</th>
                  <th>Joined</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user, index) => (
                  <tr key={user.id}>
                    <td style={{ color: '#a0aec0' }}>{index + 1}</td>
                    <td><strong>{user.name}</strong></td>
                    <td>{user.email}</td>
                    <td><span className={`badge badge-${user.role}`}>{user.role}</span></td>
                    <td>{user.institution || '-'}</td>
                    <td>{new Date(user.created_at).toLocaleDateString()}</td>
                    <td>
                      {user.role === 'pending' ? (
                        <div className="user-role-action">
                          <select
                            className="form-control"
                            value={roleSelections[user.id] || 'author'}
                            onChange={(e) => setRoleSelections((current) => ({ ...current, [user.id]: e.target.value }))}
                            disabled={savingId === user.id}
                          >
                            <option value="author">Author</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="coordinator">Coordinator</option>
                          </select>
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleApprove(user.id)}
                            disabled={savingId === user.id}
                          >
                            {savingId === user.id ? 'Saving...' : 'Approve'}
                          </button>
                        </div>
                      ) : (
                        <span className="table-note">Approved</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
