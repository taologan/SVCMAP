import { useEffect, useState } from "react";
import { EMPTY_FORM } from "../constants";
import {
  SUPPORTED_UPLOAD_ACCEPT,
  isSupportedUploadFile,
  getUnsupportedUploadMessage,
} from "../utils/upload-files";

function AddWaypointModal({
  isOpen,
  onClose,
  onSubmitWaypoint,
  onSubmissionSuccess,
  onRequestCoordinatePick,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSavingWaypoint, setIsSavingWaypoint] = useState(false);
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false);
  const [isTemporarilyHidden, setIsTemporarilyHidden] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setForm(EMPTY_FORM);
    setFormError("");
    setIsSavingWaypoint(false);
    setIsPickingCoordinates(false);
    setIsTemporarilyHidden(false);
  }, [isOpen]);

  if (!isOpen || isTemporarilyHidden) return null;

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    if (!fileList.length) return;

    const supportedFiles = fileList.filter((file) => isSupportedUploadFile(file));

    setForm((current) => ({
      ...current,
      files: [...current.files, ...supportedFiles],
    }));

    const unsupportedMessage = getUnsupportedUploadMessage(fileList);
    if (unsupportedMessage) {
      setFormError(unsupportedMessage);
      event.target.value = "";
      return;
    }

    setFormError("");
    event.target.value = "";
  };

  const handleRemoveFile = (fileIndex) => {
    setForm((current) => ({
      ...current,
      files: current.files.filter((_, index) => index !== fileIndex),
    }));
    setFormError("");
  };

  const handlePickCoordinates = async () => {
    setFormError("");
    setIsPickingCoordinates(true);
    setIsTemporarilyHidden(true);
    const picked = await onRequestCoordinatePick?.();
    setIsTemporarilyHidden(false);
    setIsPickingCoordinates(false);
    if (!picked) return;
    setForm((current) => ({
      ...current,
      latitude: picked.latitude,
      longitude: picked.longitude,
      coordinates: [
        ...current.coordinates,
        [Number(picked.latitude), Number(picked.longitude)],
      ],
    }));
  };

  const handleAddManualCoordinate = () => {
    const latitude = Number(form.latitude);
    const longitude = Number(form.longitude);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setFormError("Latitude and longitude must be valid numbers.");
      return;
    }
    if (
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      setFormError("Coordinates are out of range.");
      return;
    }

    setFormError("");
    setForm((current) => ({
      ...current,
      latitude: "",
      longitude: "",
      coordinates: [...current.coordinates, [latitude, longitude]],
    }));
  };

  const handleRemoveCoordinate = (coordinateIndex) => {
    setForm((current) => ({
      ...current,
      coordinates: current.coordinates.filter((_, index) => index !== coordinateIndex),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = form.name.trim();
    const role = form.role.trim();
    const story = form.story.trim();
    const contactEmail = form.contactEmail.trim();
    const contactPhone = form.contactPhone.trim();

    if (!name || !role || !story) {
      setFormError("Name, role, and story are required.");
      return;
    }
    if (!contactEmail) {
      setFormError("Please provide an email address.");
      return;
    }
    const unsupportedMessage = getUnsupportedUploadMessage(form.files);
    if (unsupportedMessage) {
      setFormError(unsupportedMessage);
      return;
    }
    if (!form.coordinates.length) {
      setFormError("Add at least one coordinate for this request.");
      return;
    }

    setFormError("");
    setIsSavingWaypoint(true);
    try {
      const submissionReceipt = await onSubmitWaypoint({
        name,
        role,
        story,
        coordinates: form.coordinates,
        contactEmail,
        contactPhone,
        files: form.files,
      });
      onClose?.();
      onSubmissionSuccess?.(submissionReceipt);
    } catch (error) {
      setFormError(error?.message || "Could not save to Firebase. Please try again.");
    } finally {
      setIsSavingWaypoint(false);
    }
  };

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
        <form className="add-waypoint-form" onSubmit={handleSubmit}>
          <label>
            Name
            <input
              name="name"
              type="text"
              value={form.name}
              onChange={handleFieldChange}
              placeholder="Person or place name"
              required
            />
          </label>
          <label>
            Role
            <input
              name="role"
              type="text"
              value={form.role}
              onChange={handleFieldChange}
              placeholder="Civil rights leader, educator, family role, etc."
              required
            />
          </label>
          <label>
            Story
            <textarea
              name="story"
              value={form.story}
              onChange={handleFieldChange}
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
                value={form.latitude}
                onChange={handleFieldChange}
                placeholder="33.7490"
              />
            </label>
            <label>
              Longitude
              <input
                name="longitude"
                type="number"
                step="any"
                value={form.longitude}
                onChange={handleFieldChange}
                placeholder="-84.3880"
              />
            </label>
          </div>
          <div className="coord-actions">
            <button
              type="button"
              className="pick-coord-btn manual"
              onClick={handleAddManualCoordinate}
            >
              Add manual coordinate
            </button>
            <button
              type="button"
              className="pick-coord-btn"
              onClick={handlePickCoordinates}
              disabled={isPickingCoordinates}
            >
              {isPickingCoordinates
                ? "Click on the map to add a coordinate..."
                : "Select coordinates on map"}
            </button>
          </div>
          {form.coordinates.length ? (
            <ul className="selected-coordinates">
              {form.coordinates.map(([lat, lng], index) => (
                <li key={`${lat}-${lng}-${index}`}>
                  <span>
                    {lat.toFixed(6)}, {lng.toFixed(6)}
                  </span>
                  <button
                    type="button"
                    className="remove-coordinate-btn"
                    onClick={() => handleRemoveCoordinate(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="form-note">
              Add one or more coordinates. You can mix manual input and map picks.
            </p>
          )}
          <label>
            Contact email
            <input
              name="contactEmail"
              type="email"
              value={form.contactEmail}
              onChange={handleFieldChange}
              placeholder="you@example.org"
              required
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
            Email is required for status lookup. Phone number is optional.
          </p>
          <label>
            Upload files
            <input
              type="file"
              accept={SUPPORTED_UPLOAD_ACCEPT}
              multiple
              onChange={handleFileChange}
            />
          </label>
          <p className="form-note">
            You can add multiple images or MP3 files to a single request.
          </p>
          {form.files.length ? (
            <ul className="selected-upload-list">
              {form.files.map((file, index) => (
                <li
                  key={`${file.name}-${file.size}-${file.lastModified}-${index}`}
                  className="selected-upload-item"
                >
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="remove-upload-btn"
                    onClick={() => handleRemoveFile(index)}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {formError ? <p className="form-error">{formError}</p> : null}
          <button type="submit" className="submit-btn" disabled={isSavingWaypoint}>
            {isSavingWaypoint ? "Saving..." : "Save waypoint"}
          </button>
        </form>
      </section>
    </div>
  );
}

export default AddWaypointModal;
