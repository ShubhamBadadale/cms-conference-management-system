import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getAssignedPapers, submitReview } from "../services/api";
import { useAuth } from "../context/AuthContext";

const ScoreSlider = ({ label, name, value, onChange }) => (
  <div className="form-group">
    <label>{label}</label>
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

export default function ReviewerDashboard() {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewingId, setReviewingId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    originality_score: 5,
    technical_quality_score: 5,
    clarity_score: 5,
    relevance_score: 5,
    comments: "",
  });
  const [msg, setMsg] = useState({});

  useEffect(() => {
    getAssignedPapers()
      .then((r) => setPapers(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleReview = async (paperId) => {
    try {
      await submitReview({ paper_id: paperId, ...reviewForm });
      setMsg((prev) => ({
        ...prev,
        [paperId]: { type: "success", text: "Review submitted!" },
      }));
      setReviewingId(null);
      const r = await getAssignedPapers();
      setPapers(r.data);
    } catch (err) {
      setMsg((prev) => ({
        ...prev,
        [paperId]: {
          type: "error",
          text: err.response?.data?.message || "Failed",
        },
      }));
    }
  };

  const handled = papers.filter((p) => p.reviewed > 0);
  const pending = papers.filter((p) => p.reviewed === 0);

  return (
    <Layout>
      <div className="page-header">
        <h1>Reviewer Dashboard</h1>
        <p>Welcome, {user?.name} — review assigned papers below</p>
      </div>
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(3, 1fr)" }}
      >
        <div className="stat-card">
          <div className="stat-number">{papers.length}</div>
          <div className="stat-label">Assigned Papers</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#975a16" }}>
            {pending.length}
          </div>
          <div className="stat-label">Pending Review</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#2d7d46" }}>
            {handled.length}
          </div>
          <div className="stat-label">Reviewed</div>
        </div>
      </div>

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
              <div style={{ flex: 1 }}>
                <h3 style={{ fontSize: 17 }}>{paper.title}</h3>
                <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
                  by {paper.author_name} ({paper.institution}) &bull;{" "}
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
                  {paper.abstract?.slice(0, 200)}
                  {paper.abstract?.length > 200 ? "..." : ""}
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
                {paper.reviewed > 0 ? (
                  <span className="badge badge-accepted">✓ Reviewed</span>
                ) : (
                  <span className="badge badge-submitted">Pending</span>
                )}
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
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                  }}
                >
                  📥 Download PDF
                </button>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setReviewingId(reviewingId === paper.id ? null : paper.id);
                    setReviewForm({
                      originality_score: 5,
                      technical_quality_score: 5,
                      clarity_score: 5,
                      relevance_score: 5,
                      comments: "",
                    });
                  }}
                >
                  {reviewingId === paper.id
                    ? "Cancel"
                    : paper.reviewed > 0
                      ? "✏ Update Review"
                      : "📝 Write Review"}
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
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 24px",
                  }}
                >
                  <ScoreSlider
                    label="Originality (0-10)"
                    name="originality_score"
                    value={reviewForm.originality_score}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        originality_score: +e.target.value,
                      })
                    }
                  />
                  <ScoreSlider
                    label="Technical Quality (0-10)"
                    name="technical_quality_score"
                    value={reviewForm.technical_quality_score}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        technical_quality_score: +e.target.value,
                      })
                    }
                  />
                  <ScoreSlider
                    label="Clarity (0-10)"
                    name="clarity_score"
                    value={reviewForm.clarity_score}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        clarity_score: +e.target.value,
                      })
                    }
                  />
                  <ScoreSlider
                    label="Relevance (0-10)"
                    name="relevance_score"
                    value={reviewForm.relevance_score}
                    onChange={(e) =>
                      setReviewForm({
                        ...reviewForm,
                        relevance_score: +e.target.value,
                      })
                    }
                  />
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
                    {(
                      (reviewForm.originality_score +
                        reviewForm.technical_quality_score +
                        reviewForm.clarity_score +
                        reviewForm.relevance_score) /
                      4
                    ).toFixed(2)}
                    /10
                  </span>
                </div>
                <div className="form-group">
                  <label>Comments for Author</label>
                  <textarea
                    className="form-control"
                    rows={4}
                    placeholder="Provide constructive feedback to the author..."
                    value={reviewForm.comments}
                    onChange={(e) =>
                      setReviewForm({ ...reviewForm, comments: e.target.value })
                    }
                  />
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => handleReview(paper.id)}
                >
                  ✓ Submit Review
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
