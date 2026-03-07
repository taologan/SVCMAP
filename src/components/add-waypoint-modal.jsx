function AddWaypointModal({
  isOpen,
  waypointForm,
  formError,
  isSavingWaypoint,
  onClose,
  onSubmit,
  onFieldChange,
  onFileChange,
  onStartCoordinatePicker,
}) {
  if (!isOpen) return null;

  return (
    <div className="entity-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="entity-modal form-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Add waypoint"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="entity-modal-close" onClick={onClose}>
          Close
        </button>
        <p className="eyebrow">New waypoint request</p>
        <h2>Add a Waypoint</h2>
        <form className="add-waypoint-form" onSubmit={onSubmit}>
          <label>
            Name
            <input
              name="name"
              type="text"
              value={waypointForm.name}
              onChange={onFieldChange}
              placeholder="Person or place name"
              required
            />
          </label>
          <label>
            Story
            <textarea
              name="story"
              value={waypointForm.story}
              onChange={onFieldChange}
              placeholder="Short story or description"
              rows={4}
              required
            />
          </label>
          <div className="coord-grid">
            <label>
              Latitude
              <input
                name="latitude"
                type="number"
                step="any"
                value={waypointForm.latitude}
                onChange={onFieldChange}
                placeholder="33.7490"
                required
              />
            </label>
            <label>
              Longitude
              <input
                name="longitude"
                type="number"
                step="any"
                value={waypointForm.longitude}
                onChange={onFieldChange}
                placeholder="-84.3880"
                required
              />
            </label>
          </div>
          <label>
            Contact email (optional)
            <input
              name="contactEmail"
              type="email"
              value={waypointForm.contactEmail}
              onChange={onFieldChange}
              placeholder="you@example.org"
            />
          </label>
          <label>
            Contact phone (optional)
            <input
              name="contactPhone"
              type="tel"
              value={waypointForm.contactPhone}
              onChange={onFieldChange}
              placeholder="404-555-1234"
            />
          </label>
          <p className="form-note">
            Add at least one contact method so you can check request status later.
          </p>
          <button
            type="button"
            className="pick-coord-btn"
            onClick={onStartCoordinatePicker}
          >
            Select coordinates on map
          </button>
          <label>
            Upload files
            <input type="file" accept="image/*" multiple onChange={onFileChange} />
          </label>
          {waypointForm.files.length ? (
            <ul className="selected-files">
              {waypointForm.files.map((file) => (
                <li key={`${file.name}-${file.size}`}>{file.name}</li>
              ))}
            </ul>
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <button type="submit" className="submit-btn" disabled={isSavingWaypoint}>
            {isSavingWaypoint ? "Saving to Firebase..." : "Save waypoint"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AddWaypointModal;
