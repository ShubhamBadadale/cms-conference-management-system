import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  getDashboardStats,
  getEmailQueueOverview,
  getMyNotifications,
  getNoSqlAnalytics,
} from '../services/api';

const emptyNoSqlAnalytics = {
  connected: false,
  source: 'loading',
  collection: 'conferenceAnalytics',
  items: [],
};

const emptyEmailQueue = {
  summary: {
    pending: 0,
    processing: 0,
    sent: 0,
    failed: 0,
  },
  items: [],
};

const StatCard = ({ label, value, color }) => (
  <div className="stat-card">
    <div className="stat-number" style={color ? { color } : undefined}>
      {value ?? 0}
    </div>
    <div className="stat-label">{label}</div>
  </div>
);

const formatQueueDecision = (decision) => (
  decision ? decision.replace(/_/g, ' ') : 'N/A'
);

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [noSqlAnalytics, setNoSqlAnalytics] = useState(emptyNoSqlAnalytics);
  const [emailQueue, setEmailQueue] = useState(emptyEmailQueue);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadDashboard = async () => {
      setError('');

      try {
        const [
          statsResponse,
          notificationsResponse,
          emailQueueResponse,
        ] = await Promise.all([
          getDashboardStats(),
          getMyNotifications(),
          getEmailQueueOverview(),
        ]);

        setStats(statsResponse.data);
        setNotifs((notificationsResponse.data || []).slice(0, 5));
        setEmailQueue(emailQueueResponse.data || emptyEmailQueue);
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load dashboard');
      }

      try {
        const analyticsResponse = await getNoSqlAnalytics();
        setNoSqlAnalytics(analyticsResponse.data || emptyNoSqlAnalytics);
      } catch (err) {
        setNoSqlAnalytics({
          ...emptyNoSqlAnalytics,
          source: 'unavailable',
          message: err.response?.data?.message || 'NoSQL analytics unavailable',
        });
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage the complete conference lifecycle</p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {error && <div className="alert alert-error">{error}</div>}

          <div className="stats-grid">
            <StatCard label="Total Papers" value={stats?.total_papers} />
            <StatCard label="Total Users" value={stats?.total_users} />
            <StatCard label="Conferences" value={stats?.total_conferences} />
            <StatCard label="Accepted" value={stats?.accepted} color="#2d7d46" />
            <StatCard label="Rejected" value={stats?.rejected} color="#c53030" />
            <StatCard label="Under Review" value={stats?.under_review} color="#975a16" />
            <StatCard label="Flagged" value={stats?.flagged_for_review} color="#2c5282" />
          </div>

          <div className="email-queue-summary-grid">
            <StatCard label="Email Pending" value={emailQueue.summary?.pending} color="#975a16" />
            <StatCard label="Email Processing" value={emailQueue.summary?.processing} color="#2c5282" />
            <StatCard label="Email Sent" value={emailQueue.summary?.sent} color="#2d7d46" />
            <StatCard label="Email Failed" value={emailQueue.summary?.failed} color="#c53030" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <Link to="/admin/conferences" className="btn btn-primary">Conferences</Link>
                <Link to="/admin/submissions" className="btn btn-primary">Submissions</Link>
                <Link to="/admin/users" className="btn btn-outline">Manage Users</Link>
                <Link to="/admin/accepted" className="btn btn-success">Accepted Papers</Link>
                <Link to="/admin/notify" className="btn btn-accent">Send Notification</Link>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Recent Notifications</h3>
              {notifs.length === 0 ? (
                <p style={{ color: '#718096', fontSize: 14 }}>No notifications yet</p>
              ) : (
                notifs.map((notification) => (
                  <div className="notif-item" key={notification.id}>{notification.message}</div>
                ))
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3>Email Queue Visibility</h3>
                <p style={{ color: '#718096', fontSize: 13 }}>
                  Review whether decision emails are pending, sent, or failed.
                </p>
              </div>
            </div>

            {emailQueue.items?.length === 0 ? (
              <p style={{ color: '#718096', fontSize: 14 }}>
                No queued decision emails yet.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Decision</th>
                      <th>Recipient</th>
                      <th>Status</th>
                      <th>Attempts</th>
                      <th>Updated</th>
                      <th>Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailQueue.items.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <strong>{item.paper_title || item.subject}</strong>
                          {item.conference_title && (
                            <div className="muted-copy">{item.conference_title}</div>
                          )}
                        </td>
                        <td>{formatQueueDecision(item.decision)}</td>
                        <td>{item.recipient_email}</td>
                        <td>
                          <span className={`badge badge-email-${item.status}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>{item.attempt_count}</td>
                        <td>{new Date(item.updated_at).toLocaleString()}</td>
                        <td className="email-queue-error-cell">
                          {item.last_error || 'None'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="card">
            <div className="card-header">
              <div>
                <h3>NoSQL Analytics</h3>
                <p style={{ color: '#718096', fontSize: 13 }}>
                  MongoDB collection: {noSqlAnalytics.collection || 'conferenceAnalytics'}
                </p>
              </div>
              <span className={`badge ${noSqlAnalytics.connected ? 'badge-accepted' : 'badge-revision'}`}>
                {noSqlAnalytics.connected ? 'MongoDB Connected' : 'Fallback Mode'}
              </span>
            </div>

            {noSqlAnalytics.message && (
              <div className="alert alert-info">{noSqlAnalytics.message}</div>
            )}

            {noSqlAnalytics.items?.length === 0 ? (
              <p style={{ color: '#718096', fontSize: 14 }}>
                No conference analytics available yet.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Conference</th>
                      <th>Total Papers</th>
                      <th>Accepted</th>
                      <th>Under Review</th>
                      <th>Active Reviewers</th>
                      <th>Avg Review Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {noSqlAnalytics.items.map((item) => (
                      <tr key={item.conferenceId}>
                        <td>{item.title}</td>
                        <td>{item.metrics?.totalPapers ?? 0}</td>
                        <td>{item.metrics?.acceptedPapers ?? 0}</td>
                        <td>{item.metrics?.underReviewPapers ?? 0}</td>
                        <td>{item.metrics?.activeReviewers ?? 0}</td>
                        <td>
                          {item.metrics?.averageReviewScore == null
                            ? 'N/A'
                            : Number(item.metrics.averageReviewScore).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ color: '#718096', fontSize: 12, marginTop: 12 }}>
              Source: {noSqlAnalytics.source}. Generated from SQL view vw_conference_metrics_olap.
            </p>
          </div>
        </>
      )}
    </Layout>
  );
}
