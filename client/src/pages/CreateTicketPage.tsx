import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext.js";

interface OptionItem {
  id: number;
  name: string;
}

export const CreateTicketPage: React.FC = () => {
  const { currentRequester } = useRequester();
  const navigate = useNavigate();

  const [categories, setCategories] = useState<OptionItem[]>([]);
  const [systems, setSystems] = useState<OptionItem[]>([]);

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [relatedSystemId, setRelatedSystemId] = useState<number | "">("");
  const [requestedPriority, setRequestedPriority] = useState("MEDIUM");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Fetch Categories
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data: OptionItem[]) => {
        setCategories(data);
        if (data.length > 0) setCategoryId(data[0].id);
      })
      .catch((err) => console.error("Error fetching categories:", err));

    // Fetch Active Systems
    fetch("/api/systems")
      .then((res) => res.json())
      .then((data: OptionItem[]) => {
        setSystems(data);
        if (data.length > 0) setRelatedSystemId(data[0].id);
      })
      .catch((err) => console.error("Error fetching systems:", err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!summary.trim() || !description.trim()) {
      setError("Please fill in both summary and description.");
      return;
    }

    if (!categoryId || !relatedSystemId) {
      setError("Please select both a Category and a Related System.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          summary: summary.trim(),
          description: description.trim(),
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
          requesterId: currentRequester?.id,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to create ticket");
      }

      navigate("/tickets");
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container py-4" style={{ maxWidth: 680 }}>
      <div className="card shadow-sm border-0">
        <div className="card-header bg-success text-white py-3">
          <h2 className="h5 mb-0 fw-bold">Create IT Support Ticket</h2>
        </div>
        <div className="card-body p-4">
          {error && (
            <div className="alert alert-danger py-2 mb-3" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="summary" className="form-label fw-semibold">
                Summary <span className="text-danger">*</span>
              </label>
              <input
                id="summary"
                type="text"
                className="form-control"
                placeholder="Brief summary of the issue"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                required
              />
            </div>

            <div className="row g-3 mb-3">
              <div className="col-md-6">
                <label htmlFor="category" className="form-label fw-semibold">
                  Category <span className="text-danger">*</span>
                </label>
                <select
                  id="category"
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(Number(e.target.value))}
                  required
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-md-6">
                <label htmlFor="system" className="form-label fw-semibold">
                  Related System <span className="text-danger">*</span>
                </label>
                <select
                  id="system"
                  className="form-select"
                  value={relatedSystemId}
                  onChange={(e) => setRelatedSystemId(Number(e.target.value))}
                  required
                >
                  {systems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="priority" className="form-label fw-semibold">
                Priority
              </label>
              <select
                id="priority"
                className="form-select"
                value={requestedPriority}
                onChange={(e) => setRequestedPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
              </select>
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="form-label fw-semibold">
                Description <span className="text-danger">*</span>
              </label>
              <textarea
                id="description"
                className="form-control"
                rows={4}
                placeholder="Detailed description of the issue..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={() => navigate("/tickets")}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-success fw-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Creating..." : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};