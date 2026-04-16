import React, { useCallback, useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import {
  getAssignedPapers,
  getReviewerWorkload,
  submitReview,
} from "../services/api";
import { useAuth } from "../context/AuthContext";

const initialWorkload = {
  assigned_count: 0,
  completed_count: 0,
  pending_count: 0,
  avg_score_given: null,
};

const initialReviewForm = {
  originality_score: 5,
  technical_quality_score: 5,
  clarity_score: 5,
  relevance_score: 5,
  comments: "",
};

const scoreFields = [
  ["originality_score", "Originality"],
  ["technical_quality_score", "Technical Quality"],
  ["clarity_score", "Clarity"],
  ["relevance_score", "Relevance"],
];

const ScoreSlider = ({ label, name, value, onChange }) => (
  <div className="form-group">
    <label>{label} (0-10)</label>
    <div className="score-input">
      <input
        type="range"
        min="0"
        max="10"
        step="1"
        name={name}
        value={value}
        onChange={onChange}
      />
      <span className="score-value">{value}</span>
    </div>
  </div>
);

const StatCard = ({ label, value, color }) => (
  <div className="stat-card">
    <div className="stat-number" style={color ? { color } : undefined}>
      {value}
    </div>
    <div className="stat-label">{label}</div>
  </div>
);

export default function ReviewerDashboard() {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [workload, setWorkload] = useState(initialWorkload);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [submittingId, setSubmittingId] = useState(null);
  const [reviewForm, setReviewForm] = useState(initialReviewForm);
  const [messages, setMessages] = useState({});
  const [pageError, setPageError] = useState("");

  const loadDashboard = useCallback(async () => {
    setPageError("");
    const [workloadResponse, assignedResponse] = await Promise.all([
      getReviewerWorkload(),
      getAssignedPapers(),
    ]);

    setWorkload(workloadResponse.data || initialWorkload);
    setPapers(assignedResponse.data || []);
  }, []);

  useEffect(() => {
    loadDashboard()
      .catch((err) => {
        setPageError(
          err.response?.data?.message || "Unable to load reviewer dashboard"
        );
      })
      .finally(() => setLoading(false));
  }, [loadDashboard]);

  const averageScore = useMemo(() => {
    const total =
      Number(reviewForm.originality_score) +
      Number(reviewForm.technical_quality_score) +
      Number(reviewForm.clarity_score) +
      Number(reviewForm.relevance_score);

    return (total / 4).toFixed(2);
  }, [reviewForm]);

  const setPaperMessage = (paperId, type, text) => {
    setMessages((prev) => ({
      ...prev,
      [paperId]: { type, text },
    }));
  };

  const handleFormChange = (event) => {
    const { name, value } = event.target;
    setReviewForm((prev) => ({
      ...prev,
      [name]: name === "comments" ? value : Number(value),
    }));
  };

  const validateScores = () => {
    return scoreFields.every(([name]) => {
      const value = Number(reviewForm[name]);
      return Number.isFinite(value) && value >= 0 && value <= 10;
    });
  };

  const handleReview = async (paperId) => {
    if (!validateScores()) {
      setPaperMessage(paperId, "error", "Scores must be between 0 and 10.");
      return;
    }

    setSubmittingId(paperId);

    try {
      await submitReview({
        paper_id: paperId,
        originality_score: reviewForm.originality_score,
        technical_quality_score: reviewForm.technical_quality_score,
        clarity_score: reviewForm.clarity_score,
        relevance_score: reviewForm.relevance_score,
        comments: reviewForm.comments,
      });

      setPaperMessage(paperId, "success", "Review submitted successfully.");
      setReviewingId(null);
      setReviewForm(initialReviewForm);
      await loadDashboard();
    } catch (err) {
      setPaperMessage(
        paperId,
        "error",
        err.response?.data?.message || "Failed to submit review."
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const handleDownload = async (paper) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/papers/${paper.id}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!response.ok) {
      setPaperMessage(paper.id, "error", "Unable to download this paper.");
      return;
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${paper.title || "paper"}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const openReviewForm = (paperId) => {
    setReviewingId((current) => (current === paperId ? null : paperId));
    setReviewForm(initialReviewForm);
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Reviewer Dashboard</h1>
        <p>Welcome, {user?.name}. Review assigned papers below.</p>
      </div>

      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
      >
        <StatCard label="Assigned Papers" value={workload.assigned_count || 0} />
        <StatCard
          label="Pending Review"
          value={workload.pending_count || 0}
          color="#975a16"
        />
        <StatCard
          label="Reviewed"
          value={workload.completed_count || 0}
          color="#2d7d46"
        />
        <StatCard
          label="Avg Score Given"
          value={
            workload.avg_score_given == null
              ? "N/A"
              : Number(workload.avg_score_given).toFixed(2)
          }
          color="#1e3a5f"
        />
      </div>

      {pageError && <div className="alert alert-error">{pageError}</div>}

      {loading ? (
        <div className="spinner" />
      ) : papers.length === 0 ? (
        <div className="alert alert-info">No papers assigned to you yet.</div>
      ) : (
        papers.map((paper) => (
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
              <div style={{ flex: 1, minWidth: 240 }}>
                <h3 style={{ fontSize: 17 }}>{paper.title}</h3>
                <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
                  by {paper.author_name}
                  {paper.institution ? ` (${paper.institution})` : ""} |{" "}
                  {paper.conference_title}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "#4a5568",
                    marginTop: 8,
                    lineHeight: 1.6,
                  }}
                >
                  {paper.abstract
                    ? `${paper.abstract.slice(0, 220)}${
                        paper.abstract.length > 220 ? "..." : ""
                      }`
                    : "No abstract provided."}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                {Number(paper.reviewed) > 0 ? (
                  <span className="badge badge-accepted">Reviewed</span>
                ) : (
                  <span className="badge badge-submitted">Pending</span>
                )}
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => handleDownload(paper)}
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => openReviewForm(paper.id)}
                >
                  {reviewingId === paper.id
                    ? "Cancel"
                    : Number(paper.reviewed) > 0
                      ? "Update Review"
                      : "Write Review"}
                </button>
              </div>
            </div>

            {messages[paper.id] && (
              <div
                className={`alert alert-${
                  messages[paper.id].type === "success" ? "success" : "error"
                }`}
                style={{ marginTop: 12 }}
              >
                {messages[paper.id].text}
              </div>
            )}

            {reviewingId === paper.id && (
              <div
                style={{
                  marginTop: 20,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 20,
                }}
              >
                <h4 style={{ marginBottom: 16 }}>Review Form</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    gap: "0 24px",
                  }}
                >
                  {scoreFields.map(([name, label]) => (
                    <ScoreSlider
                      key={name}
                      label={label}
                      name={name}
                      value={reviewForm[name]}
                      onChange={handleFormChange}
                    />
                  ))}
                </div>

                <div
                  style={{
                    background: "#f7f8fc",
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 12,
                  }}
                >
                  <strong>Average Score: </strong>
                  <span style={{ color: "#1e3a5f", fontWeight: 700 }}>
                    {averageScore}/10
                  </span>
                </div>

                <div className="form-group">
                  <label>Comments for Author</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    name="comments"
                    placeholder="Provide constructive feedback to the author..."
                    value={reviewForm.comments}
                    onChange={handleFormChange}
                  />
                </div>

                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => handleReview(paper.id)}
                  disabled={submittingId === paper.id}
                >
                  {submittingId === paper.id ? "Submitting..." : "Submit Review"}
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
