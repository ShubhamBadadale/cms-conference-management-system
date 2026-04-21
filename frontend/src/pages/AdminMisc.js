import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAcceptedPapers, getAllUsers, sendNotification } from '../services/api';

export function AcceptedPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAcceptedPapers()
      .then((response) => setPapers(response.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Accepted Papers</h1>
        <p>Final accepted paper list ({papers.length} papers)</p>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : papers.length === 0 ? (
        <div className="alert alert-info">No papers accepted yet.</div>
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Author</th>
                  <th>Institution</th>
                  <th>Conference</th>
                  <th>Avg Score</th>
                </tr>
              </thead>
              <tbody>
                {papers.map((paper, index) => (
                  <tr key={paper.id}>
                    <td style={{ color: '#a0aec0' }}>{index + 1}</td>
                    <td><strong>{paper.title}</strong></td>
                    <td>{paper.author_name}</td>
                    <td>{paper.institution}</td>
                    <td>{paper.conference_title}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: '#2d7d46' }}>
                        {paper.avg_score ? Number(paper.avg_score).toFixed(1) : 'N/A'}/10
                      </span>
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

export function AdminNotify() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: 'all', message: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getAllUsers().then((response) => setUsers(response.data));
  }, []);

  const handleSend = async (event) => {
    event.preventDefault();
    setMessage('');
    setError('');

    try {
      await sendNotification(form);
      setMessage('Notification sent successfully.');
      setForm({ user_id: 'all', message: '' });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send notification');
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Send Notification</h1>
        <p>Send messages to one user or the full active user base.</p>
      </div>

      <div className="card" style={{ maxWidth: 520 }}>
        {message && <div className="alert alert-success">{message}</div>}
        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>Send To</label>
            <select
              className="form-control"
              value={form.user_id}
              onChange={(event) => setForm({ ...form, user_id: event.target.value })}
            >
              <option value="all">All Active Users</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Message *</label>
            <textarea
              className="form-control"
              required
              rows={4}
              placeholder="Enter notification message..."
              value={form.message}
              onChange={(event) => setForm({ ...form, message: event.target.value })}
            />
          </div>

          <button className="btn btn-accent" type="submit">Send Notification</button>
        </form>
      </div>
    </Layout>
  );
}
