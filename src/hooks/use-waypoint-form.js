import { useCallback, useEffect, useState } from "react";
import { EMPTY_FORM } from "../constants";
import { addPending } from "../firebase";

export function useWaypointForm(mapRef) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false);
  const [waypointForm, setWaypointForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSavingWaypoint, setIsSavingWaypoint] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [isSubmissionSuccessOpen, setIsSubmissionSuccessOpen] = useState(false);

  const openAddModal = useCallback(() => {
    setFormError("");
    setWaypointForm(EMPTY_FORM);
    setIsAddModalOpen(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setFormError("");
    setWaypointForm(EMPTY_FORM);
    setIsAddModalOpen(false);
    setIsPickingCoordinates(false);
  }, []);

  const dismissAddModal = useCallback(() => {
    setIsAddModalOpen(false);
    setIsPickingCoordinates(false);
  }, []);

  const closeSubmissionSuccess = useCallback(() => {
    setIsSubmissionSuccessOpen(false);
  }, []);

  const handleFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setWaypointForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleFileChange = useCallback((event) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    setWaypointForm((current) => ({ ...current, files: fileList }));
  }, []);

  const startCoordinatePicker = useCallback(() => {
    setFormError("");
    setIsAddModalOpen(false);
    setIsPickingCoordinates(true);
  }, []);

  const cancelCoordinatePicker = useCallback(() => {
    setIsPickingCoordinates(false);
    setIsAddModalOpen(true);
  }, []);

  const handleAddWaypoint = useCallback(
    async (event) => {
      event.preventDefault();
      const latitude = Number(waypointForm.latitude);
      const longitude = Number(waypointForm.longitude);
      const name = waypointForm.name.trim();
      const story = waypointForm.story.trim();
      const contactEmail = waypointForm.contactEmail.trim();
      const contactPhone = waypointForm.contactPhone.trim();

      if (!name || !story) {
        setFormError("Name and story are required.");
        return;
      }
      if (!contactEmail) {
        setFormError("Please provide an email address.");
        return;
      }

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
      setIsSavingWaypoint(true);

      try {
        const pendingRequest = await addPending({
          type: "submission",
          name,
          summary: story,
          dates: "Community submission",
          coordinates: [[latitude, longitude]],
          uploadedFiles: waypointForm.files.map((file) => file.name),
          source: "user",
          submitterEmail: contactEmail,
          submitterPhone: contactPhone,
        });

        closeAddModal();
        setSubmissionReceipt({
          id: pendingRequest.id,
          name,
          contactEmail,
          contactPhone,
        });
        setIsSubmissionSuccessOpen(true);
      } catch (error) {
        console.error("Failed to save waypoint to Firestore:", error);
        setFormError("Could not save to Firebase. Please try again.");
      } finally {
        setIsSavingWaypoint(false);
      }
    },
    [closeAddModal, waypointForm],
  );

  useEffect(() => {
    if (!mapRef.current || !isPickingCoordinates) return;
    const map = mapRef.current;
    const container = map.getContainer();
    container.style.cursor = "crosshair";

    const handleMapClick = (event) => {
      const { lat, lng } = event.latlng;
      setWaypointForm((current) => ({
        ...current,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      }));
      setIsPickingCoordinates(false);
      setIsAddModalOpen(true);
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
      container.style.cursor = "";
    };
  }, [isPickingCoordinates, mapRef]);

  return {
    isAddModalOpen,
    isPickingCoordinates,
    waypointForm,
    formError,
    isSavingWaypoint,
    submissionReceipt,
    isSubmissionSuccessOpen,
    openAddModal,
    closeAddModal,
    dismissAddModal,
    handleFieldChange,
    handleFileChange,
    handleAddWaypoint,
    startCoordinatePicker,
    cancelCoordinatePicker,
    closeSubmissionSuccess,
  };
}
