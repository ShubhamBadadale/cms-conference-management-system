import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { getPresentationSchedule, scorePresentation } from "../services/api";
import { useAuth } from "../context/AuthContext";

const Slider = ({ label, name, value, onChange }) => (
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

export default function CoordinatorDashboard() {
  const { user } = useAuth();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scoringId, setScoringId] = useState(null);
  const [form, setForm] = useState({
    presentation_quality: 5,
    communication: 5,
    content_clarity: 5,
    audience_engagement: 5,
  });
  const [msg, setMsg] = useState({});

  const load = () =>
    getPresentationSchedule()
      .then((r) => setPapers(r.data))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const handleScore = async (paperId) => {
    try {
      const r = await scorePresentation({ paper_id: paperId, ...form });
      setMsg((prev) => ({
        ...prev,
        [paperId]: {
          type: "success",
          text: `Scored! Average: ${r.data.total_score.toFixed(2)}/10`,
        },
      }));
      setScoringId(null);
      load();
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

  const scored = papers.filter((p) => p.total_score != null);
  const pending = papers.filter((p) => p.total_score == null);

  return (
    <Layout>
      <div className="page-header">
        <h1>Coordinator Dashboard</h1>
        <p>Welcome, {user?.name} — score accepted presentations</p>
      </div>
      <div
        className="stats-grid"
        style={{ gridTemplateColumns: "repeat(3,1fr)" }}
      >
        <div className="stat-card">
          <div className="stat-number">{papers.length}</div>
          <div className="stat-label">Total Presentations</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#975a16" }}>
            {pending.length}
          </div>
          <div className="stat-label">Pending Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-number" style={{ color: "#2d7d46" }}>
            {scored.length}
          </div>
          <div className="stat-label">Scored</div>
        </div>
      </div>
      {loading ? (
        <div className="spinner" />
      ) : papers.length === 0 ? (
        <div className="alert alert-info">No accepted papers to score yet.</div>
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
              <div>
                <h3 style={{ fontSize: 16 }}>{paper.title}</h3>
                <div style={{ fontSize: 13, color: "#718096", marginTop: 4 }}>
                  ✍ {paper.author_name} ({paper.institution}) &bull;{" "}
                  {paper.conference_title}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {paper.total_score != null ? (
                  <span style={{ fontWeight: 700, color: "#2d7d46" }}>
                    ⭐ {Number(paper.total_score).toFixed(1)}/10
                  </span>
                ) : (
                  <span className="badge badge-submitted">Not Scored</span>
                )}
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => {
                    setScoringId(scoringId === paper.id ? null : paper.id);
                    setForm({
                      presentation_quality: paper.presentation_quality || 5,
                      communication: paper.communication || 5,
                      content_clarity: paper.content_clarity || 5,
                      audience_engagement: paper.audience_engagement || 5,
                    });
                  }}
                >
                  {scoringId === paper.id
                    ? "Cancel"
                    : paper.total_score != null
                      ? "✏ Update Score"
                      : "📊 Score"}
                </button>
              </div>
            </div>

            {paper.total_score != null && scoringId !== paper.id && (
              <div style={{ marginTop: 12 }}>
                <div className="score-bars">
                  {[
                    ["Presentation Quality", paper.presentation_quality],
                    ["Communication", paper.communication],
                    ["Content Clarity", paper.content_clarity],
                    ["Audience Engagement", paper.audience_engagement],
                  ].map(([l, s]) => (
                    <div className="score-bar-row" key={l}>
                      <div className="score-bar-label">{l}</div>
                      <div className="score-bar-track">
                        <div
                          className="score-bar-fill"
                          style={{ width: `${(s || 0) * 10}%` }}
                        />
                      </div>
                      <div className="score-bar-val">{s}/10</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {msg[paper.id] && (
              <div
                className={`alert alert-${msg[paper.id].type === "success" ? "success" : "error"}`}
                style={{ marginTop: 12 }}
              >
                {msg[paper.id].text}
              </div>
            )}

            {scoringId === paper.id && (
              <div
                style={{
                  marginTop: 16,
                  borderTop: "1px solid #e2e8f0",
                  paddingTop: 16,
                }}
              >
                <h4 style={{ marginBottom: 16 }}>Presentation Scoring</h4>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "0 24px",
                  }}
                >
                  <Slider
                    label="Presentation Quality (0-10)"
                    name="presentation_quality"
                    value={form.presentation_quality}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        presentation_quality: +e.target.value,
                      })
                    }
                  />
                  <Slider
                    label="Communication (0-10)"
                    name="communication"
                    value={form.communication}
                    onChange={(e) =>
                      setForm({ ...form, communication: +e.target.value })
                    }
                  />
                  <Slider
                    label="Content Clarity (0-10)"
                    name="content_clarity"
                    value={form.content_clarity}
                    onChange={(e) =>
                      setForm({ ...form, content_clarity: +e.target.value })
                    }
                  />
                  <Slider
                    label="Audience Engagement (0-10)"
                    name="audience_engagement"
                    value={form.audience_engagement}
                    onChange={(e) =>
                      setForm({ ...form, audience_engagement: +e.target.value })
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
                      (form.presentation_quality +
                        form.communication +
                        form.content_clarity +
                        form.audience_engagement) /
                      4
                    ).toFixed(2)}
                    /10
                  </span>
                </div>
                <button
                  className="btn btn-success"
                  onClick={() => handleScore(paper.id)}
                >
                  ✓ Submit Score
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </Layout>
  );
}
