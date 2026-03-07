import { useEffect, useRef, useState } from "react";
import "leaflet.heat";
import "./leaflet-smooth-wheel-zoom";
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
import { useStatusLookup } from "./hooks/use-status-lookup";
import { useWaypointForm } from "./hooks/use-waypoint-form";

function App() {
  const mapContainerRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);

  const { isSigningIn, authUser, isAdmin, isCheckingAdmin, signIn } = useAuth();
  const { entities, entitiesStatus, entitiesError, reloadEntities } =
    useMapEntities();
  const { mapRef, showMarkers, visibleEntities, focusEntity } = useLeafletMap({
    mapContainerRef,
    entities,
    activeEntity,
    setActiveEntity,
    isSidebarCollapsed,
  });
  const waypointForm = useWaypointForm(mapRef);
  const statusLookup = useStatusLookup();
  const closeSubmissionSuccess = waypointForm.closeSubmissionSuccess;
  const dismissAddModal = waypointForm.dismissAddModal;
  const dismissStatusLookupModal = statusLookup.dismissStatusLookupModal;

  useEffect(() => {
    setIsAdminPanelOpen(false);
  }, [authUser]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveEntity(null);
        dismissAddModal();
        closeSubmissionSuccess();
        dismissStatusLookupModal();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeSubmissionSuccess, dismissAddModal, dismissStatusLookupModal]);

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

  return (
    <main className="app">
      <section className="map-shell">
        <TopBar
          isSigningIn={isSigningIn}
          authUser={authUser}
          isCheckingAdmin={isCheckingAdmin}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onOpenAddModal={waypointForm.openAddModal}
          onOpenStatusLookupModal={statusLookup.openStatusLookupModal}
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
          isVisible={waypointForm.isPickingCoordinates}
          onCancel={waypointForm.cancelCoordinatePicker}
        />
        <DetailsDrawer
          activeEntity={activeEntity}
          onClose={() => setActiveEntity(null)}
        />
      </section>

      <AddWaypointModal
        isOpen={waypointForm.isAddModalOpen}
        waypointForm={waypointForm.waypointForm}
        formError={waypointForm.formError}
        isSavingWaypoint={waypointForm.isSavingWaypoint}
        onClose={waypointForm.closeAddModal}
        onSubmit={waypointForm.handleAddWaypoint}
        onFieldChange={waypointForm.handleFieldChange}
        onFileChange={waypointForm.handleFileChange}
        onStartCoordinatePicker={waypointForm.startCoordinatePicker}
      />
      <SubmissionSuccessModal
        isOpen={waypointForm.isSubmissionSuccessOpen}
        submissionReceipt={waypointForm.submissionReceipt}
        onClose={waypointForm.closeSubmissionSuccess}
      />
      <StatusLookupModal
        isOpen={statusLookup.isStatusLookupOpen}
        statusLookupForm={statusLookup.statusLookupForm}
        statusLookupError={statusLookup.statusLookupError}
        hasStatusLookupAttempted={statusLookup.hasStatusLookupAttempted}
        statusLookupResult={statusLookup.statusLookupResult}
        isCheckingStatusLookup={statusLookup.isCheckingStatusLookup}
        onClose={statusLookup.closeStatusLookupModal}
        onFieldChange={statusLookup.handleStatusLookupFieldChange}
        onSubmit={statusLookup.handleStatusLookup}
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
