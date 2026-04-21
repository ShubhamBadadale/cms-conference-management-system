import React, { useEffect, useMemo, useState } from 'react';
import Layout from '../components/Layout';
import { getAllUsers, updateUserActiveState, updateUserRole } from '../services/api';

const filters = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'archived', label: 'Archived' },
  { value: 'author', label: 'Authors' },
  { value: 'reviewer', label: 'Reviewers' },
  { value: 'coordinator', label: 'Coordinators' },
  { value: 'admin', label: 'Admins' },
];

const getFilterCount = (users, filter) => {
  if (filter === 'all') {
    return users.length;
  }

  if (filter === 'archived') {
    return users.filter((user) => !user.is_active).length;
  }

  return users.filter((user) => user.role === filter && user.is_active).length;
};

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [messages, setMessages] = useState({});
  const [busyUserId, setBusyUserId] = useState(null);

  const load = async () => {
    const response = await getAllUsers();
    setUsers(response.data || []);
  };

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (filter === 'all') {
      return users;
    }

    if (filter === 'archived') {
      return users.filter((user) => !user.is_active);
    }

    return users.filter((user) => user.role === filter && user.is_active);
  }, [filter, users]);

  const setUserMessage = (userId, type, text) => {
    setMessages((current) => ({ ...current, [userId]: { type, text } }));
  };

  const handleApprove = async (userId, role) => {
    setBusyUserId(userId);

    try {
      await updateUserRole(userId, role);
      setUserMessage(userId, 'success', `User approved as ${role}.`);
      await load();
    } catch (err) {
      setUserMessage(userId, 'error', err.response?.data?.message || 'Failed to approve user');
    } finally {
      setBusyUserId(null);
    }
  };

  const handleActiveToggle = async (user) => {
    setBusyUserId(user.id);

    try {
      await updateUserActiveState(user.id, !user.is_active);
      setUserMessage(
        user.id,
        'success',
        `User ${user.is_active ? 'archived' : 'reactivated'} successfully.`
      );
      await load();
    } catch (err) {
      setUserMessage(user.id, 'error', err.response?.data?.message || 'Failed to update user state');
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Manage Users</h1>
        <p>Approve new accounts, archive inactive users, and keep role assignments tidy.</p>
      </div>

      <div className="tabs">
        {filters.map((tab) => (
          <button
            key={tab.value}
            className={`tab-btn${filter === tab.value ? ' active' : ''}`}
            onClick={() => setFilter(tab.value)}
          >
            {tab.label} ({getFilterCount(users, tab.value)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner" />
      ) : filteredUsers.length === 0 ? (
        <div className="alert alert-info">No users match the selected filter.</div>
      ) : (
        filteredUsers.map((user) => (
          <div className={`card ${user.is_active ? '' : 'card-archived'}`} key={user.id}>
            <div className="admin-paper-header">
              <div style={{ flex: 1, minWidth: 260 }}>
                <h3 style={{ fontSize: 17 }}>{user.name}</h3>
                <div className="muted-copy" style={{ marginTop: 4 }}>
                  {user.email}
                </div>
                <div className="muted-copy" style={{ marginTop: 6 }}>
                  {user.institution || 'No institution listed'}
                </div>
                <div className="muted-copy" style={{ marginTop: 6 }}>
                  Joined {new Date(user.created_at).toLocaleString()}
                </div>
              </div>

              <div className="stacked-actions">
                <div className="inline-actions">
                  <span className={`badge badge-${user.role}`}>{user.role}</span>
                  <span className={`badge ${user.is_active ? 'badge-active' : 'badge-archived'}`}>
                    {user.is_active ? 'Active' : 'Archived'}
                  </span>
                </div>
                <button className="btn btn-outline btn-sm" disabled={busyUserId === user.id} onClick={() => handleActiveToggle(user)}>
                  {user.is_active ? 'Archive' : 'Reactivate'}
                </button>
              </div>
            </div>

            {messages[user.id] && (
              <div className={`alert alert-${messages[user.id].type === 'success' ? 'success' : 'error'}`} style={{ marginTop: 14 }}>
                {messages[user.id].text}
              </div>
            )}

            {user.role === 'pending' && user.is_active && (
              <div className="admin-paper-toolbar">
                <div className="inline-actions">
                  <strong className="table-note">Approve As</strong>
                  <button className="btn btn-primary btn-sm" disabled={busyUserId === user.id} onClick={() => handleApprove(user.id, 'author')}>
                    Author
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busyUserId === user.id} onClick={() => handleApprove(user.id, 'reviewer')}>
                    Reviewer
                  </button>
                  <button className="btn btn-primary btn-sm" disabled={busyUserId === user.id} onClick={() => handleApprove(user.id, 'coordinator')}>
                    Coordinator
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
