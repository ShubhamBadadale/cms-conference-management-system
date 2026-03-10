import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import { getConferences } from '../services/api';

export default function ConferenceList() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getConferences().then(r => setConferences(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Open Conferences</h1>
        <p>Browse and submit to published conferences</p>
      </div>
      {loading ? <div className="spinner" /> : (
        conferences.length === 0
          ? <div className="alert alert-info">No published conferences available yet.</div>
          : (
            <div className="conf-grid">
              {conferences.map(c => (
                <Link to={`/conferences/${c.id}`} className="conf-card" key={c.id}>
                  <div className="conf-card-banner" />
                  <div className="conf-card-body">
                    <div className="conf-card-title">{c.title}</div>
                    <p style={{ fontSize: 13, color: '#4a5568', marginBottom: 12, lineHeight: 1.5 }}>
                      {c.description?.slice(0, 100)}{c.description?.length > 100 ? '...' : ''}
                    </p>
                    <div className="conf-card-meta">
                      {c.venue && <span>📍 {c.venue}</span>}
                      {c.submission_deadline && <span>📅 Deadline: {new Date(c.submission_deadline).toLocaleDateString()}</span>}
                    </div>
                    {c.topics && (
                      <div style={{ marginTop: 12 }}>
                        {c.topics.split(',').slice(0, 3).map(t => (
                          <span key={t} style={{ display: 'inline-block', background: '#ebf4ff', color: '#2b6cb0', borderRadius: 4, padding: '2px 8px', fontSize: 11, marginRight: 4, marginTop: 4 }}>{t.trim()}</span>
                        ))}
                      </div>
                    )}
                    <div style={{ marginTop: 14 }}>
                      <span className="btn btn-primary btn-sm">View Details →</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )
      )}
    </Layout>
  );
}
