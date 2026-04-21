import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { getConferences, submitPaper } from '../services/api';

export default function SubmitPaper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '',
    abstract: '',
    keywords: '',
    conference_id: searchParams.get('conference') || '',
  });
  const [file, setFile] = useState(null);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    getConferences().then((response) => setConferences(response.data));
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!file) return setError('Please select a PDF file');

    setLoading(true);
    setError('');
    setSuccess(null);

    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => formData.append(key, value));
      formData.append('paper', file);

      const response = await submitPaper(formData);
      setSuccess(response.data);
      setTimeout(() => navigate('/my-submissions'), 2200);
    } catch (err) {
      setError(err.response?.data?.message || 'Submission failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Submit Paper</h1>
        <p>Upload your research paper for conference review</p>
      </div>

      <div className="card" style={{ maxWidth: 680 }}>
        {error && <div className="alert alert-error">{error}</div>}

        {success && (
          <>
            <div className={`alert ${success.status === 'flagged_for_review' ? 'alert-info' : 'alert-success'}`}>
              {success.message}
            </div>
            <div className="status-panel" style={{ marginBottom: 18 }}>
              <div><strong>Current status:</strong> {success.status?.replace(/_/g, ' ')}</div>
              <div><strong>Version created:</strong> v{success.version}</div>
              {success.plagiarism && (
                <div>
                  <strong>Similarity screening:</strong> {success.plagiarism.score}% (threshold {success.plagiarism.threshold}%)
                </div>
              )}
              {success.plagiarism?.reason && (
                <div style={{ marginTop: 6, color: '#4a5568' }}>{success.plagiarism.reason}</div>
              )}
              {success.status === 'flagged_for_review' && (
                <div style={{ marginTop: 8, color: '#2c5282' }}>
                  Your paper is stored successfully, but it will stay in manual review until an admin clears the similarity flag.
                </div>
              )}
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Conference *</label>
            <select
              className="form-control"
              required
              value={form.conference_id}
              onChange={(event) => setForm({ ...form, conference_id: event.target.value })}
            >
              <option value="">Select a conference...</option>
              {conferences.map((conference) => (
                <option key={conference.id} value={conference.id}>
                  {conference.title}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Paper Title *</label>
            <input
              className="form-control"
              required
              placeholder="e.g., Deep Learning for Natural Language Processing"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Abstract *</label>
            <textarea
              className="form-control"
              required
              placeholder="Summarize your paper's contribution and findings..."
              rows={5}
              value={form.abstract}
              onChange={(event) => setForm({ ...form, abstract: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Keywords</label>
            <input
              className="form-control"
              placeholder="e.g., machine learning, neural networks, NLP"
              value={form.keywords}
              onChange={(event) => setForm({ ...form, keywords: event.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Upload PDF *</label>
            <div className="upload-dropzone">
              <input
                type="file"
                accept=".pdf"
                id="paper-file"
                style={{ display: 'none' }}
                onChange={(event) => setFile(event.target.files[0])}
              />
              <label htmlFor="paper-file" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>Paper</div>
                <div style={{ fontSize: 14, color: '#4a5568', fontWeight: 600 }}>
                  {file ? file.name : 'Click to select PDF (max 20MB)'}
                </div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                  A simulated plagiarism screen runs automatically after upload.
                </div>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Paper'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
