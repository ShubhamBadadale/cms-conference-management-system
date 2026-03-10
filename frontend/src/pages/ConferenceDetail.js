import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getConferenceById } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function ConferenceDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [conf, setConf] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConferenceById(id).then(r => setConf(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Layout><div className="spinner" /></Layout>;
  if (!conf) return <Layout><div className="alert alert-error">Conference not found</div></Layout>;

  const deadline = conf.submission_deadline ? new Date(conf.submission_deadline) : null;
  const isPast = deadline && deadline < new Date();

  return (
    <Layout>
      <div className="page-header">
        <Link to="/conferences" style={{ fontSize: 13, color: '#718096', textDecoration: 'none' }}>← Back to Conferences</Link>
        <h1 style={{ marginTop: 8 }}>{conf.title}</h1>
        <span className={`badge badge-${conf.status}`}>{conf.status}</span>
      </div>
      <div className="card">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 32 }}>
          <div>
            <h3 style={{ marginBottom: 12 }}>About this Conference</h3>
            <p style={{ color: '#4a5568', lineHeight: 1.7 }}>{conf.description}</p>
            {conf.topics && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ marginBottom: 10 }}>Topics of Interest</h4>
                <div>
                  {conf.topics.split(',').map(t => (
                    <span key={t} style={{ display: 'inline-block', background: '#ebf4ff', color: '#2b6cb0', borderRadius: 6, padding: '4px 12px', fontSize: 13, marginRight: 8, marginBottom: 8 }}>{t.trim()}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <div style={{ background: '#f7f8fc', borderRadius: 10, padding: 20 }}>
              <h4 style={{ marginBottom: 14 }}>Conference Info</h4>
              {conf.venue && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 12, color: '#718096', display: 'block' }}>Venue</span><strong>📍 {conf.venue}</strong></div>}
              {deadline && <div style={{ marginBottom: 10 }}><span style={{ fontSize: 12, color: '#718096', display: 'block' }}>Submission Deadline</span><strong style={{ color: isPast ? '#c53030' : '#276749' }}>📅 {deadline.toLocaleDateString()}{isPast ? ' (Closed)' : ''}</strong></div>}
              <div style={{ marginBottom: 10 }}><span style={{ fontSize: 12, color: '#718096', display: 'block' }}>Organized by</span><strong>{conf.creator_name || 'Admin'}</strong></div>
              {user?.role === 'author' && !isPast && (
                <Link to={`/submit?conference=${conf.id}`} className="btn btn-accent" style={{ width: '100%', justifyContent: 'center', marginTop: 16 }}>
                  📄 Submit Paper
                </Link>
              )}
              {isPast && <div className="alert alert-error" style={{ marginTop: 12 }}>Submission deadline has passed</div>}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
