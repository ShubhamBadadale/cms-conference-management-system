import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getMyNotifications,
  markNotificationsRead,
  getMyCertificates,
} from "../services/api";

export function Notifications() {
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyNotifications()
      .then((r) => setNotifs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleMarkRead = async () => {
    await markNotificationsRead();
    setNotifs((prev) => prev.map((n) => ({ ...n, status: "read" })));
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Notifications</h1>
        <p>{notifs.filter((n) => n.status === "unread").length} unread</p>
      </div>
      <div style={{ marginBottom: 12, textAlign: "right" }}>
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
          {notifs.map((n) => (
            <div
              key={n.id}
              className={`notif-item${n.status === "unread" ? " unread" : ""}`}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <div>
                  {n.status === "unread" && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 8,
                        height: 8,
                        background: "#e07b39",
                        borderRadius: "50%",
                        marginRight: 8,
                      }}
                    />
                  )}
                  {n.message}
                </div>
                <span style={{ fontSize: 11, color: "#a0aec0", flexShrink: 0 }}>
                  {new Date(n.created_at).toLocaleString()}
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

  useEffect(() => {
    getMyCertificates()
      .then((r) => setCerts(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>My Certificates</h1>
        <p>Download your acceptance certificates</p>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : certs.length === 0 ? (
        <div className="alert alert-info">
          No certificates yet. Certificates are generated after paper
          acceptance.
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {certs.map((cert) => (
            <div className="card" key={cert.id} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <h3 style={{ fontSize: 16, marginBottom: 8 }}>
                {cert.paper_title}
              </h3>
              <p style={{ fontSize: 13, color: "#718096", marginBottom: 16 }}>
                {cert.conference_title}
              </p>
              <p style={{ fontSize: 12, color: "#a0aec0", marginBottom: 16 }}>
                Generated: {new Date(cert.generated_date).toLocaleDateString()}
              </p>
              <button
                className="btn btn-accent"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("token");

                    const response = await fetch(
                      `http://localhost:5000/api/user/certificates/${cert.paper_id}/download`,
                      {
                        method: "GET",
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      },
                    );

                    if (!response.ok) {
                      const text = await response.text();
                      console.error("Download error:", text);
                      alert("Certificate download failed");
                      return;
                    }

                    const blob = await response.blob();

                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "certificate.pdf";
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                📥 Download Certificate
              </button>
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
