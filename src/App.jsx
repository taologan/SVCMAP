import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import "./leaflet-smooth-wheel-zoom";
import "leaflet/dist/leaflet.css";
import "./App.css";
import {
  ATLANTA_CENTER,
  CARTO_LIGHT_BASEMAP,
  EMPTY_FORM,
  EMPTY_STATUS_LOOKUP_FORM,
  HEAT_VISIBILITY_ZOOM,
  MARKER_VISIBILITY_ZOOM,
} from "./constants";
import {
  buildHeatData,
  flattenPointEntities,
  getBoundsSnapshot,
  getVisibleEntities,
} from "./utils/map-helpers";
import {
  addPending,
  getEntities,
  isUserAdmin,
  lookupRequestStatus,
  onAuthUserChanged,
  signInWithGoogle,
} from "./firebase";
import Sidebar from "./components/sidebar";
import AdminPanel from "./components/admin-panel";
import AddWaypointModal from "./components/add-waypoint-modal";

function App() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const heatLayerRef = useRef(null);

  const [zoom, setZoom] = useState(11);
  const [bounds, setBounds] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [activeEntity, setActiveEntity] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false);
  const [waypointForm, setWaypointForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [isSavingWaypoint, setIsSavingWaypoint] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [firebaseEntities, setFirebaseEntities] = useState([]);
  const [entitiesStatus, setEntitiesStatus] = useState("loading");
  const [entitiesError, setEntitiesError] = useState("");
  const [submissionReceipt, setSubmissionReceipt] = useState(null);
  const [isSubmissionSuccessOpen, setIsSubmissionSuccessOpen] = useState(false);
  const [isStatusLookupOpen, setIsStatusLookupOpen] = useState(false);
  const [statusLookupForm, setStatusLookupForm] = useState(
    EMPTY_STATUS_LOOKUP_FORM,
  );
  const [statusLookupResult, setStatusLookupResult] = useState([]);
  const [statusLookupError, setStatusLookupError] = useState("");
  const [isCheckingStatusLookup, setIsCheckingStatusLookup] = useState(false);
  const [hasStatusLookupAttempted, setHasStatusLookupAttempted] =
    useState(false);
  const entities = firebaseEntities;
  const loadEntities = useCallback(async () => {
    setEntitiesStatus("loading");
    setEntitiesError("");
    try {
      const loadedEntities = await getEntities();
      setFirebaseEntities(loadedEntities);
      setEntitiesStatus("ready");
    } catch (error) {
      console.error("Failed to fetch entries from Firestore:", error);
      setEntitiesStatus("error");
      setEntitiesError("Unable to load data from Firestore.");
    }
  }, []);
  const pointEntities = useMemo(() => flattenPointEntities(entities), [entities]);
  const heatData = useMemo(() => buildHeatData(pointEntities), [pointEntities]);
  const showMarkers = zoom >= MARKER_VISIBILITY_ZOOM;
  const visibleEntities = useMemo(
    () => getVisibleEntities({ entities, bounds, showMarkers }),
    [bounds, entities, showMarkers],
  );

  useEffect(() => {
    let isMounted = true;
    const unsubscribe = onAuthUserChanged((user) => {
      if (!isMounted) return;

      setAuthUser(user);
      setIsAdminPanelOpen(false);

      if (!user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
      }

      setIsCheckingAdmin(true);
      isUserAdmin(user)
        .then((allowed) => {
          if (!isMounted) return;
          setIsAdmin(allowed);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("Failed to verify admin status:", error);
          setIsAdmin(false);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsCheckingAdmin(false);
        });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    loadEntities();
  }, [loadEntities]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 18,
      zoomSnap: 0,
      scrollWheelZoom: false,
      smoothWheelZoom: true,
      smoothSensitivity: 1.2,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
    }).setView(ATLANTA_CENTER, 11);
    L.control.zoom({ position: "bottomright" }).addTo(map);

    tileLayerRef.current = L.tileLayer(
      CARTO_LIGHT_BASEMAP.url,
      CARTO_LIGHT_BASEMAP.options,
    ).addTo(map);

    markerLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    setZoom(map.getZoom());
    setBounds(getBoundsSnapshot(map.getBounds()));

    const syncViewportState = () => {
      setZoom(map.getZoom());
      setBounds(getBoundsSnapshot(map.getBounds()));
    };
    const onSmoothZoom = () => {
      if (heatLayerRef.current) heatLayerRef.current.redraw();
    };
    map.on("zoomend", syncViewportState);
    map.on("moveend", syncViewportState);
    map.on("smoothzoom", onSmoothZoom);

    return () => {
      map.off("zoomend", syncViewportState);
      map.off("moveend", syncViewportState);
      map.off("smoothzoom", onSmoothZoom);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      heatLayerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return;
    const map = mapRef.current;
    const markerLayer = markerLayerRef.current;
    markerLayer.clearLayers();

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current);
      heatLayerRef.current = null;
    }

    if (pointEntities.length === 0) {
      setActiveEntity(null);
      return;
    }

    const showHeat = zoom <= HEAT_VISIBILITY_ZOOM;

    if (showHeat) {
      heatLayerRef.current = L.heatLayer(heatData.points, {
        radius: 30,
        blur: 22,
        maxZoom: 14,
        max: heatData.maxIntensity,
        minOpacity: 0.35,
        gradient: {
          0.15: "#ffd166",
          0.45: "#f8961e",
          0.7: "#ef476f",
          1.0: "#6a040f",
        },
      }).addTo(map);
    }

    if (showMarkers) {
      pointEntities.forEach((pointEntity) => {
        const { entity, coordinate, pointIndex } = pointEntity;
        const isActive = activeEntity?.id === entity.id;
        const marker = L.circleMarker(coordinate, {
          radius: isActive ? 10 : zoom >= 15 ? 9 : 6,
          color: isActive ? "#1d4ed8" : "#1f2937",
          weight: isActive ? 2 : 1,
          fillColor: isActive ? "#60a5fa" : "#f4a261",
          fillOpacity: isActive ? 1 : 0.88,
        });

        marker.bindTooltip(entity.name, {
          permanent: isActive,
          direction: "top",
        });
        marker.on("click", () => focusEntity(entity));
        marker.options.entityListKey = `${entity.id}-${pointIndex}`;
        marker.addTo(markerLayer);
      });
    }
  }, [activeEntity, heatData, pointEntities, zoom]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setActiveEntity(null);
        setIsAddModalOpen(false);
        setIsPickingCoordinates(false);
        setIsSubmissionSuccessOpen(false);
        setIsStatusLookupOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (!activeEntity) return;
    const entityStillExists = entities.some(
      (entity) => entity.id === activeEntity.id,
    );
    if (!entityStillExists) setActiveEntity(null);
  }, [activeEntity, entities]);

  const openAddModal = () => {
    setFormError("");
    setWaypointForm(EMPTY_FORM);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setFormError("");
    setWaypointForm(EMPTY_FORM);
    setIsAddModalOpen(false);
    setIsPickingCoordinates(false);
  };

  const openStatusLookupModal = () => {
    setStatusLookupForm(EMPTY_STATUS_LOOKUP_FORM);
    setStatusLookupResult([]);
    setStatusLookupError("");
    setHasStatusLookupAttempted(false);
    setIsStatusLookupOpen(true);
  };

  const closeStatusLookupModal = () => {
    setStatusLookupForm(EMPTY_STATUS_LOOKUP_FORM);
    setStatusLookupResult([]);
    setStatusLookupError("");
    setHasStatusLookupAttempted(false);
    setIsStatusLookupOpen(false);
  };

  const focusEntity = (entity, visiblePoints = []) => {
    setActiveEntity(entity);
    const map = mapRef.current;
    if (!map) return;

    const pointsToShow =
      visiblePoints.length > 1 ? visiblePoints : entity.coordinates;

    if (pointsToShow.length > 1) {
      const latLngBounds = L.latLngBounds(
        pointsToShow.map((coordinate) => L.latLng(coordinate)),
      );
      map.flyToBounds(latLngBounds, {
        animate: true,
        duration: 0.65,
        paddingTopLeft: L.point(isSidebarCollapsed ? 54 : 340, 120),
        paddingBottomRight: L.point(450, 80),
        maxZoom: 15,
      });
      return;
    }

    const targetZoom = Math.max(map.getZoom(), 14);
    const targetLatLng = L.latLng(pointsToShow[0]);
    const projectedTarget = map.project(targetLatLng, targetZoom);
    const mapSize = map.getSize();
    const viewportCenter = L.point(mapSize.x / 2, mapSize.y / 2);
    const desiredPoint = L.point(mapSize.x * 0.33, mapSize.y / 2);
    const offset = desiredPoint.subtract(viewportCenter);
    const offsetCenter = map.unproject(
      projectedTarget.subtract(offset),
      targetZoom,
    );

    map.flyTo(offsetCenter, targetZoom, {
      animate: true,
      duration: 0.65,
    });
  };

  const handleFieldChange = (event) => {
    const { name, value } = event.target;
    setWaypointForm((current) => ({ ...current, [name]: value }));
  };

  const handleFileChange = (event) => {
    const fileList = event.target.files ? Array.from(event.target.files) : [];
    setWaypointForm((current) => ({ ...current, files: fileList }));
  };

  const handleAddWaypoint = async (event) => {
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
    if (!contactEmail && !contactPhone) {
      setFormError("Please provide an email or phone number for status lookup.");
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
  };

  const startCoordinatePicker = () => {
    setFormError("");
    setIsAddModalOpen(false);
    setIsPickingCoordinates(true);
  };

  const cancelCoordinatePicker = () => {
    setIsPickingCoordinates(false);
    setIsAddModalOpen(true);
  };

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
  }, [isPickingCoordinates]);

  const handleAdminLogin = async () => {
    if (isAdmin) {
      setIsAdminPanelOpen(true);
      return;
    }

    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      console.log("Signed in with Google email:", user?.email ?? "(no email)");
    } catch (error) {
      console.error("Google sign-in failed:", error);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleStatusLookupFieldChange = (event) => {
    const { name, value } = event.target;
    setStatusLookupForm((current) => ({ ...current, [name]: value }));
  };

  const handleStatusLookup = async (event) => {
    event.preventDefault();
    setHasStatusLookupAttempted(true);
    setStatusLookupError("");
    setStatusLookupResult([]);

    if (
      !statusLookupForm.contactEmail.trim() &&
      !statusLookupForm.contactPhone.trim()
    ) {
      setStatusLookupError("Please provide the email or phone used on submission.");
      return;
    }

    setIsCheckingStatusLookup(true);
    try {
      const result = await lookupRequestStatus({
        submitterEmail: statusLookupForm.contactEmail,
        submitterPhone: statusLookupForm.contactPhone,
      });
      setStatusLookupResult(result);
    } catch (error) {
      setStatusLookupError(error.message || "Could not find that request.");
    } finally {
      setIsCheckingStatusLookup(false);
    }
  };

  return (
    <main className="app">
      <section className="map-shell">
        <header className="top-bar">
          <div className="title-wrap">
            <p className="eyebrow">South-View Cemetery</p>
            <h1>Atlanta Community Story Map</h1>
            <p className="subtitle">
              Firestore-powered story map with heatmap and zoom-based markers.
            </p>
          </div>
          <div className="header-controls">
            <button
              type="button"
              className="admin-login-btn"
              onClick={handleAdminLogin}
              disabled={isSigningIn || (Boolean(authUser) && isCheckingAdmin)}
            >
              {isSigningIn
                ? "Signing in..."
                : authUser && isCheckingAdmin
                  ? "Checking admin..."
                  : isAdmin
                    ? "Open Admin Panel"
                    : authUser
                      ? "Switch Admin Account"
                      : "Admin Login"}
            </button>
            <button
              type="button"
              className="add-waypoint-btn"
              onClick={openAddModal}
            >
              + Add Connection
            </button>
            <button
              type="button"
              className="add-waypoint-btn secondary"
              onClick={openStatusLookupModal}
            >
              Check Request Status
            </button>
            {/* <div className="status">
              <span className="stat-chip">Zoom {zoom}</span>
              <span className="stat-chip">{visibleEntities.length} visible</span>
              <span className="stat-chip">Style: Carto Light</span>
              {/* Map style selector temporarily disabled to keep navigation focused. */}
            {/* </div> */}
          </div>
        </header>
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
        {isPickingCoordinates ? (
          <div className="map-pick-banner">
            <span>Click on the map to set waypoint coordinates.</span>
            <button type="button" onClick={cancelCoordinatePicker}>
              Cancel
            </button>
          </div>
        ) : null}
        <aside
          className={activeEntity ? "details-drawer" : "details-drawer empty"}
        >
          {activeEntity ? (
            <>
              <div className="drawer-header">
                <div>
                  <p className="eyebrow">{activeEntity.type}</p>
                  <h2>{activeEntity.name}</h2>
                </div>
                <button
                  type="button"
                  className="drawer-close"
                  onClick={() => setActiveEntity(null)}
                >
                  Close
                </button>
              </div>
              <div className="drawer-body">
                <p>{activeEntity.summary}</p>
                <p>
                  <strong>Dates:</strong> {activeEntity.dates}
                </p>
                {activeEntity.uploadedFiles?.length ? (
                  <div className="file-list">
                    <strong>Files:</strong>
                    <ul>
                      {activeEntity.uploadedFiles.map((fileName) => (
                        <li key={fileName}>{fileName}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <div className="drawer-empty-state">
              <p className="eyebrow">Waypoint details</p>
              <h2>Select a marker</h2>
              <p>
                Click a waypoint from the map or visible list to read more
                details here. The map recenters toward the left so you can keep
                exploring while reading.
              </p>
            </div>
          )}
        </aside>
      </section>

      <AddWaypointModal
        isOpen={isAddModalOpen}
        waypointForm={waypointForm}
        formError={formError}
        isSavingWaypoint={isSavingWaypoint}
        onClose={closeAddModal}
        onSubmit={handleAddWaypoint}
        onFieldChange={handleFieldChange}
        onFileChange={handleFileChange}
        onStartCoordinatePicker={startCoordinatePicker}
      />
      {isSubmissionSuccessOpen ? (
        <div
          className="entity-modal-backdrop"
          role="presentation"
          onClick={() => setIsSubmissionSuccessOpen(false)}
        >
          <section
            className="entity-modal form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Submission successful"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="entity-modal-close"
              onClick={() => setIsSubmissionSuccessOpen(false)}
            >
              Close
            </button>
            <p className="eyebrow">Submission received</p>
            <h2>Request submitted successfully</h2>
            <p>
              Thanks for your contribution. You can check your request status
              anytime using the same email or phone number you submitted.
            </p>
            {submissionReceipt?.name ? (
              <p>
                <strong>Submitted request:</strong> {submissionReceipt.name}
              </p>
            ) : null}
            <p>
              Status updates are available from the <strong>Check Request Status</strong> button.
            </p>
          </section>
        </div>
      ) : null}
      {isStatusLookupOpen ? (
        <div
          className="entity-modal-backdrop"
          role="presentation"
          onClick={closeStatusLookupModal}
        >
          <section
            className="entity-modal form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Check request status"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="entity-modal-close"
              onClick={closeStatusLookupModal}
            >
              Close
            </button>
            <p className="eyebrow">Status lookup</p>
            <h2>Check Request Status</h2>
            <form className="add-waypoint-form" onSubmit={handleStatusLookup}>
              <label>
                Contact email (optional)
                <input
                  name="contactEmail"
                  type="email"
                  value={statusLookupForm.contactEmail}
                  onChange={handleStatusLookupFieldChange}
                  placeholder="you@example.org"
                />
              </label>
              <label>
                Contact phone (optional)
                <input
                  name="contactPhone"
                  type="tel"
                  value={statusLookupForm.contactPhone}
                  onChange={handleStatusLookupFieldChange}
                  placeholder="404-555-1234"
                />
              </label>
              <p className="form-note">
                Enter the same email or phone used when you submitted your request.
              </p>
              {statusLookupError ? (
                <p className="form-error">{statusLookupError}</p>
              ) : null}
              {hasStatusLookupAttempted ? (
                <div className="lookup-result">
                  {statusLookupResult.length === 0 ? (
                    <p>No matching requests found.</p>
                  ) : (
                    <ul className="lookup-result-list">
                      {statusLookupResult.map((request) => (
                        <li key={request.id}>
                          <p>
                            <strong>Status:</strong> {request.status}
                          </p>
                          {request.name ? (
                            <p>
                              <strong>Request name:</strong> {request.name}
                            </p>
                          ) : null}
                          {request.reviewNotes ? (
                            <p>
                              <strong>Review notes:</strong> {request.reviewNotes}
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : null}
              <button
                type="submit"
                className="submit-btn"
                disabled={isCheckingStatusLookup}
              >
                {isCheckingStatusLookup ? "Checking..." : "Check status"}
              </button>
            </form>
          </section>
        </div>
      ) : null}
      <AdminPanel
        isOpen={isAdmin && isAdminPanelOpen}
        userEmail={authUser?.email}
        onClose={() => setIsAdminPanelOpen(false)}
        onEntriesChanged={loadEntities}
      />
    </main>
  );
}

export default App;
