// pages/PaperVersionHistory.js
// Feature 4 — Paper Versioning

import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getVersionHistory, uploadNewVersion } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function PaperVersionHistory() {
  const { paper_id } = useParams();
  const { user }     = useAuth();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [file, setFile]         = useState(null);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg]           = useState('');
  const [err, setErr]           = useState('');

  const load = () => {
    getVersionHistory(paper_id).then(r => setVersions(r.data)).finally(() => setLoading(false));
  };
  useEffect(load, [paper_id]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setErr('Please select a PDF file');
    setUploading(true); setErr(''); setMsg('');
    try {
      const fd = new FormData();
      fd.append('paper_id', paper_id);
      fd.append('paper', file);
      const r = await uploadNewVersion(fd);
      setMsg(r.data.message);
      setFile(null);
      load();
    } catch (er) { setErr(er.response?.data?.message || 'Upload failed'); }
    finally { setUploading(false); }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Version History</h1>
        <p>Paper #{paper_id} — All submitted versions</p>
      </div>
      {user?.role === 'author' && (
        <div className="card" style={{ maxWidth: 500, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 12 }}>Upload New Version</h3>
          {msg && <div className="alert alert-success">{msg}</div>}
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={handleUpload}>
            <div style={{ border: '2px dashed #cbd5e0', borderRadius: 8, padding: '18px', textAlign: 'center', background: '#f7f8fc', marginBottom: 12 }}>
              <input type="file" accept=".pdf" id="ver-file" style={{ display: 'none' }} onChange={e => setFile(e.target.files[0])} />
              <label htmlFor="ver-file" style={{ cursor: 'pointer' }}>
                <div style={{ fontSize: 28 }}>📄</div>
                <div style={{ fontSize: 14, color: '#4a5568', fontWeight: 600, marginTop: 4 }}>
                  {file ? file.name : 'Click to select revised PDF'}
                </div>
              </label>
            </div>
            <button className="btn btn-accent" type="submit" disabled={uploading}>
              {uploading ? 'Uploading...' : '📤 Submit New Version'}
            </button>
          </form>
        </div>
      )}
      {loading ? <div className="spinner" /> : versions.length === 0
        ? <div className="alert alert-info">No version history available (versions are recorded on re-submission).</div>
        : (
          <div className="card">
            <div className="table-wrap">
              <table>
                <thead><tr><th>Version</th><th>File</th><th>Uploaded By</th><th>Upload Date</th><th>Download</th></tr></thead>
                <tbody>
                  {versions.map(v => (
                    <tr key={v.version_id}>
                      <td>
                        <span style={{ background: '#ebf4ff', color: '#2b6cb0', padding: '2px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                          v{v.version_number}
                        </span>
                      </td>
                      <td style={{ fontSize: 13, fontFamily: 'monospace', color: '#4a5568' }}>{v.file_path}</td>
                      <td>{v.uploaded_by_name || '—'}</td>
                      <td style={{ fontSize: 12, color: '#718096' }}>{new Date(v.upload_date).toLocaleString()}</td>
                      <td>
                        <a href={`/api/versions/${paper_id}/download/${v.version_number}`}
                          className="btn btn-outline btn-sm" target="_blank" rel="noreferrer">
                          📥 Download
                        </a>
                      </td>
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
