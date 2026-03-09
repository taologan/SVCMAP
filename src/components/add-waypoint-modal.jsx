import { useEffect, useState } from "react";
import { EMPTY_FORM } from "../constants";

const SUPPORTED_UPLOAD_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
  "mp3",
]);

function getFileExtension(fileName = "") {
  const trimmed = fileName.trim();
  if (!trimmed) return "";
  const dotIndex = trimmed.lastIndexOf(".");
  if (dotIndex < 0) return "";
  return trimmed.slice(dotIndex + 1).toLowerCase();
}

function isSupportedUploadFile(file) {
  if (!file) return false;
  const fileType = (file.type ?? "").toLowerCase();
  if (fileType.startsWith("image/")) return true;
  if (fileType === "audio/mpeg") return true;
  return SUPPORTED_UPLOAD_EXTENSIONS.has(getFileExtension(file.name));
}

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
    setForm((current) => ({ ...current, files: fileList }));
    if (!fileList.length) {
      setFormError("");
      return;
    }

    const unsupportedFiles = fileList.filter((file) => !isSupportedUploadFile(file));
    if (unsupportedFiles.length) {
      const names = unsupportedFiles.map((file) => file.name).join(", ");
      setFormError(
        `Unsupported file type: ${names}. Please upload images or MP3 files only.`,
      );
      return;
    }
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
    const story = form.story.trim();
    const contactEmail = form.contactEmail.trim();
    const contactPhone = form.contactPhone.trim();

    if (!name || !story) {
      setFormError("Name and story are required.");
      return;
    }
    if (!contactEmail) {
      setFormError("Please provide an email address.");
      return;
    }
    const unsupportedFiles = form.files.filter((file) => !isSupportedUploadFile(file));
    if (unsupportedFiles.length) {
      const names = unsupportedFiles.map((file) => file.name).join(", ");
      setFormError(
        `Unsupported file type: ${names}. Please upload images or MP3 files only.`,
      );
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
              accept="image/*,audio/mpeg,.mp3"
              multiple
              onChange={handleFileChange}
            />
          </label>
          {form.files.length ? (
            <ul className="selected-files">
              {form.files.map((file) => (
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
