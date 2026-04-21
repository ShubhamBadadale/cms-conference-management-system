import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  createConference,
  downloadConferenceProceedings,
  getAllConferencesAdmin,
  publishConference,
  updateConferenceActiveState,
} from '../services/api';

const downloadBlob = (blob, fileName) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export default function AdminConferences() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    topics: '',
    venue: '',
    submission_deadline: '',
  });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busyConferenceId, setBusyConferenceId] = useState(null);

  const load = async () => {
    const response = await getAllConferencesAdmin();
    setConferences(response.data || []);
  };

  useEffect(() => {
    load()
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    try {
      await createConference(form);
      setMessage('Conference created successfully.');
      setShowForm(false);
      setForm({
        title: '',
        description: '',
        topics: '',
        venue: '',
        submission_deadline: '',
      });
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create conference');
    }
  };

  const handlePublish = async (conferenceId) => {
    setBusyConferenceId(conferenceId);
    setError('');
    setMessage('');

    try {
      await publishConference(conferenceId);
      setMessage('Conference published successfully.');
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish conference');
    } finally {
      setBusyConferenceId(null);
    }
  };

  const handleActiveToggle = async (conference) => {
    setBusyConferenceId(conference.id);
    setError('');
    setMessage('');

    try {
      await updateConferenceActiveState(conference.id, !conference.is_active);
      setMessage(`Conference ${conference.is_active ? 'archived' : 'reactivated'} successfully.`);
      await load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update conference state');
    } finally {
      setBusyConferenceId(null);
    }
  };

  const handleDownloadProceedings = async (conference) => {
    setBusyConferenceId(conference.id);
    setError('');
    setMessage('');

    try {
      const response = await downloadConferenceProceedings(conference.id);
      const fileName = `${conference.title.replace(/[^a-z0-9-_]+/gi, '_')}-proceedings.pdf`;
      downloadBlob(response.data, fileName);
      setMessage(`Proceedings download started for ${conference.title}.`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to download proceedings');
    } finally {
      setBusyConferenceId(null);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Manage Conferences</h1>
        <p>Create conferences, archive them when needed, and download proceedings for accepted papers.</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      <div className="page-toolbar">
        <button className="btn btn-accent" onClick={() => setShowForm((current) => !current)}>
          {showForm ? 'Close Form' : 'Create Conference'}
        </button>
      </div>

      {showForm && (
        <div className="card" style={{ maxWidth: 720 }}>
          <h3 style={{ marginBottom: 16 }}>New Conference</h3>
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title *</label>
              <input
                className="form-control"
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </div>

            <div className="form-group">
              <label>Topics (comma-separated)</label>
              <input
                className="form-control"
                placeholder="AI, distributed systems, HCI"
                value={form.topics}
                onChange={(event) => setForm({ ...form, topics: event.target.value })}
              />
            </div>

            <div className="detail-grid">
              <div className="form-group">
                <label>Venue</label>
                <input
                  className="form-control"
                  value={form.venue}
                  onChange={(event) => setForm({ ...form, venue: event.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Submission Deadline</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.submission_deadline}
                  onChange={(event) => setForm({ ...form, submission_deadline: event.target.value })}
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit">Create Conference</button>
          </form>
        </div>
      )}

      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Conference</th>
                  <th>Venue</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Archive State</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conferences.map((conference) => (
                  <tr key={conference.id} className={conference.is_active ? '' : 'inactive-row'}>
                    <td>
                      <strong>{conference.title}</strong>
                      {conference.topics && (
                        <div className="muted-copy" style={{ marginTop: 4 }}>
                          {conference.topics}
                        </div>
                      )}
                    </td>
                    <td>{conference.venue || 'Not set'}</td>
                    <td>
                      {conference.submission_deadline
                        ? new Date(conference.submission_deadline).toLocaleDateString()
                        : 'Not set'}
                    </td>
                    <td>
                      <span className={`badge badge-${conference.status}`}>{conference.status}</span>
                    </td>
                    <td>
                      <span className={`badge ${conference.is_active ? 'badge-active' : 'badge-archived'}`}>
                        {conference.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        {conference.status === 'draft' && conference.is_active && (
                          <button
                            className="btn btn-success btn-sm"
                            disabled={busyConferenceId === conference.id}
                            onClick={() => handlePublish(conference.id)}
                          >
                            Publish
                          </button>
                        )}
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={busyConferenceId === conference.id || !conference.is_active}
                          onClick={() => handleDownloadProceedings(conference)}
                        >
                          Proceedings
                        </button>
                        <button
                          className="btn btn-outline btn-sm"
                          disabled={busyConferenceId === conference.id}
                          onClick={() => handleActiveToggle(conference)}
                        >
                          {conference.is_active ? 'Archive' : 'Reactivate'}
                        </button>
                      </div>
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
