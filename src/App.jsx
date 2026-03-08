import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import "./App.css";
import Sidebar from "./components/sidebar";
import AdminPanel from "./components/admin-panel";
import AddWaypointModal from "./components/add-waypoint-modal";
import StatusLookupModal from "./components/status-lookup-modal";
import SubmissionSuccessModal from "./components/submission-success-modal";
import DetailsDrawer from "./components/details-drawer";
import TopBar from "./components/top-bar";
import CoordinatePickerBanner from "./components/coordinate-picker-banner";
import { useAuth } from "./hooks/use-auth";
import { useLeafletMap } from "./hooks/use-leaflet-map";
import { useMapEntities } from "./hooks/use-map-entities";
import { addPending, lookupRequestStatus } from "./firebase";

function App() {
  const mapContainerRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [isSubmissionSuccessOpen, setIsSubmissionSuccessOpen] = useState(false);
  const [isStatusLookupOpen, setIsStatusLookupOpen] = useState(false);

  const { isSigningIn, authUser, isAdmin, isCheckingAdmin, signIn } = useAuth();
  const { entities, entitiesStatus, entitiesError, reloadEntities } =
    useMapEntities();
  const {
    showMarkers,
    visibleEntities,
    focusEntity,
    isPickingCoordinates,
    requestCoordinatePick,
    cancelCoordinatePick,
  } = useLeafletMap({
    mapContainerRef,
    entities,
    activeEntity,
    setActiveEntity,
    isSidebarCollapsed,
  });

  useEffect(() => {
    setIsAdminPanelOpen(false);
  }, [authUser]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveEntity(null);
        setIsAddModalOpen(false);
        setIsSubmissionSuccessOpen(false);
        setIsStatusLookupOpen(false);
        cancelCoordinatePick();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cancelCoordinatePick]);

  useEffect(() => {
    if (!activeEntity) return;
    const entityStillExists = entities.some(
      (entity) => entity.id === activeEntity.id,
    );
    if (!entityStillExists) setActiveEntity(null);
  }, [activeEntity, entities]);

  const handleAdminLogin = async () => {
    if (isAdmin) {
      setIsAdminPanelOpen(true);
      return;
    }

    try {
      await signIn();
    } catch (error) {
      console.error("Google sign-in failed:", error);
    }
  };

  const handleSubmitWaypoint = async ({
    name,
    story,
    latitude,
    longitude,
    contactEmail,
    contactPhone,
    files,
  }) => {
    try {
      const pendingRequest = await addPending({
        type: "submission",
        name,
        summary: story,
        dates: "Community submission",
        coordinates: [[latitude, longitude]],
        uploadedFiles: files.map((file) => file.name),
        source: "user",
        submitterEmail: contactEmail,
        submitterPhone: contactPhone,
      });

      return {
        id: pendingRequest.id,
        name,
        contactEmail,
        contactPhone,
      };
    } catch (error) {
      console.error("Failed to save waypoint to Firestore:", error);
      throw new Error("Could not save to Firebase. Please try again.");
    }
  };

  const handleSubmissionSuccess = (receipt) => {
    setSubmissionReceipt(receipt);
    setIsSubmissionSuccessOpen(true);
  };

  const handleStatusLookup = async ({ contactEmail, contactPhone }) => {
    return lookupRequestStatus({
      submitterEmail: contactEmail,
      submitterPhone: contactPhone,
    });
  };

  return (
    <main className="app">
      <section className="map-shell">
        <TopBar
          isSigningIn={isSigningIn}
          authUser={authUser}
          isCheckingAdmin={isCheckingAdmin}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenStatusLookupModal={() => setIsStatusLookupOpen(true)}
        />
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
          entitiesStatus={entitiesStatus}
          entitiesError={entitiesError}
          showMarkers={showMarkers}
          visibleEntities={visibleEntities}
          activeEntity={activeEntity}
          onFocusEntity={focusEntity}
        />
        <div ref={mapContainerRef} className="map" />
        <CoordinatePickerBanner
          isVisible={isPickingCoordinates}
          onCancel={cancelCoordinatePick}
        />
        <DetailsDrawer
          activeEntity={activeEntity}
          onClose={() => setActiveEntity(null)}
        />
      </section>

      <AddWaypointModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmitWaypoint={handleSubmitWaypoint}
        onSubmissionSuccess={handleSubmissionSuccess}
        onRequestCoordinatePick={requestCoordinatePick}
      />
      <SubmissionSuccessModal
        isOpen={isSubmissionSuccessOpen}
        submissionReceipt={submissionReceipt}
        onClose={() => setIsSubmissionSuccessOpen(false)}
      />
      <StatusLookupModal
        isOpen={isStatusLookupOpen}
        onClose={() => setIsStatusLookupOpen(false)}
        onLookup={handleStatusLookup}
      />
      <AdminPanel
        isOpen={isAdmin && isAdminPanelOpen}
        userEmail={authUser?.email}
        onClose={() => setIsAdminPanelOpen(false)}
        onEntriesChanged={reloadEntities}
      />
    </main>
  );
}

export default App;
