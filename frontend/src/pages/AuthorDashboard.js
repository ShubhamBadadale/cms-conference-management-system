import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getMySubmissions, getMyCertificates, getMyNotifications } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function AuthorDashboard() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getMySubmissions(), getMyCertificates(), getMyNotifications()])
      .then(([s, c, n]) => { setSubmissions(s.data); setCertificates(c.data); setNotifs(n.data.filter(n => n.status === 'unread')); })
      .finally(() => setLoading(false));
  }, []);

  const statusCount = (s) => submissions.filter(p => p.status === s).length;

  return (
    <Layout>
      <div className="page-header">
        <h1>Welcome, {user?.name}!</h1>
        <p>Your author workspace — track submissions and reviews</p>
      </div>
      {loading ? <div className="spinner" /> : (
        <>
          <div className="stats-grid">
            <div className="stat-card"><div className="stat-number">{submissions.length}</div><div className="stat-label">Total Submissions</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: '#2d7d46' }}>{statusCount('accepted')}</div><div className="stat-label">Accepted</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: '#975a16' }}>{statusCount('under_review')}</div><div className="stat-label">Under Review</div></div>
            <div className="stat-card"><div className="stat-number" style={{ color: '#c53030' }}>{statusCount('rejected')}</div><div className="stat-label">Rejected</div></div>
            <div className="stat-card"><div className="stat-number">{certificates.length}</div><div className="stat-label">Certificates</div></div>
          </div>
          {notifs.length > 0 && (
            <div className="card" style={{ border: '1.5px solid #90cdf4', background: '#ebf8ff' }}>
              <h3 style={{ marginBottom: 12 }}>🔔 Unread Notifications</h3>
              {notifs.slice(0, 3).map(n => (
                <div className="notif-item unread" key={n.id}>{n.message}</div>
              ))}
              {notifs.length > 3 && <Link to="/notifications" style={{ fontSize: 13 }}>View all {notifs.length} notifications →</Link>}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <div className="card-header"><h3>Recent Submissions</h3><Link to="/my-submissions" className="btn btn-outline btn-sm">View All</Link></div>
              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24 }}>
                  <p style={{ color: '#718096', marginBottom: 12 }}>No papers submitted yet</p>
                  <Link to="/submit" className="btn btn-accent">Submit Your First Paper</Link>
                </div>
              ) : submissions.slice(0, 4).map(p => (
                <div key={p.id} style={{ padding: '10px 0', borderBottom: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{p.title}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                    <span style={{ fontSize: 12, color: '#718096' }}>{p.conference_title}</span>
                    <span className={`badge badge-${p.status}`}>{p.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="card">
              <div className="card-header"><h3>Quick Actions</h3></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Link to="/conferences" className="btn btn-outline">🎓 Browse Conferences</Link>
                <Link to="/submit" className="btn btn-primary">📄 Submit New Paper</Link>
                <Link to="/my-submissions" className="btn btn-outline">📋 My Submissions</Link>
                <Link to="/certificates" className="btn btn-outline">🏆 Download Certificates</Link>
              </div>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
