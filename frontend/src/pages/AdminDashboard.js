import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  getConferenceMetricsOverview,
  getDashboardStats,
  getEmailQueueOverview,
  getMyNotifications,
} from '../services/api';

const emptyConferenceMetrics = {
  connected: false,
  source: 'loading',
  generatedFrom: 'vw_conference_metrics_olap',
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
  const [conferenceMetrics, setConferenceMetrics] = useState(emptyConferenceMetrics);
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
        const metricsResponse = await getConferenceMetricsOverview();
        setConferenceMetrics(metricsResponse.data || emptyConferenceMetrics);
      } catch (err) {
        setConferenceMetrics({
          ...emptyConferenceMetrics,
          source: 'unavailable',
          message: err.response?.data?.message || 'Conference metrics unavailable',
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
                <h3>Conference Metrics</h3>
                <p style={{ color: '#718096', fontSize: 13 }}>
                  MySQL view: {conferenceMetrics.generatedFrom || 'vw_conference_metrics_olap'}
                </p>
              </div>
              <span className={`badge ${conferenceMetrics.connected ? 'badge-accepted' : 'badge-revision'}`}>
                {conferenceMetrics.connected ? 'MySQL View' : 'Unavailable'}
              </span>
            </div>

            {conferenceMetrics.message && (
              <div className="alert alert-info">{conferenceMetrics.message}</div>
            )}

            {conferenceMetrics.items?.length === 0 ? (
              <p style={{ color: '#718096', fontSize: 14 }}>
                No conference metrics available yet.
              </p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Conference</th>
                      <th>Total Papers</th>
                      <th>Accepted</th>
                      <th>Rejected</th>
                      <th>Revision</th>
                      <th>Under Review</th>
                      <th>Active Reviewers</th>
                      <th>Avg Review Score</th>
                      <th>Avg Presentation Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conferenceMetrics.items.map((item) => (
                      <tr key={item.conference_id}>
                        <td>{item.conference_title}</td>
                        <td>{item.total_papers ?? 0}</td>
                        <td>{item.accepted_papers ?? 0}</td>
                        <td>{item.rejected_papers ?? 0}</td>
                        <td>{item.revision_papers ?? 0}</td>
                        <td>{item.under_review_papers ?? 0}</td>
                        <td>{item.active_reviewers ?? 0}</td>
                        <td>
                          {item.avg_review_score == null
                            ? 'N/A'
                            : Number(item.avg_review_score).toFixed(2)}
                        </td>
                        <td>
                          {item.avg_presentation_score == null
                            ? 'N/A'
                            : Number(item.avg_presentation_score).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p style={{ color: '#718096', fontSize: 12, marginTop: 12 }}>
              Source: {conferenceMetrics.source}. Generated directly from SQL view vw_conference_metrics_olap.
            </p>
          </div>
        </>
      )}
    </Layout>
  );
}
