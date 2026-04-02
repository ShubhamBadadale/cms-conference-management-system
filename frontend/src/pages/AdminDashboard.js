import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Layout from "../components/Layout";
import { getDashboardStats, getMyNotifications } from "../services/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [notifs, setNotifs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [s, n] = await Promise.all([
          getDashboardStats(),
          getMyNotifications(),
        ]);

        setStats(s.data);
        setNotifs(n.data.slice(0, 5));
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  return (
    <Layout>
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Manage the complete conference lifecycle</p>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats?.total_papers}</div>
              <div className="stat-label">Total Papers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats?.total_users}</div>
              <div className="stat-label">Total Users</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats?.total_conferences}</div>
              <div className="stat-label">Conferences</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: "#2d7d46" }}>
                {stats?.accepted}
              </div>
              <div className="stat-label">Accepted</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: "#c53030" }}>
                {stats?.rejected}
              </div>
              <div className="stat-label">Rejected</div>
            </div>
            <div className="stat-card">
              <div className="stat-number" style={{ color: "#975a16" }}>
                {stats?.under_review}
              </div>
              <div className="stat-label">Under Review</div>
            </div>
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}
          >
            <div className="card">
              <h3 style={{ marginBottom: 16 }}>Quick Actions</h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                }}
              >
                <Link to="/admin/conferences" className="btn btn-primary">
                  🎓 Conferences
                </Link>
                <Link to="/admin/submissions" className="btn btn-primary">
                  📋 Submissions
                </Link>
                <Link to="/admin/users" className="btn btn-outline">
                  👥 Manage Users
                </Link>
                <Link to="/admin/accepted" className="btn btn-success">
                  ✅ Accepted Papers
                </Link>
                <Link to="/admin/notify" className="btn btn-accent">
                  🔔 Send Notification
                </Link>
              </div>
            </div>
            <div className="card">
              <h3 style={{ marginBottom: 12 }}>Recent Notifications</h3>
              {notifs.length === 0 ? (
                <p style={{ color: "#718096", fontSize: 14 }}>
                  No notifications yet
                </p>
              ) : (
                notifs.map((n) => (
                  <div className="notif-item" key={n.id}>
                    {n.message}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
