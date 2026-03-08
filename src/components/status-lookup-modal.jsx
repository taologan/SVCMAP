import { useEffect, useState } from "react";
import { EMPTY_STATUS_LOOKUP_FORM } from "../constants";

function StatusLookupModal({ isOpen, onClose, onLookup }) {
  const [form, setForm] = useState(EMPTY_STATUS_LOOKUP_FORM);
  const [error, setError] = useState("");
  const [result, setResult] = useState([]);
  const [isChecking, setIsChecking] = useState(false);
  const [hasAttempted, setHasAttempted] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_STATUS_LOOKUP_FORM);
    setError("");
    setResult([]);
    setIsChecking(false);
    setHasAttempted(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setHasAttempted(true);
    setError("");
    setResult([]);

    if (!form.contactEmail.trim() && !form.contactPhone.trim()) {
      setError("Please provide the email or phone used on submission.");
      return;
    }

    setIsChecking(true);
    try {
      const nextResult = await onLookup({
        contactEmail: form.contactEmail,
        contactPhone: form.contactPhone,
      });
      setResult(nextResult);
    } catch (lookupError) {
      setError(lookupError.message || "Could not find that request.");
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="entity-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="entity-modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Check request status"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="entity-modal-close" onClick={onClose}>
          Close
        </button>
        <p className="eyebrow">Status lookup</p>
        <h2>Check Request Status</h2>
        <form className="add-waypoint-form" onSubmit={handleSubmit}>
          <label>
            Contact email (optional)
            <input
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleFieldChange}
              placeholder="you@example.org"
            />
          </label>
          <label>
            Contact phone (optional)
            <input
              name="contactPhone"
              type="tel"
              value={form.contactPhone}
              onChange={handleFieldChange}
              placeholder="404-555-1234"
            />
          </label>
          <p className="form-note">
            Enter the same email or phone used when you submitted your request.
          </p>
          {error ? <p className="form-error">{error}</p> : null}
          {hasAttempted && !error ? (
            <div className="lookup-result">
              {result.length === 0 ? (
                <p>No matching requests found.</p>
              ) : (
                <ul className="lookup-result-list">
                  {result.map((request) => (
                    <li key={request.id}>
                      <p>
                        <strong>Status:</strong> {request.status}
                      </p>
                      {request.name ? (
                        <p>
                          <strong>Request name:</strong> {request.name}
                        </p>
                      ) : null}
                      {request.reviewNotes ? (
                        <p>
                          <strong>Review notes:</strong> {request.reviewNotes}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          <button
            type="submit"
            className="submit-btn"
            disabled={isChecking}
          >
            {isChecking ? "Checking..." : "Check status"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default StatusLookupModal;
