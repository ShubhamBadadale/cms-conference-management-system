import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { getAcceptedPapers, sendNotification, getAllUsers } from '../services/api';

export function AcceptedPapers() {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAcceptedPapers().then(r => setPapers(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header"><h1>Accepted Papers</h1><p>Final accepted paper list ({papers.length} papers)</p></div>
      {loading ? <div className="spinner" /> : papers.length === 0
        ? <div className="alert alert-info">No papers accepted yet.</div>
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Title</th><th>Author</th><th>Institution</th><th>Conference</th><th>Avg Score</th></tr></thead>
                <tbody>
                  {papers.map((p, i) => (
                    <tr key={p.id}>
                      <td style={{ color: '#a0aec0' }}>{i + 1}</td>
                      <td><strong>{p.title}</strong></td>
                      <td>{p.author_name}</td>
                      <td>{p.institution}</td>
                      <td>{p.conference_title}</td>
                      <td><span style={{ fontWeight: 700, color: '#2d7d46' }}>{p.avg_score ? Number(p.avg_score).toFixed(1) : 'N/A'}/10</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      }
    </Layout>
  );
}

export function AdminNotify() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ user_id: 'all', message: '' });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  useEffect(() => { getAllUsers().then(r => setUsers(r.data)); }, []);

  const handleSend = async (e) => {
    e.preventDefault(); setMsg(''); setErr('');
    try {
      await sendNotification(form);
      setMsg('Notification sent successfully!');
      setForm({ user_id: 'all', message: '' });
    } catch (err) { setErr(err.response?.data?.message || 'Failed'); }
  };

  return (
    <Layout>
      <div className="page-header"><h1>Send Notification</h1><p>Send messages to users</p></div>
      <div className="card" style={{ maxWidth: 520 }}>
        {msg && <div className="alert alert-success">{msg}</div>}
        {err && <div className="alert alert-error">{err}</div>}
        <form onSubmit={handleSend}>
          <div className="form-group">
            <label>Send To</label>
            <select className="form-control" value={form.user_id} onChange={e => setForm({...form, user_id: e.target.value})}>
              <option value="all">All Users</option>
              {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Message *</label>
            <textarea className="form-control" required rows={4} placeholder="Enter notification message..."
              value={form.message} onChange={e => setForm({...form, message: e.target.value})} />
          </div>
          <button className="btn btn-accent" type="submit">🔔 Send Notification</button>
        </form>
      </div>
    </Layout>
  );
}
