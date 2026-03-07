function StatusLookupModal({
  isOpen,
  statusLookupForm,
  statusLookupError,
  hasStatusLookupAttempted,
  statusLookupResult,
  isCheckingStatusLookup,
  onClose,
  onFieldChange,
  onSubmit,
}) {
  if (!isOpen) return null;

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
        <form className="add-waypoint-form" onSubmit={onSubmit}>
          <label>
            Contact email (optional)
            <input
              name="contactEmail"
              type="email"
              value={statusLookupForm.contactEmail}
              onChange={onFieldChange}
              placeholder="you@example.org"
            />
          </label>
          <label>
            Contact phone (optional)
            <input
              name="contactPhone"
              type="tel"
              value={statusLookupForm.contactPhone}
              onChange={onFieldChange}
              placeholder="404-555-1234"
            />
          </label>
          <p className="form-note">
            Enter the same email or phone used when you submitted your request.
          </p>
          {statusLookupError ? <p className="form-error">{statusLookupError}</p> : null}
          {hasStatusLookupAttempted ? (
            <div className="lookup-result">
              {statusLookupResult.length === 0 ? (
                <p>No matching requests found.</p>
              ) : (
                <ul className="lookup-result-list">
                  {statusLookupResult.map((request) => (
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
            disabled={isCheckingStatusLookup}
          >
            {isCheckingStatusLookup ? "Checking..." : "Check status"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default StatusLookupModal;
