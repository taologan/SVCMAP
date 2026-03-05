import { useEffect, useMemo, useState } from "react";
import {
  approvePending,
  deleteEntry,
  denyPending,
  getAllEntriesForAdmin,
  getPending,
  updateEntry,
  updatePending,
} from "../firebase";

function coordinatesToText(coordinates = []) {
  return coordinates.map(([lat, lng]) => `${lat}, ${lng}`).join("\n");
}

function filesToText(uploadedFiles = []) {
  return uploadedFiles.join("\n");
}

function parseCoordinates(text) {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (!lines.length) {
    return { error: "At least one coordinate is required.", value: [] };
  }

  const coordinates = [];
  for (const line of lines) {
    const [latRaw, lngRaw] = line.split(",").map((part) => part.trim());
    const lat = Number(latRaw);
    const lng = Number(lngRaw);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return {
        error: `Invalid coordinate "${line}". Use "lat, lng" format.`,
        value: [],
      };
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return {
        error: `Coordinate out of range: "${line}".`,
        value: [],
      };
    }

    coordinates.push([lat, lng]);
  }

  return { error: "", value: coordinates };
}

function parseFiles(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function makeDraft(record) {
  return {
    id: record.id,
    type: record.type ?? "submission",
    name: record.name ?? "",
    summary: record.summary ?? "",
    dates: record.dates ?? "",
    coordinatesText: coordinatesToText(record.coordinates),
    uploadedFilesText: filesToText(record.uploadedFiles),
  };
}

function AdminPanel({ isOpen, userEmail, onClose, onEntriesChanged }) {
  const [activeTab, setActiveTab] = useState("pending");
  const [pendingItems, setPendingItems] = useState([]);
  const [entries, setEntries] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [pendingDraft, setPendingDraft] = useState(null);
  const [entryDraft, setEntryDraft] = useState(null);

  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const selectedPending = useMemo(
    () => pendingItems.find((item) => item.id === selectedPendingId) ?? null,
    [pendingItems, selectedPendingId],
  );

  const selectedEntry = useMemo(
    () => entries.find((item) => item.id === selectedEntryId) ?? null,
    [entries, selectedEntryId],
  );

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;

    const load = async () => {
      setIsLoading(true);
      setError("");
      setSuccessMessage("");
      try {
        const [pending, publishedEntries] = await Promise.all([
          getPending(),
          getAllEntriesForAdmin(),
        ]);
        if (!isMounted) return;

        setPendingItems(pending);
        setEntries(publishedEntries);

        const firstPendingId = pending[0]?.id ?? null;
        const firstEntryId = publishedEntries[0]?.id ?? null;

        setSelectedPendingId(firstPendingId);
        setPendingDraft(firstPendingId ? makeDraft(pending[0]) : null);

        setSelectedEntryId(firstEntryId);
        setEntryDraft(firstEntryId ? makeDraft(publishedEntries[0]) : null);
      } catch (loadError) {
        if (!isMounted) return;
        console.error("Failed to load admin data:", loadError);
        setError("Unable to load admin panel data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!selectedPending) {
      setPendingDraft(null);
      return;
    }

    setPendingDraft(makeDraft(selectedPending));
  }, [selectedPending]);

  useEffect(() => {
    if (!selectedEntry) {
      setEntryDraft(null);
      return;
    }

    setEntryDraft(makeDraft(selectedEntry));
  }, [selectedEntry]);

  if (!isOpen) return null;

  const setPendingField = (key, value) => {
    setPendingDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const setEntryField = (key, value) => {
    setEntryDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const buildPayloadFromDraft = (draft) => {
    if (!draft) return { error: "No record selected.", payload: null };
    const name = draft.name.trim();
    const summary = draft.summary.trim();
    if (!name || !summary) {
      return {
        error: "Name and summary are required.",
        payload: null,
      };
    }

    const parsedCoordinates = parseCoordinates(draft.coordinatesText);
    if (parsedCoordinates.error) {
      return { error: parsedCoordinates.error, payload: null };
    }

    return {
      error: "",
      payload: {
        type: draft.type.trim() || "submission",
        name,
        summary,
        dates: draft.dates.trim() || "Community submission",
        coordinates: parsedCoordinates.value,
        uploadedFiles: parseFiles(draft.uploadedFilesText),
      },
    };
  };

  const handleSavePending = async () => {
    const { error: payloadError, payload } = buildPayloadFromDraft(pendingDraft);
    if (payloadError) {
      setError(payloadError);
      setSuccessMessage("");
      return;
    }

    setIsSavingPending(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await updatePending({
        pendingId: pendingDraft.id,
        ...payload,
      });

      setPendingItems((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSuccessMessage("Pending request updated.");
    } catch (saveError) {
      console.error("Failed to update pending request:", saveError);
      setError("Could not save pending request changes.");
    } finally {
      setIsSavingPending(false);
    }
  };

  const handleApprovePending = async () => {
    const { error: payloadError, payload } = buildPayloadFromDraft(pendingDraft);
    if (payloadError) {
      setError(payloadError);
      setSuccessMessage("");
      return;
    }

    setIsApproving(true);
    setError("");
    setSuccessMessage("");
    try {
      const pendingId = pendingDraft.id;
      const approvedEntry = await approvePending({
        pendingId,
        reviewedBy: userEmail ?? null,
        updates: payload,
      });

      const remainingPending = pendingItems.filter((item) => item.id !== pendingId);
      setPendingItems(remainingPending);
      setEntries((current) => {
        const existingIndex = current.findIndex((item) => item.id === approvedEntry.id);
        if (existingIndex >= 0) {
          const next = [...current];
          next[existingIndex] = approvedEntry;
          return next;
        }
        return [approvedEntry, ...current];
      });

      setSelectedPendingId(remainingPending[0]?.id ?? null);
      setSelectedEntryId(approvedEntry.id);
      setActiveTab("entries");
      setSuccessMessage("Request approved and moved to entries.");
      onEntriesChanged?.();
    } catch (approveError) {
      console.error("Failed to approve pending request:", approveError);
      setError("Could not approve request.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleDenyPending = async () => {
    if (!pendingDraft) return;

    setIsDenying(true);
    setError("");
    setSuccessMessage("");
    try {
      await denyPending({
        pendingId: pendingDraft.id,
        reviewedBy: userEmail ?? null,
      });

      const remainingPending = pendingItems.filter((item) => item.id !== pendingDraft.id);
      setPendingItems(remainingPending);
      setSelectedPendingId(remainingPending[0]?.id ?? null);
      setSuccessMessage("Request denied.");
    } catch (denyError) {
      console.error("Failed to deny pending request:", denyError);
      setError("Could not deny request.");
    } finally {
      setIsDenying(false);
    }
  };

  const handleSaveEntry = async () => {
    const { error: payloadError, payload } = buildPayloadFromDraft(entryDraft);
    if (payloadError) {
      setError(payloadError);
      setSuccessMessage("");
      return;
    }

    setIsSavingEntry(true);
    setError("");
    setSuccessMessage("");
    try {
      const updated = await updateEntry({
        entryId: entryDraft.id,
        ...payload,
        source: "admin",
      });

      setEntries((current) =>
        current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
      );
      setSuccessMessage("Entry updated.");
      onEntriesChanged?.();
    } catch (saveError) {
      console.error("Failed to update entry:", saveError);
      setError("Could not save entry changes.");
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleOpenDeleteConfirm = () => {
    if (!entryDraft) return;
    setError("");
    setSuccessMessage("");
    setIsDeleteConfirmOpen(true);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteEntry = async () => {
    if (!entryDraft) return;

    setIsDeletingEntry(true);
    setError("");
    setSuccessMessage("");
    try {
      const deletingId = entryDraft.id;
      await deleteEntry(deletingId);

      const remainingEntries = entries.filter((item) => item.id !== deletingId);
      setEntries(remainingEntries);
      setSelectedEntryId(remainingEntries[0]?.id ?? null);
      setIsDeleteConfirmOpen(false);
      setSuccessMessage("Entry deleted permanently.");
      onEntriesChanged?.();
    } catch (deleteError) {
      console.error("Failed to delete entry:", deleteError);
      setError("Could not delete entry.");
    } finally {
      setIsDeletingEntry(false);
    }
  };

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
        <h2>Waypoint Moderation</h2>
        <div className="admin-panel-body">
          <p>
            Signed in as <strong>{userEmail ?? "Unknown user"}</strong>
          </p>
          <div className="admin-tab-row">
            <button
              type="button"
              className={activeTab === "pending" ? "admin-tab active" : "admin-tab"}
              onClick={() => setActiveTab("pending")}
            >
              Pending ({pendingItems.length})
            </button>
            <button
              type="button"
              className={activeTab === "entries" ? "admin-tab active" : "admin-tab"}
              onClick={() => setActiveTab("entries")}
            >
              Entries ({entries.length})
            </button>
          </div>

          {isLoading ? <p>Loading admin data...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {successMessage ? <p className="admin-success">{successMessage}</p> : null}

          {activeTab === "pending" ? (
            <div className="admin-grid">
              <div className="admin-list" role="listbox" aria-label="Pending requests">
                {pendingItems.length === 0 ? <p>No pending requests.</p> : null}
                {pendingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      item.id === selectedPendingId
                        ? "admin-list-item active"
                        : "admin-list-item"
                    }
                    onClick={() => setSelectedPendingId(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.type}</span>
                  </button>
                ))}
              </div>

              {pendingDraft ? (
                <div className="admin-editor">
                  <label>
                    Name
                    <input
                      type="text"
                      value={pendingDraft.name}
                      onChange={(event) => setPendingField("name", event.target.value)}
                    />
                  </label>
                  <label>
                    Type
                    <input
                      type="text"
                      value={pendingDraft.type}
                      onChange={(event) => setPendingField("type", event.target.value)}
                    />
                  </label>
                  <label>
                    Dates
                    <input
                      type="text"
                      value={pendingDraft.dates}
                      onChange={(event) => setPendingField("dates", event.target.value)}
                    />
                  </label>
                  <label>
                    Summary
                    <textarea
                      rows={4}
                      value={pendingDraft.summary}
                      onChange={(event) => setPendingField("summary", event.target.value)}
                    />
                  </label>
                  <label>
                    Coordinates (one per line: lat, lng)
                    <textarea
                      rows={4}
                      value={pendingDraft.coordinatesText}
                      onChange={(event) =>
                        setPendingField("coordinatesText", event.target.value)
                      }
                    />
                  </label>
                  <label>
                    Uploaded files (one per line)
                    <textarea
                      rows={3}
                      value={pendingDraft.uploadedFilesText}
                      onChange={(event) =>
                        setPendingField("uploadedFilesText", event.target.value)
                      }
                    />
                  </label>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={handleSavePending}
                      disabled={isSavingPending || isApproving || isDenying}
                    >
                      {isSavingPending ? "Saving..." : "Save Edits"}
                    </button>
                    <button
                      type="button"
                      className="admin-approve-btn"
                      onClick={handleApprovePending}
                      disabled={isApproving || isSavingPending || isDenying}
                    >
                      {isApproving ? "Approving..." : "Approve"}
                    </button>
                    <button
                      type="button"
                      className="admin-deny-btn"
                      onClick={handleDenyPending}
                      disabled={isDenying || isSavingPending || isApproving}
                    >
                      {isDenying ? "Denying..." : "Deny"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="admin-grid">
              <div className="admin-list" role="listbox" aria-label="Published entries">
                {entries.length === 0 ? <p>No entries available.</p> : null}
                {entries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      item.id === selectedEntryId
                        ? "admin-list-item active"
                        : "admin-list-item"
                    }
                    onClick={() => setSelectedEntryId(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>{item.type}</span>
                  </button>
                ))}
              </div>

              {entryDraft ? (
                <div className="admin-editor">
                  <label>
                    Name
                    <input
                      type="text"
                      value={entryDraft.name}
                      onChange={(event) => setEntryField("name", event.target.value)}
                    />
                  </label>
                  <label>
                    Type
                    <input
                      type="text"
                      value={entryDraft.type}
                      onChange={(event) => setEntryField("type", event.target.value)}
                    />
                  </label>
                  <label>
                    Dates
                    <input
                      type="text"
                      value={entryDraft.dates}
                      onChange={(event) => setEntryField("dates", event.target.value)}
                    />
                  </label>
                  <label>
                    Summary
                    <textarea
                      rows={4}
                      value={entryDraft.summary}
                      onChange={(event) => setEntryField("summary", event.target.value)}
                    />
                  </label>
                  <label>
                    Coordinates (one per line: lat, lng)
                    <textarea
                      rows={4}
                      value={entryDraft.coordinatesText}
                      onChange={(event) => setEntryField("coordinatesText", event.target.value)}
                    />
                  </label>
                  <label>
                    Uploaded files (one per line)
                    <textarea
                      rows={3}
                      value={entryDraft.uploadedFilesText}
                      onChange={(event) =>
                        setEntryField("uploadedFilesText", event.target.value)
                      }
                    />
                  </label>
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="submit-btn"
                      onClick={handleSaveEntry}
                      disabled={isSavingEntry || isDeletingEntry}
                    >
                      {isSavingEntry ? "Saving..." : "Save Entry"}
                    </button>
                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={handleOpenDeleteConfirm}
                      disabled={isSavingEntry || isDeletingEntry}
                    >
                      Delete Entry
                    </button>
                  </div>
                  {isDeleteConfirmOpen ? (
                    <div
                      className="admin-delete-confirm"
                      role="alertdialog"
                      aria-modal="true"
                      aria-label="Confirm permanent deletion"
                    >
                      <p>
                        Delete <strong>{entryDraft.name || "this entry"}</strong> permanently?
                      </p>
                      <p>This action is final and cannot be undone.</p>
                      <div className="admin-actions">
                        <button
                          type="button"
                          className="admin-delete-btn"
                          onClick={handleDeleteEntry}
                          disabled={isDeletingEntry}
                        >
                          {isDeletingEntry ? "Deleting..." : "Yes, delete permanently"}
                        </button>
                        <button
                          type="button"
                          className="submit-btn"
                          onClick={handleCancelDelete}
                          disabled={isDeletingEntry}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default AdminPanel;
