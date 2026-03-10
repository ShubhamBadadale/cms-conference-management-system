import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAllUsers } from '../services/api';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    getAllUsers().then(r => setUsers(r.data)).finally(() => setLoading(false));
  }, []);

  const filtered = filter === 'all' ? users : users.filter(u => u.role === filter);

  return (
    <Layout>
      <div className="page-header"><h1>User Management</h1><p>{users.length} total registered users</p></div>
      <div className="tabs">
        {['all','author','reviewer','admin','coordinator'].map(r => (
          <button key={r} className={`tab-btn${filter === r ? ' active' : ''}`} onClick={() => setFilter(r)}>
            {r.charAt(0).toUpperCase() + r.slice(1)} ({r === 'all' ? users.length : users.filter(u => u.role === r).length})
          </button>
        ))}
      </div>
      {loading ? <div className="spinner" /> : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Role</th><th>Institution</th><th>Joined</th></tr></thead>
              <tbody>
                {filtered.map((u, i) => (
                  <tr key={u.id}>
                    <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                    <td><strong>{u.name}</strong></td>
                    <td>{u.email}</td>
                    <td><span className={`badge badge-${u.role}`}>{u.role}</span></td>
                    <td>{u.institution || '—'}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
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
