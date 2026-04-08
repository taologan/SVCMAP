import { useEffect, useMemo, useState } from "react";
import {
  approvePending,
  createEntry,
  deleteEntry,
  denyPending,
  getAllEntriesForAdmin,
  getPending,
  updateCommunitySubmissionsSetting,
  updateEntry,
  updatePending,
} from "../firebase";
import {
  SUPPORTED_UPLOAD_ACCEPT,
  getUnsupportedUploadMessage,
  isSupportedUploadFile,
} from "../utils/upload-files";

function coordinatesToText(coordinates = []) {
  return coordinates.map(([lat, lng]) => `${lat}, ${lng}`).join("\n");
}

function filesToText(uploadedFiles = []) {
  return uploadedFiles.join("\n");
}

function externalLinksToText(externalLinks = []) {
  return externalLinks.map((link) => `${link.label} | ${link.url}`).join("\n");
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

function parseExternalLinks(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [labelPart, urlPart] = line.split("|").map((part) => part.trim());
      if (!urlPart) {
        return { label: labelPart, url: labelPart };
      }
      return { label: labelPart || urlPart, url: urlPart };
    })
    .filter((link) => link.url);
}

function makeDraft(record = {}) {
  return {
    id: record.id ?? null,
    name: record.name ?? "",
    role: record.role ?? "",
    storyType: record.storyType ?? "",
    neighborhood: record.neighborhood ?? "",
    graveLocation: record.graveLocation ?? "",
    sourceLabel: record.sourceLabel ?? "",
    sourceUrl: record.sourceUrl ?? "",
    summary: record.summary ?? "",
    coordinatesText: coordinatesToText(record.coordinates),
    uploadedFilesText: filesToText(record.uploadedFiles),
    externalLinksText: externalLinksToText(record.externalLinks),
  };
}

function appendCoordinateLine(existingText, coordinate) {
  const nextLine = `${coordinate.latitude}, ${coordinate.longitude}`;
  const trimmed = (existingText ?? "").trim();
  return trimmed ? `${trimmed}\n${nextLine}` : nextLine;
}

function buildPayloadFromDraft(draft, newFiles = []) {
  if (!draft) return { error: "No record selected.", payload: null };

  const name = draft.name.trim();
  const role = draft.role.trim();
  const summary = draft.summary.trim();

  if (!name || !role || !summary) {
    return {
      error: "Name, role, and summary are required.",
      payload: null,
    };
  }

  const unsupportedMessage = getUnsupportedUploadMessage(newFiles);
  if (unsupportedMessage) {
    return { error: unsupportedMessage, payload: null };
  }

  const parsedCoordinates = parseCoordinates(draft.coordinatesText);
  if (parsedCoordinates.error) {
    return { error: parsedCoordinates.error, payload: null };
  }

  return {
    error: "",
    payload: {
      name,
      role,
      storyType: draft.storyType.trim(),
      neighborhood: draft.neighborhood.trim(),
      graveLocation: draft.graveLocation.trim(),
      sourceLabel: draft.sourceLabel.trim(),
      sourceUrl: draft.sourceUrl.trim(),
      summary,
      coordinates: parsedCoordinates.value,
      uploadedFiles: [...parseFiles(draft.uploadedFilesText), ...newFiles],
      externalLinks: parseExternalLinks(draft.externalLinksText),
    },
  };
}

const EMPTY_ENTRY_DRAFT = makeDraft();

function AdminPanel({
  isOpen,
  userEmail,
  onClose,
  onEntriesChanged,
  allowCommunitySubmissions,
  onRequestCoordinatePick,
}) {
  const [activeTab, setActiveTab] = useState("entries");
  const [pendingItems, setPendingItems] = useState([]);
  const [entries, setEntries] = useState([]);
  const [entrySearchQuery, setEntrySearchQuery] = useState("");
  const [selectedPendingId, setSelectedPendingId] = useState(null);
  const [selectedEntryId, setSelectedEntryId] = useState(null);
  const [entryMode, setEntryMode] = useState("edit");
  const [pendingDraft, setPendingDraft] = useState(null);
  const [entryDraft, setEntryDraft] = useState(EMPTY_ENTRY_DRAFT);
  const [entryNewFiles, setEntryNewFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSavingPending, setIsSavingPending] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isDenying, setIsDenying] = useState(false);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  const [isDeletingEntry, setIsDeletingEntry] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isSavingCommunitySetting, setIsSavingCommunitySetting] = useState(false);
  const [pickingCoordinatesTarget, setPickingCoordinatesTarget] = useState(null);

  const selectedPending = useMemo(
    () => pendingItems.find((item) => item.id === selectedPendingId) ?? null,
    [pendingItems, selectedPendingId],
  );

  const filteredEntries = useMemo(() => {
    const normalizedQuery = entrySearchQuery.trim().toLowerCase();
    if (!normalizedQuery) return entries;

    return entries.filter((item) =>
      [
        item.name,
        item.role,
        item.storyType,
        item.neighborhood,
        item.graveLocation,
      ]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [entries, entrySearchQuery]);

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
          allowCommunitySubmissions ? getPending() : Promise.resolve([]),
          getAllEntriesForAdmin(),
        ]);
        if (!isMounted) return;

        setPendingItems(pending);
        setEntries(publishedEntries);
        setSelectedPendingId(pending[0]?.id ?? null);
        setPendingDraft(pending[0] ? makeDraft(pending[0]) : null);
        setSelectedEntryId(publishedEntries[0]?.id ?? null);
        setEntryDraft(publishedEntries[0] ? makeDraft(publishedEntries[0]) : EMPTY_ENTRY_DRAFT);
        setEntryMode(publishedEntries[0] ? "edit" : "create");
        setEntrySearchQuery("");
      } catch (loadError) {
        if (!isMounted) return;
        console.error("Failed to load admin data:", loadError);
        setError("Unable to load story management data.");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [allowCommunitySubmissions, isOpen]);

  useEffect(() => {
    if (!selectedPending) {
      setPendingDraft(null);
      return;
    }

    setPendingDraft(makeDraft(selectedPending));
  }, [selectedPending]);

  useEffect(() => {
    if (entryMode !== "edit") return;
    if (!selectedEntry) {
      setEntryDraft(EMPTY_ENTRY_DRAFT);
      setEntryNewFiles([]);
      return;
    }

    setEntryDraft(makeDraft(selectedEntry));
    setEntryNewFiles([]);
  }, [entryMode, selectedEntry]);

  if (!isOpen) return null;

  const setPendingField = (key, value) => {
    setPendingDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const setEntryField = (key, value) => {
    setEntryDraft((current) => ({ ...current, [key]: value }));
  };

  const handleEntryFileChange = (event) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    if (!fileList.length) return;

    const supportedFiles = fileList.filter((file) => isSupportedUploadFile(file));
    setEntryNewFiles((current) => [...current, ...supportedFiles]);

    const unsupportedMessage = getUnsupportedUploadMessage(fileList);
    if (unsupportedMessage) {
      setError(unsupportedMessage);
      setSuccessMessage("");
      event.target.value = "";
      return;
    }

    setError("");
    event.target.value = "";
  };

  const handleRemoveEntryFile = (fileIndex) => {
    setEntryNewFiles((current) => current.filter((_, index) => index !== fileIndex));
    setError("");
  };

  const handleNewEntry = () => {
    setEntryMode("create");
    setSelectedEntryId(null);
    setEntryDraft(EMPTY_ENTRY_DRAFT);
    setEntryNewFiles([]);
    setError("");
    setSuccessMessage("");
    setIsDeleteConfirmOpen(false);
  };

  const handleSelectEntry = (entryId) => {
    setEntryMode("edit");
    setSelectedEntryId(entryId);
    setError("");
    setSuccessMessage("");
    setIsDeleteConfirmOpen(false);
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
      setSuccessMessage("Pending story updated.");
    } catch (saveError) {
      console.error("Failed to update pending request:", saveError);
      setError("Could not save pending story changes.");
    } finally {
      setIsSavingPending(false);
    }
  };

  const handleCommunitySubmissionToggle = async () => {
    setIsSavingCommunitySetting(true);
    setError("");
    setSuccessMessage("");
    try {
      const nextValue = !allowCommunitySubmissions;
      await updateCommunitySubmissionsSetting({
        allowCommunitySubmissions: nextValue,
        updatedBy: userEmail ?? null,
      });
      setSuccessMessage(
        nextValue
          ? "Community submissions are now enabled."
          : "Community submissions are now paused.",
      );
      if (nextValue) {
        setActiveTab("pending");
      } else {
        setActiveTab("entries");
      }
    } catch (toggleError) {
      console.error("Failed to update community submission setting:", toggleError);
      setError("Could not update the community submissions setting.");
    } finally {
      setIsSavingCommunitySetting(false);
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
      setEntries((current) => [approvedEntry, ...current.filter((item) => item.id !== pendingId)]);
      setSelectedPendingId(remainingPending[0]?.id ?? null);
      setPendingDraft(remainingPending[0] ? makeDraft(remainingPending[0]) : null);
      setEntryMode("edit");
      setSelectedEntryId(approvedEntry.id);
      setSuccessMessage("Story approved and published.");
      setActiveTab("entries");
      onEntriesChanged?.();
    } catch (approveError) {
      console.error("Failed to approve pending request:", approveError);
      setError("Could not approve story.");
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
      const denyResult = await denyPending({
        pendingId: pendingDraft.id,
        reviewedBy: userEmail ?? null,
      });

      const remainingPending = pendingItems.filter((item) => item.id !== pendingDraft.id);
      setPendingItems(remainingPending);
      setSelectedPendingId(remainingPending[0]?.id ?? null);
      setPendingDraft(remainingPending[0] ? makeDraft(remainingPending[0]) : null);
      setSuccessMessage(
        denyResult?.alreadyProcessed
          ? "Story was already processed elsewhere and removed from the pending list."
          : "Pending story denied.",
      );
    } catch (denyError) {
      console.error("Failed to deny pending request:", denyError);
      setError("Could not deny story.");
    } finally {
      setIsDenying(false);
    }
  };

  const handleSaveEntry = async () => {
    const { error: payloadError, payload } = buildPayloadFromDraft(entryDraft, entryNewFiles);
    if (payloadError) {
      setError(payloadError);
      setSuccessMessage("");
      return;
    }

    setIsSavingEntry(true);
    setError("");
    setSuccessMessage("");
    try {
      if (entryMode === "create") {
        const created = await createEntry(payload);
        setEntries((current) => [created, ...current]);
        setSelectedEntryId(created.id);
        setEntryMode("edit");
        setEntryDraft(makeDraft(created));
        setSuccessMessage("New SVC story published.");
      } else {
        const updated = await updateEntry({
          entryId: entryDraft.id,
          ...payload,
        });
        setEntries((current) =>
          current.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)),
        );
        setEntryDraft(makeDraft({ ...selectedEntry, ...payload, id: entryDraft.id }));
        setSuccessMessage("Published story updated.");
      }

      setEntryNewFiles([]);
      onEntriesChanged?.();
    } catch (saveError) {
      console.error("Failed to save entry:", saveError);
      setError(entryMode === "create" ? "Could not create story." : "Could not save story.");
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleDeleteEntry = async () => {
    if (!entryDraft.id) return;

    setIsDeletingEntry(true);
    setError("");
    setSuccessMessage("");
    try {
      const deletingId = entryDraft.id;
      await deleteEntry(deletingId);

      const remainingEntries = entries.filter((item) => item.id !== deletingId);
      setEntries(remainingEntries);
      setSelectedEntryId(remainingEntries[0]?.id ?? null);
      setEntryDraft(remainingEntries[0] ? makeDraft(remainingEntries[0]) : EMPTY_ENTRY_DRAFT);
      setEntryMode(remainingEntries[0] ? "edit" : "create");
      setIsDeleteConfirmOpen(false);
      setSuccessMessage("Story deleted permanently.");
      onEntriesChanged?.();
    } catch (deleteError) {
      console.error("Failed to delete entry:", deleteError);
      setError("Could not delete story.");
    } finally {
      setIsDeletingEntry(false);
    }
  };

  const handlePickCoordinates = async (target) => {
    setError("");
    setSuccessMessage("");
    setPickingCoordinatesTarget(target);
    try {
      const picked = await onRequestCoordinatePick?.();
      if (!picked) return;

      if (target === "pending") {
        setPendingField(
          "coordinatesText",
          appendCoordinateLine(pendingDraft?.coordinatesText, picked),
        );
        return;
      }

      setEntryField(
        "coordinatesText",
        appendCoordinateLine(entryDraft?.coordinatesText, picked),
      );
    } finally {
      setPickingCoordinatesTarget(null);
    }
  };

  const renderEditorFields = (
    draft,
    setField,
    options = {},
  ) => (
    <div className="admin-editor">
      <label>
        Name
        <input
          value={draft?.name ?? ""}
          onChange={(event) => setField("name", event.target.value)}
          placeholder="Story subject or place"
        />
      </label>
      <label>
        Role
        <input
          value={draft?.role ?? ""}
          onChange={(event) => setField("role", event.target.value)}
          placeholder="Educator, organizer, family figure, landmark..."
        />
      </label>
      {/* <label>
        Story type
        <input
          value={draft?.storyType ?? ""}
          onChange={(event) => setField("storyType", event.target.value)}
          placeholder="Community memory, burial record, landmark..."
        />
      </label>
      <label>
        Atlanta connection
        <input
          value={draft?.neighborhood ?? ""}
          onChange={(event) => setField("neighborhood", event.target.value)}
          placeholder="Neighborhood, institution, route, or place"
        />
      </label> */}
      <label>
        Burial location / grave note
        <input
          value={draft?.graveLocation ?? ""}
          onChange={(event) => setField("graveLocation", event.target.value)}
          placeholder="Section, lot, or navigation clue"
        />
      </label>
      {/* <label>
        Primary resource label
        <input
          value={draft?.sourceLabel ?? ""}
          onChange={(event) => setField("sourceLabel", event.target.value)}
          placeholder="Foundation biography, archive page, exhibit"
        />
      </label>
      <label>
        Primary resource URL
        <input
          value={draft?.sourceUrl ?? ""}
          onChange={(event) => setField("sourceUrl", event.target.value)}
          placeholder="https://"
        />
      </label> */}
      <label>
        Story summary
        <textarea
          rows={5}
          value={draft?.summary ?? ""}
          onChange={(event) => setField("summary", event.target.value)}
          placeholder="Core story text shown in the public details drawer"
        />
      </label>
      <label>
        Coordinates
        <textarea
          rows={4}
          value={draft?.coordinatesText ?? ""}
          onChange={(event) => setField("coordinatesText", event.target.value)}
          placeholder="33.7490, -84.3880"
        />
      </label>
      <div className="admin-coordinate-actions">
        <button
          type="button"
          className="pick-coord-btn"
          onClick={() => handlePickCoordinates(options.coordinateTarget ?? "entry")}
          disabled={pickingCoordinatesTarget === (options.coordinateTarget ?? "entry")}
        >
          {pickingCoordinatesTarget === (options.coordinateTarget ?? "entry")
            ? "Click on the map to add a coordinate..."
            : "Pick coordinate from map"}
        </button>
      </div>
      <label>
        Additional links
        <textarea
          rows={4}
          value={draft?.externalLinksText ?? ""}
          onChange={(event) => setField("externalLinksText", event.target.value)}
          placeholder="Label | https://example.com"
        />
      </label>
      <label>
        {options.fileTextLabel ?? "Files"}
        <textarea
          rows={4}
          value={draft?.uploadedFilesText ?? ""}
          onChange={(event) => setField("uploadedFilesText", event.target.value)}
          placeholder="One URL per line"
          readOnly={options.readOnlyFileInput ?? false}
        />
      </label>
    </div>
  );

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
        <h2>Story Management</h2>
        <div className="admin-panel-body">
          <p>
            Signed in as <strong>{userEmail ?? "Unknown user"}</strong>
          </p>
          <div className="admin-settings-card">
            <div>
              <p className="admin-settings-title">Community submissions</p>
              <p className="admin-settings-copy">
                Public story suggestions are currently{" "}
                <strong>{allowCommunitySubmissions ? "enabled" : "paused"}</strong>.
              </p>
            </div>
            <button
              type="button"
              className={
                allowCommunitySubmissions ? "admin-setting-toggle enabled" : "admin-setting-toggle"
              }
              onClick={handleCommunitySubmissionToggle}
              disabled={isSavingCommunitySetting}
            >
              {isSavingCommunitySetting
                ? "Saving..."
                : allowCommunitySubmissions
                  ? "Pause submissions"
                  : "Enable submissions"}
            </button>
          </div>
          <p className="admin-summary">
            The public site is now centered on South-View-curated stories. Use this
            panel to publish entries directly, enrich them with resource links, and
            optionally moderate community submissions.
          </p>
          <div className="admin-tab-row">
            <button
              type="button"
              className={activeTab === "entries" ? "admin-tab active" : "admin-tab"}
              onClick={() => setActiveTab("entries")}
            >
              Published Stories ({entries.length})
            </button>
            {allowCommunitySubmissions ? (
              <button
                type="button"
                className={activeTab === "pending" ? "admin-tab active" : "admin-tab"}
                onClick={() => setActiveTab("pending")}
              >
                Pending Suggestions ({pendingItems.length})
              </button>
            ) : (
              <div className="admin-inline-note">Community submissions are paused.</div>
            )}
          </div>

          {isLoading ? <p>Loading story management data...</p> : null}
          {error ? <p className="form-error">{error}</p> : null}
          {successMessage ? <p className="admin-success">{successMessage}</p> : null}

          {activeTab === "pending" && allowCommunitySubmissions ? (
            <div className="admin-grid">
              <div className="admin-list" role="listbox" aria-label="Pending stories">
                {pendingItems.length === 0 ? <p>No pending community suggestions.</p> : null}
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
                    <span>
                      {[item.role, item.storyType, item.neighborhood]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </button>
                ))}
              </div>

                {pendingDraft ? (
                <div className="admin-editor-shell">
                  {renderEditorFields(pendingDraft, setPendingField, {
                    coordinateTarget: "pending",
                  })}
                  <div className="admin-actions">
                    <button
                      type="button"
                      className="admin-tab active"
                      onClick={handleSavePending}
                      disabled={isSavingPending}
                    >
                      {isSavingPending ? "Saving..." : "Save Draft"}
                    </button>
                    <button
                      type="button"
                      className="admin-approve-btn"
                      onClick={handleApprovePending}
                      disabled={isApproving}
                    >
                      {isApproving ? "Publishing..." : "Approve and Publish"}
                    </button>
                    <button
                      type="button"
                      className="admin-deny-btn"
                      onClick={handleDenyPending}
                      disabled={isDenying}
                    >
                      {isDenying ? "Denying..." : "Deny"}
                    </button>
                  </div>
                </div>
              ) : (
                <p>Select a pending suggestion to review it.</p>
              )}
            </div>
          ) : null}

          {activeTab === "entries" ? (
            <div className="admin-grid">
              <div className="admin-list" role="listbox" aria-label="Published stories">
                <label className="admin-search-label" htmlFor="admin-story-search">
                  Search stories
                </label>
                <input
                  id="admin-story-search"
                  className="admin-search-input"
                  value={entrySearchQuery}
                  onChange={(event) => setEntrySearchQuery(event.target.value)}
                  placeholder="Search by name, type, place, or role"
                />
                <button type="button" className="admin-tab" onClick={handleNewEntry}>
                  + New SVC Story
                </button>
                {filteredEntries.length === 0 ? <p>No published stories match this search.</p> : null}
                {filteredEntries.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={
                      item.id === selectedEntryId && entryMode === "edit"
                        ? "admin-list-item active"
                        : "admin-list-item"
                    }
                    onClick={() => handleSelectEntry(item.id)}
                  >
                    <strong>{item.name}</strong>
                    <span>
                      {[item.role, item.storyType, item.neighborhood]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </button>
                ))}
              </div>

              <div className="admin-editor-shell">
                <p className="admin-editor-heading">
                  {entryMode === "create" ? "Create published story" : "Edit published story"}
                </p>
                {renderEditorFields(entryDraft, setEntryField, {
                  coordinateTarget: "entry",
                })}
                <label className="admin-upload-label">
                  Upload new files
                  <input
                    type="file"
                    accept={SUPPORTED_UPLOAD_ACCEPT}
                    multiple
                    onChange={handleEntryFileChange}
                  />
                </label>
                {entryNewFiles.length ? (
                  <ul className="selected-upload-list">
                    {entryNewFiles.map((file, index) => (
                      <li key={`${file.name}-${index}`}>
                        <span>{file.name}</span>
                        <button
                          type="button"
                          className="remove-coordinate-btn"
                          onClick={() => handleRemoveEntryFile(index)}
                        >
                          Remove
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <div className="admin-actions">
                  <button
                    type="button"
                    className="admin-approve-btn"
                    onClick={handleSaveEntry}
                    disabled={isSavingEntry}
                  >
                    {isSavingEntry
                      ? entryMode === "create"
                        ? "Publishing..."
                        : "Saving..."
                      : entryMode === "create"
                        ? "Publish Story"
                        : "Save Changes"}
                  </button>
                  {entryMode === "edit" && entryDraft.id ? (
                    <button
                      type="button"
                      className="admin-delete-btn"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      Delete Story
                    </button>
                  ) : null}
                </div>
                {isDeleteConfirmOpen ? (
                  <div className="admin-delete-confirm">
                    <p>
                      Delete <strong>{entryDraft.name || "this story"}</strong> permanently?
                    </p>
                    <div className="admin-actions">
                      <button
                        type="button"
                        className="admin-delete-btn"
                        onClick={handleDeleteEntry}
                        disabled={isDeletingEntry}
                      >
                        {isDeletingEntry ? "Deleting..." : "Confirm Delete"}
                      </button>
                      <button
                        type="button"
                        className="admin-tab"
                        onClick={() => setIsDeleteConfirmOpen(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

export default AdminPanel;
