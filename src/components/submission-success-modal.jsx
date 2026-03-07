function SubmissionSuccessModal({ isOpen, submissionReceipt, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="entity-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="entity-modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Submission successful"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="entity-modal-close" onClick={onClose}>
          Close
        </button>
        <p className="eyebrow">Submission received</p>
        <h2>Request submitted successfully</h2>
        <p>
          Thanks for your contribution. You can check your request status anytime using
          the same email or phone number you submitted.
        </p>
        {submissionReceipt?.name ? (
          <p>
            <strong>Submitted request:</strong> {submissionReceipt.name}
          </p>
        ) : null}
        <p>
          Status updates are available from the <strong>Check Request Status</strong>{" "}
          button.
        </p>
      </section>
    </div>
  );
}

export default SubmissionSuccessModal;
