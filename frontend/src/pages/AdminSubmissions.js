import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getAllSubmissions,
  makeDecision,
  getReviewers,
  assignReviewer,
  getReviewsForPaper,
  generateCertificate,
} from "../services/api";

export default function AdminSubmissions() {
  const [papers, setPapers] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [reviews, setReviews] = useState({});
  const [assignRevId, setAssignRevId] = useState({});
  const [msg, setMsg] = useState({});
  const [filter, setFilter] = useState("all");

  const load = () => {
    Promise.all([getAllSubmissions(), getReviewers()])
      .then(([p, r]) => {
        setPapers(p.data);
        setReviewers(r.data);
      })
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const setMessage = (id, type, text) =>
    setMsg((prev) => ({ ...prev, [id]: { type, text } }));

  const handleDecision = async (paperId, status) => {
    try {
      await makeDecision({ paper_id: paperId, status });
      setMessage(paperId, "success", `Paper marked as ${status}`);
      load();
    } catch (err) {
      setMessage(paperId, "error", err.response?.data?.message || "Failed");
    }
  };

  const handleAssign = async (paperId) => {
    const rev_id = assignRevId[paperId];
    if (!rev_id) return;
    try {
      await assignReviewer({ paper_id: paperId, reviewer_id: rev_id });
      setMessage(paperId, "success", "Reviewer assigned!");
      load();
    } catch (err) {
      setMessage(paperId, "error", err.response?.data?.message || "Failed");
    }
  };

  const handleGenCert = async (paperId) => {
    try {
      await generateCertificate({ paper_id: paperId });
      setMessage(paperId, "success", "Certificate generated!");
    } catch (err) {
      setMessage(paperId, "error", err.response?.data?.message || "Failed");
    }
  };

  const loadReviews = async (paperId) => {
    if (expandedId === paperId) return setExpandedId(null);
    setExpandedId(paperId);
    if (!reviews[paperId]) {
      const r = await getReviewsForPaper(paperId);
      setReviews((prev) => ({ ...prev, [paperId]: r.data }));
    }
  };

  const filtered =
    filter === "all" ? papers : papers.filter((p) => p.status === filter);

  return (
    <Layout>
      <div className="page-header">
        <h1>All Submissions</h1>
        <p>Review and manage paper submissions</p>
      </div>
      <div className="tabs">
        {[
          "all",
          "submitted",
          "under_review",
          "revision",
          "accepted",
          "rejected",
        ].map((s) => (
          <button
            key={s}
            className={`tab-btn${filter === s ? " active" : ""}`}
            onClick={() => setFilter(s)}
          >
            {s === "all" ? "All" : s.replace("_", " ")}{" "}
            {s === "all"
              ? `(${papers.length})`
              : `(${papers.filter((p) => p.status === s).length})`}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="spinner" />
      ) : (
        filtered.map((paper) => (
          <div className="card" key={paper.id}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 16 }}>{paper.title}</h3>
                <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
                  ✍ {paper.author_name} ({paper.institution}) &bull;{" "}
                  {paper.conference_title} &bull; v{paper.version}
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <span className={`badge badge-${paper.status}`}>
                  {paper.status.replace("_", " ")}
                </span>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={() => loadReviews(paper.id)}
                >
                  👁 Reviews
                </button>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={async () => {
                    const token = localStorage.getItem("token");

                    const response = await fetch(
                      `http://localhost:5000/api/papers/${paper.id}/download`,
                      {
                        headers: {
                          Authorization: `Bearer ${token}`,
                        },
                      },
                    );

                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);

                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "paper.pdf";
                    a.click();
                  }}
                >
                  📥 PDF
                </button>
              </div>
            </div>

            {msg[paper.id] && (
              <div
                className={`alert alert-${msg[paper.id].type === "success" ? "success" : "error"}`}
                style={{ marginTop: 12 }}
              >
                {msg[paper.id].text}
              </div>
            )}

            <div
              style={{
                marginTop: 14,
                display: "flex",
                gap: 8,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <strong style={{ fontSize: 13 }}>Decision:</strong>
              <button
                className="btn btn-success btn-sm"
                onClick={() => handleDecision(paper.id, "accepted")}
              >
                ✅ Accept
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={() => handleDecision(paper.id, "rejected")}
              >
                ❌ Reject
              </button>
              <button
                className="btn btn-warning btn-sm"
                onClick={() => handleDecision(paper.id, "revision")}
              >
                🔄 Request Revision
              </button>
              {paper.status === "accepted" && (
                <button
                  className="btn btn-accent btn-sm"
                  onClick={() => handleGenCert(paper.id)}
                >
                  🏆 Generate Certificate
                </button>
              )}
            </div>

            <div
              style={{
                marginTop: 12,
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <strong style={{ fontSize: 13 }}>Assign Reviewer:</strong>
              <select
                className="form-control"
                style={{ width: "auto", fontSize: 13, padding: "5px 10px" }}
                value={assignRevId[paper.id] || ""}
                onChange={(e) =>
                  setAssignRevId((prev) => ({
                    ...prev,
                    [paper.id]: e.target.value,
                  }))
                }
              >
                <option value="">Select reviewer...</option>
                {reviewers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.assigned_count} assigned)
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => handleAssign(paper.id)}
              >
                Assign
              </button>
            </div>

            {expandedId === paper.id && (
              <div
                style={{
                  marginTop: 16,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 16,
                }}
              >
                <h4 style={{ marginBottom: 12 }}>
                  Reviews ({reviews[paper.id]?.length || 0})
                </h4>
                {!reviews[paper.id] ? (
                  <div
                    className="spinner"
                    style={{ width: 24, height: 24, margin: 0 }}
                  />
                ) : reviews[paper.id].length === 0 ? (
                  <p style={{ color: "#718096", fontSize: 14 }}>
                    No reviews yet
                  </p>
                ) : (
                  reviews[paper.id].map((rev) => (
                    <div
                      key={rev.id}
                      style={{
                        background: "#f7f8fc",
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: 10,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}
                      >
                        <strong>{rev.reviewer_name}</strong>
                        <span style={{ fontWeight: 700, color: "#1e3a5f" }}>
                          Avg: {rev.total_score}/10
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(4,1fr)",
                          gap: 8,
                          fontSize: 13,
                          marginBottom: 8,
                        }}
                      >
                        <div>
                          Originality: <strong>{rev.originality_score}</strong>
                        </div>
                        <div>
                          Technical:{" "}
                          <strong>{rev.technical_quality_score}</strong>
                        </div>
                        <div>
                          Clarity: <strong>{rev.clarity_score}</strong>
                        </div>
                        <div>
                          Relevance: <strong>{rev.relevance_score}</strong>
                        </div>
                      </div>
                      {rev.comments && (
                        <p style={{ fontSize: 13, color: "#4a5568" }}>
                          <em>{rev.comments}</em>
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
