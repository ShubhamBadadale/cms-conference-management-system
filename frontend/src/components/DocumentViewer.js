import React, { useEffect, useRef, useState } from 'react';

export default function DocumentViewer({
  title,
  fileName,
  loadDocument,
  documentKey,
  description,
  height = 560,
}) {
  const loadDocumentRef = useRef(loadDocument);
  const objectUrlRef = useRef('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    loadDocumentRef.current = loadDocument;
  }, [loadDocument]);

  useEffect(() => {
    let isActive = true;
    let nextUrl = '';

    const load = async () => {
      setLoading(true);
      setError('');

      try {
        const blob = await loadDocumentRef.current();
        if (!isActive) {
          return;
        }

        nextUrl = window.URL.createObjectURL(blob);
        if (objectUrlRef.current) {
          window.URL.revokeObjectURL(objectUrlRef.current);
        }

        objectUrlRef.current = nextUrl;
        setDocumentUrl(nextUrl);
      } catch (err) {
        if (!isActive) {
          return;
        }

        if (objectUrlRef.current) {
          window.URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = '';
        }

        setDocumentUrl('');
        setError(err.message || 'Unable to load this document.');
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      isActive = false;

      if (objectUrlRef.current) {
        window.URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = '';
      }
    };
  }, [documentKey, reloadCount]);

  const handleDownload = () => {
    if (!documentUrl) {
      return;
    }

    const link = document.createElement('a');
    link.href = documentUrl;
    link.download = fileName || 'document.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="document-viewer">
      <div className="document-viewer-header">
        <div>
          <h4>{title}</h4>
          {description && <p>{description}</p>}
        </div>
        <div className="inline-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setReloadCount((current) => current + 1)}
            disabled={loading}
          >
            Refresh Preview
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={handleDownload}
            disabled={!documentUrl || loading}
          >
            Download Document
          </button>
        </div>
      </div>

      {loading ? (
        <div className="document-viewer-body document-viewer-loading">
          <div className="spinner" style={{ margin: '32px auto' }} />
        </div>
      ) : error ? (
        <div className="alert alert-error" style={{ marginBottom: 0 }}>
          {error}
        </div>
      ) : (
        <div className="document-viewer-body">
          <iframe
            title={title}
            src={documentUrl}
            className="document-viewer-frame"
            style={{ height }}
          />
        </div>
      )}
    </div>
  );
}
