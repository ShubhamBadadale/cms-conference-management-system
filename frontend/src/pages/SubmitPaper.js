import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { submitPaper, getConferences } from '../services/api';

export default function SubmitPaper() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: '', abstract: '', keywords: '',
    conference_id: searchParams.get('conference') || ''
  });
  const [file, setFile] = useState(null);
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getConferences().then(r => setConferences(r.data));
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError('Please select a PDF file');
    setLoading(true); setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      fd.append('paper', file);
      await submitPaper(fd);
      setSuccess('Paper submitted successfully!');
      setTimeout(() => navigate('/my-submissions'), 1500);
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
        {success && <div className="alert alert-success">{success}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Conference *</label>
            <select className="form-control" required value={form.conference_id}
              onChange={e => setForm({...form, conference_id: e.target.value})}>
              <option value="">Select a conference...</option>
              {conferences.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Paper Title *</label>
            <input className="form-control" required placeholder="e.g., Deep Learning for Natural Language Processing"
              value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Abstract *</label>
            <textarea className="form-control" required placeholder="Summarize your paper's contribution and findings..." rows={5}
              value={form.abstract} onChange={e => setForm({...form, abstract: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Keywords</label>
            <input className="form-control" placeholder="e.g., machine learning, neural networks, NLP (comma-separated)"
              value={form.keywords} onChange={e => setForm({...form, keywords: e.target.value})} />
          </div>
          <div className="form-group">
            <label>Upload PDF *</label>
            <div style={{ border: '2px dashed #cbd5e0', borderRadius: 8, padding: '24px', textAlign: 'center', background: '#f7f8fc' }}>
              <input type="file" accept=".pdf" id="paper-file" style={{ display: 'none' }}
                onChange={e => setFile(e.target.files[0])} />
              <label htmlFor="paper-file" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>📄</div>
                <div style={{ fontSize: 14, color: '#4a5568', fontWeight: 600 }}>
                  {file ? file.name : 'Click to select PDF (max 20MB)'}
                </div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>Only PDF files accepted</div>
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Submitting...' : '📤 Submit Paper'}
            </button>
            <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
