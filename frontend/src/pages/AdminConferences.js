import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import {
  getAllConferencesAdmin,
  createConference,
  publishConference,
} from "../services/api";

export default function AdminConferences() {
  const [conferences, setConferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    topics: "",
    venue: "",
    submission_deadline: "",
  });
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const load = () =>
    getAllConferencesAdmin()
      .then((r) => setConferences(r.data))
      .finally(() => setLoading(false));
  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      await createConference(form);
      setMsg("Conference created!");
      setShowForm(false);
      setForm({
        title: "",
        description: "",
        topics: "",
        venue: "",
        submission_deadline: "",
      });
      load();
    } catch (err) {
      setErr(err.response?.data?.message || "Failed");
    }
  };

  const handlePublish = async (id) => {
    try {
      await publishConference(id);
      load();
    } catch (err) {
      alert(err.response?.data?.message || "Failed");
    }
  };

  return (
    <Layout>
      <div className="page-header">
        <h1>Manage Conferences</h1>
      </div>
      {msg && <div className="alert alert-success">{msg}</div>}
      <div style={{ marginBottom: 16 }}>
        <button
          className="btn btn-accent"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? "✕ Cancel" : "+ Create Conference"}
        </button>
      </div>
      {showForm && (
        <div className="card" style={{ maxWidth: 600, marginBottom: 24 }}>
          <h3 style={{ marginBottom: 16 }}>New Conference</h3>
          {err && <div className="alert alert-error">{err}</div>}
          <form onSubmit={handleCreate}>
            <div className="form-group">
              <label>Title *</label>
              <input
                className="form-control"
                required
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-control"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
              />
            </div>
            <div className="form-group">
              <label>Topics (comma-separated)</label>
              <input
                className="form-control"
                placeholder="AI, Machine Learning, NLP"
                value={form.topics}
                onChange={(e) => setForm({ ...form, topics: e.target.value })}
              />
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
              }}
            >
              <div className="form-group">
                <label>Venue</label>
                <input
                  className="form-control"
                  value={form.venue}
                  onChange={(e) => setForm({ ...form, venue: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Submission Deadline</label>
                <input
                  className="form-control"
                  type="date"
                  value={form.submission_deadline}
                  onChange={(e) =>
                    setForm({ ...form, submission_deadline: e.target.value })
                  }
                />
              </div>
            </div>
            <button className="btn btn-primary" type="submit">
              Create Conference
            </button>
          </form>
        </div>
      )}
      {loading ? (
        <div className="spinner" />
      ) : (
        <div className="card">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Venue</th>
                  <th>Deadline</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {conferences.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <strong>{c.title}</strong>
                    </td>
                    <td>{c.venue || "—"}</td>
                    <td>
                      {c.submission_deadline
                        ? new Date(c.submission_deadline).toLocaleDateString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`badge badge-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      {c.status === "draft" && (
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handlePublish(c.id)}
                        >
                          🌐 Publish
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
