import React, { useEffect, useState } from 'react';
import DocumentViewer from '../components/DocumentViewer';
import Layout from '../components/Layout';
import {
  getCertificateDocumentBlob,
  getMyCertificates,
  getMyNotifications,
  markNotificationsRead,
} from '../services/api';

const buildCertificateFileName = (paperTitle) => {
  const safeTitle = String(paperTitle || 'certificate')
    .replace(/[^a-z0-9-_]+/gi, '_')
    .replace(/^_+|_+$/g, '');

  return `${safeTitle || 'certificate'}-certificate.pdf`;
};

export function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyNotifications()
      .then((response) => setNotifs(response.data))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async () => {
    await markNotificationsRead();
    setNotifs((prev) => prev.map((notification) => ({ ...notification, status: 'read' })));
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>{notifs.filter((notification) => notification.status === 'unread').length} unread</p>
      </div>
      <div style={{ marginBottom: 12, textAlign: 'right' }}>
        <button className="btn btn-outline btn-sm" onClick={handleMarkRead}>
          Mark All as Read
        </button>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : notifs.length === 0 ? (
        <div className="alert alert-info">No notifications yet.</div>
      ) : (
        <div className="card">
          {notifs.map((notification) => (
            <div
              key={notification.id}
              className={`notif-item${notification.status === 'unread' ? ' unread' : ''}`}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  gap: 12,
                }}
              >
                <div>
                  {notification.status === 'unread' && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        background: '#e07b39',
                        borderRadius: '50%',
                        marginRight: 8,
                      }}
                    />
                  )}
                  {notification.message}
                </div>
                <span style={{ fontSize: 11, color: '#a0aec0', flexShrink: 0 }}>
                  {new Date(notification.created_at).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}

export function Certificates() {
  const [certs, setCerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [previewingId, setPreviewingId] = useState(null);

  useEffect(() => {
    getMyCertificates()
      .then((response) => setCerts(response.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>My Certificates</h1>
        <p>View your acceptance certificates in the browser and download them separately when needed.</p>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : certs.length === 0 ? (
        <div className="alert alert-info">
          No certificates yet. Certificates are generated after paper acceptance.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {certs.map((cert) => (
            <div className="card" key={cert.id}>
              <div className="certificate-card-header">
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 8 }}>{cert.paper_title}</h3>
                  <p style={{ fontSize: 13, color: '#718096', marginBottom: 8 }}>
                    {cert.conference_title}
                  </p>
                  <p style={{ fontSize: 12, color: '#a0aec0' }}>
                    Generated: {new Date(cert.generated_date).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge badge-accepted">Certificate</span>
              </div>

              <div style={{ marginTop: 14 }}>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => setPreviewingId((current) => (current === cert.id ? null : cert.id))}
                >
                  {previewingId === cert.id ? 'Hide Preview' : 'Preview Certificate'}
                </button>
              </div>

              {previewingId === cert.id && (
                <div style={{ marginTop: 16 }}>
                  <DocumentViewer
                    title="Certificate Preview"
                    description="Open the certificate inside the browser and use the separate download button if you need a copy."
                    fileName={buildCertificateFileName(cert.paper_title)}
                    documentKey={`certificate-${cert.paper_id}`}
                    loadDocument={() => getCertificateDocumentBlob(cert.paper_id)}
                    height={420}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
