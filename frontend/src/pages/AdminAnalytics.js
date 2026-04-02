// pages/AdminAnalytics.js
// Features 7 & 8 — Analytics Views + Reviewer Workload Monitoring

import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getPaperReviewSummary,
  getReviewerWorkload,
  getDecisionTrail,
} from "../services/api";
import { getAllUsers } from "../services/api";
import { getDashboardStats } from "../services/api";

const WorkloadBar = ({ value, max = 5 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
    <div
      style={{
        flex: 1,
        height: 8,
        background: "#e2e8f0",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: 4,
          width: `${Math.min((value / max) * 100, 100)}%`,
          background:
            value >= max
              ? "#c53030"
              : value >= max * 0.7
                ? "#dd6b20"
                : "#2d7d46",
          transition: "width 0.4s",
        }}
      />
    </div>
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        minWidth: 24,
        color: value >= max ? "#c53030" : "#1e3a5f",
      }}
    >
      {value}/{max}
    </span>
  </div>
);

export default function AdminAnalytics() {
  const [summary, setSummary] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("summary");

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await getAllUsers();
      setUsers(res.data);
    };

    fetchUsers();
  }, []);

  // Stats derived from summary view
  const avgScore =
    summary.length > 0
      ? (
          summary.reduce((a, p) => a + (Number(p.average_score) || 0), 0) /
          summary.filter((p) => p.average_score).length
        ).toFixed(2)
      : "N/A";
  const totalReviews = summary.reduce((a, p) => a + Number(p.total_reviews), 0);
  const overloaded = workload.filter((w) => w.assigned_papers >= 5).length;

  return (
    <Layout>
      <div className="page-header">
        <h1>Analytics Dashboard</h1>
        <p>Powered by paper_review_summary & reviewer_workload SQL views</p>
      </div>

      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(4,1fr)", marginBottom: 24 }}
      >
        <div className="stat-card">
          <div className="stat-number">{summary.length}</div>
          <div className="stat-label">Papers Tracked</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{totalReviews}</div>
          <div className="stat-label">Total Reviews</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{avgScore}</div>
          <div className="stat-label">Avg Review Score</div>
        </div>
        <div className="stat-card">
          <div
            className="stat-number"
            style={{ color: overloaded > 0 ? "#c53030" : "#2d7d46" }}
          >
            {overloaded}
          </div>
          <div className="stat-label">Overloaded Reviewers</div>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab-btn${activeTab === "summary" ? " active" : ""}`}
          onClick={() => setActiveTab("summary")}
        >
          📊 Paper Review Summary
        </button>
        <button
          className={`tab-btn${activeTab === "workload" ? " active" : ""}`}
          onClick={() => setActiveTab("workload")}
        >
          👷 Reviewer Workload
        </button>
        <button
          className={`tab-btn${activeTab === "decisions" ? " active" : ""}`}
          onClick={() => setActiveTab("decisions")}
        >
          📝 Decision Trail
        </button>
      </div>

      {loading ? (
        <div className="spinner" />
      ) : (
        <>
          {/* Feature 8 — Paper Review Summary View */}
          {activeTab === "summary" && (
            <div className="card">
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#718096",
                  fontFamily: "monospace",
                  background: "#f7f8fc",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                SQL View: <strong>paper_review_summary</strong> — AVG(score),
                COUNT(reviews) per paper
              </div>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Title</th>
                      <th>Author</th>
                      <th>Status</th>
                      <th>Reviews</th>
                      <th>Avg Score</th>
                      <th>High</th>
                      <th>Low</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((p, i) => (
                      <tr key={p.paper_id}>
                        <td style={{ color: "#a0aec0" }}>{i + 1}</td>
                        <td>
                          <strong style={{ fontSize: 13 }}>{p.title}</strong>
                        </td>
                        <td style={{ fontSize: 13 }}>{p.author_name}</td>
                        <td>
                          <span className={`badge badge-${p.status}`}>
                            {p.status?.replace("_", " ")}
                          </span>
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.total_reviews}</td>
                        <td>
                          {p.average_score != null ? (
                            <span
                              style={{
                                fontWeight: 700,
                                color:
                                  p.average_score >= 7
                                    ? "#2d7d46"
                                    : p.average_score >= 5
                                      ? "#975a16"
                                      : "#c53030",
                              }}
                            >
                              {Number(p.average_score).toFixed(2)}/10
                            </span>
                          ) : (
                            <span style={{ color: "#a0aec0" }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: 12, color: "#2d7d46" }}>
                          {p.highest_score != null
                            ? `${p.highest_score}/10`
                            : "—"}
                        </td>
                        <td style={{ fontSize: 12, color: "#c53030" }}>
                          {p.lowest_score != null
                            ? `${p.lowest_score}/10`
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Feature 7 — Reviewer Workload View */}
          {activeTab === "workload" && (
            <div className="card">
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#718096",
                  fontFamily: "monospace",
                  background: "#f7f8fc",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                SQL View: <strong>reviewer_workload</strong> — COUNT(assigned)
                per reviewer (limit: 5)
              </div>
              {workload.length === 0 ? (
                <div className="alert alert-info">
                  No reviewers registered yet.
                </div>
              ) : (
                workload.map((r) => (
                  <div
                    key={r.reviewer_id}
                    style={{
                      padding: "12px 0",
                      borderBottom: "1px solid #e2e8f0",
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      flexWrap: "wrap",
                    }}
                  >
                    <div style={{ minWidth: 200 }}>
                      <div style={{ fontWeight: 600 }}>{r.reviewer_name}</div>
                      <div style={{ fontSize: 12, color: "#718096" }}>
                        {r.email}
                      </div>
                      {r.institution && (
                        <div style={{ fontSize: 11, color: "#a0aec0" }}>
                          {r.institution}
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <div
                        style={{
                          fontSize: 12,
                          color: "#718096",
                          marginBottom: 4,
                        }}
                      >
                        Assigned: <strong>{r.assigned_papers}</strong>{" "}
                        &nbsp;|&nbsp; Reviewed:{" "}
                        <strong>{r.reviewed_papers}</strong> &nbsp;|&nbsp;
                        Pending:{" "}
                        <strong>{r.assigned_papers - r.reviewed_papers}</strong>
                      </div>
                      <WorkloadBar value={r.assigned_papers} max={5} />
                    </div>
                    {r.assigned_papers >= 5 && (
                      <span
                        style={{
                          background: "#fff5f5",
                          color: "#c53030",
                          padding: "3px 10px",
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        ⚠ At Limit
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* Feature 6 — Decision Trail */}
          {activeTab === "decisions" && (
            <div className="card">
              <div
                style={{
                  marginBottom: 12,
                  fontSize: 12,
                  color: "#718096",
                  fontFamily: "monospace",
                  background: "#f7f8fc",
                  padding: "8px 12px",
                  borderRadius: 6,
                }}
              >
                Table: <strong>Decisions</strong> — Full audit trail of all
                Accept/Reject/Revision decisions
              </div>
              {decisions.length === 0 ? (
                <div className="alert alert-info">
                  No decisions recorded yet.
                </div>
              ) : (
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Paper</th>
                        <th>Decision</th>
                        <th>Admin</th>
                        <th>Comment</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {decisions.map((d) => (
                        <tr key={d.decision_id}>
                          <td>
                            <strong style={{ fontSize: 13 }}>
                              {d.paper_title}
                            </strong>
                          </td>
                          <td>
                            <span className={`badge badge-${d.decision_type}`}>
                              {d.decision_type}
                            </span>
                          </td>
                          <td style={{ fontSize: 13 }}>{d.decided_by_name}</td>
                          <td
                            style={{
                              fontSize: 12,
                              color: "#4a5568",
                              maxWidth: 200,
                            }}
                          >
                            {d.comment || "—"}
                          </td>
                          <td style={{ fontSize: 12, color: "#718096" }}>
                            {new Date(d.decided_at).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
