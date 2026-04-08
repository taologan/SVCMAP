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
import UserTutorial from "./components/user-tutorial";
import { useAuth } from "./hooks/use-auth";
import { useAppSettings } from "./hooks/use-app-settings";
import { useLeafletMap } from "./hooks/use-leaflet-map";
import { useMapEntities } from "./hooks/use-map-entities";
import { addPending, lookupRequestStatus } from "./firebase";

const USER_TUTORIAL_STORAGE_KEY = "svcmap-user-tutorial-complete";

function App() {
  const mapContainerRef = useRef(null);
  const topBarRef = useRef(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [isSubmissionSuccessOpen, setIsSubmissionSuccessOpen] = useState(false);
  const [isStatusLookupOpen, setIsStatusLookupOpen] = useState(false);
  const [isUserTutorialOpen, setIsUserTutorialOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(USER_TUTORIAL_STORAGE_KEY) !== "true";
  });
  const [overlayTop, setOverlayTop] = useState(128);

  const { isSigningIn, isSigningOut, authUser, isAdmin, isCheckingAdmin, signIn, signOut } =
    useAuth();
  const { allowCommunitySubmissions } = useAppSettings();
  const { entities, entitiesStatus, entitiesError, reloadEntities } =
    useMapEntities();
  const {
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
  });

  useEffect(() => {
    // Keep panel state aligned with auth transitions.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsAdminPanelOpen(false);
  }, [authUser]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveEntity(null);
        setIsAddModalOpen(false);
        setIsSubmissionSuccessOpen(false);
        setIsStatusLookupOpen(false);
        setIsAdminPanelOpen(false);
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!entityStillExists) setActiveEntity(null);
  }, [activeEntity, entities]);

  useEffect(() => {
    const topBar = topBarRef.current;
    if (!topBar) return;

    const updateOverlayTop = () => {
      const { bottom } = topBar.getBoundingClientRect();
      setOverlayTop(Math.ceil(bottom + 8));
    };

    updateOverlayTop();
    window.addEventListener("resize", updateOverlayTop);

    let resizeObserver = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateOverlayTop);
      resizeObserver.observe(topBar);
    }

    return () => {
      window.removeEventListener("resize", updateOverlayTop);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, []);

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
    role,
    storyType,
    neighborhood,
    graveLocation,
    sourceLabel,
    sourceUrl,
    externalLinks,
    story,
    coordinates,
    contactEmail,
    contactPhone,
    files = [],
  }) => {
    try {
      const pendingRequest = await addPending({
        name,
        role,
        storyType,
        neighborhood,
        graveLocation,
        sourceLabel,
        sourceUrl,
        externalLinks,
        summary: story,
        coordinates,
        uploadedFiles: files,
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

  const closeUserTutorial = () => {
    setIsUserTutorialOpen(false);
    window.localStorage.setItem(USER_TUTORIAL_STORAGE_KEY, "true");
  };

  const userTutorialSteps = [
    {
      selector: ".visible-sidebar",
      title: "Explore Stories",
      description:
        "Use the filters to browse stories by theme, neighborhood, person name, or what is currently visible on the map.",
    },
    {
      selector: ".map",
      title: "Map Interactions",
      description:
        "Pan and zoom the map to explore more markers. Click a marker or list item to open details in the right-side drawer.",
    },
    {
      selector: ".details-drawer",
      title: "Deeper Context",
      description:
        "Each story panel can include SVC-managed resource links, burial clues, and media that connect the map to the wider South-View ecosystem.",
    },
  ];

  if (allowCommunitySubmissions) {
    userTutorialSteps.unshift(
      {
        selector: ".add-waypoint-btn:not(.secondary)",
        title: "Suggest a Story",
        description:
          "Use this button to submit a new waypoint request with a story, coordinates, and contact information.",
      },
      {
        selector: ".add-waypoint-btn.secondary",
        title: "Check Request Status",
        description:
          "After submitting, use this button to look up your request by email or phone and see whether it is pending, approved, or denied.",
      },
    );
  }

  return (
    <main className="app">
      <section className="map-shell" style={{ "--overlay-top": `${overlayTop}px` }}>
        <TopBar
          topBarRef={topBarRef}
          isSigningIn={isSigningIn}
          isSigningOut={isSigningOut}
          authUser={authUser}
          isCheckingAdmin={isCheckingAdmin}
          isAdmin={isAdmin}
          onAdminLogin={handleAdminLogin}
          onSignOut={signOut}
          onOpenAddModal={
            allowCommunitySubmissions ? () => setIsAddModalOpen(true) : undefined
          }
          onOpenStatusLookupModal={
            allowCommunitySubmissions
              ? () => setIsStatusLookupOpen(true)
              : undefined
          }
        />
        <Sidebar
          isSidebarCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((current) => !current)}
          entitiesStatus={entitiesStatus}
          entitiesError={entitiesError}
          visibleEntities={visibleEntities}
          activeEntity={activeEntity}
          onFocusEntity={focusEntity}
          onClearActiveEntity={() => setActiveEntity(null)}
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

      {allowCommunitySubmissions ? (
        <>
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
        </>
      ) : null}
      <AdminPanel
        isOpen={isAdmin && isAdminPanelOpen}
        userEmail={authUser?.email}
        onClose={() => setIsAdminPanelOpen(false)}
        onEntriesChanged={reloadEntities}
        allowCommunitySubmissions={allowCommunitySubmissions}
        onRequestCoordinatePick={requestCoordinatePick}
      />
      {isUserTutorialOpen ? (
        <UserTutorial
          isOpen={isUserTutorialOpen}
          steps={userTutorialSteps}
          onClose={closeUserTutorial}
        />
      ) : null}
    </main>
  );
}

export default App;
