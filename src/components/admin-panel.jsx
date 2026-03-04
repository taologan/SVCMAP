function AdminPanel({ isOpen, userEmail, onClose }) {
  if (!isOpen) return null

  return (
    <div className="entity-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="entity-modal admin-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Admin panel"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="entity-modal-close" onClick={onClose}>
          Close
        </button>
        <p className="eyebrow">Admin</p>
        <h2>Admin Panel</h2>
        <div className="admin-panel-body">
          <p>
            Signed in as <strong>{userEmail ?? 'Unknown user'}</strong>
          </p>
          <p>This panel is intentionally empty for now.</p>
        </div>
      </section>
    </div>
  )
}

export default AdminPanel
