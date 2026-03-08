import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import "leaflet.heat";
import "../leaflet-smooth-wheel-zoom";
import {
  ATLANTA_CENTER,
  CARTO_LIGHT_BASEMAP,
  HEAT_VISIBILITY_ZOOM,
  MARKER_VISIBILITY_ZOOM,
} from "../constants";
import {
  buildHeatData,
  flattenPointEntities,
  getBoundsSnapshot,
  getVisibleEntities,
} from "../utils/map-helpers";

function getHorizontalOverlayPadding(map) {
  const mapShell = map.getContainer().parentElement;
  const labelBuffer = 150;
  if (!mapShell) {
    return { left: 54 + labelBuffer, right: 80 + labelBuffer };
  }

  const sidebar = mapShell.querySelector(".visible-sidebar");
  const drawer = mapShell.querySelector(".details-drawer");

  let leftPadding = 54;
  let rightPadding = 80;

  if (sidebar instanceof HTMLElement) {
    const sidebarStyles = window.getComputedStyle(sidebar);
    const sidebarWidth = sidebar.getBoundingClientRect().width;
    if (sidebarStyles.display !== "none" && sidebarWidth > 0) {
      leftPadding = Math.ceil(sidebarWidth + 24);
    }
  }

  if (drawer instanceof HTMLElement) {
    const drawerStyles = window.getComputedStyle(drawer);
    const drawerWidth = drawer.getBoundingClientRect().width;
    const isSideDocked = drawerStyles.top !== "auto";
    if (drawerStyles.display !== "none" && isSideDocked && drawerWidth > 0) {
      rightPadding = Math.ceil(drawerWidth + 24);
    }
  }

  return {
    left: leftPadding + labelBuffer,
    right: rightPadding + labelBuffer,
  };
}

export function useLeafletMap({
  mapContainerRef,
  entities,
  activeEntity,
  setActiveEntity,
  isSidebarCollapsed,
}) {
  const mapRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markerLayerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const coordinatePickResolveRef = useRef(null);
  const isAutoNavigatingRef = useRef(false);

  const [zoom, setZoom] = useState(11);
  const [bounds, setBounds] = useState(null);
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false);

  const pointEntities = useMemo(() => flattenPointEntities(entities), [entities]);
  const heatData = useMemo(() => buildHeatData(pointEntities), [pointEntities]);
  const showMarkers = zoom >= MARKER_VISIBILITY_ZOOM;
  const visibleEntities = useMemo(
    () => getVisibleEntities({ entities, bounds, showMarkers }),
    [bounds, entities, showMarkers],
  );

  const focusEntity = useCallback(
    (entity, visiblePoints = []) => {
      setActiveEntity(entity);
      const map = mapRef.current;
      if (!map) return;

      const pointsToShow =
        visiblePoints.length > 1 ? visiblePoints : entity.coordinates;
      const overlayPadding = getHorizontalOverlayPadding(map);

      if (pointsToShow.length > 1) {
        const latLngBounds = L.latLngBounds(
          pointsToShow.map((coordinate) => L.latLng(coordinate)),
        );
        isAutoNavigatingRef.current = true;
        map.flyToBounds(latLngBounds, {
          animate: true,
          duration: 0.65,
          paddingTopLeft: L.point(overlayPadding.left, 120),
          paddingBottomRight: L.point(overlayPadding.right, 80),
          maxZoom: 15,
        });
        return;
      }

      const targetZoom = Math.max(map.getZoom(), 14);
      const targetLatLng = L.latLng(pointsToShow[0]);
      const projectedTarget = map.project(targetLatLng, targetZoom);
      const mapSize = map.getSize();
      const viewportCenter = L.point(mapSize.x / 2, mapSize.y / 2);
      const availableWidth = Math.max(
        mapSize.x - overlayPadding.left - overlayPadding.right,
        120,
      );
      const desiredX = overlayPadding.left + availableWidth * 0.35;
      const desiredPoint = L.point(desiredX, mapSize.y / 2);
      const offset = desiredPoint.subtract(viewportCenter);
      const offsetCenter = map.unproject(
        projectedTarget.subtract(offset),
        targetZoom,
      );

      isAutoNavigatingRef.current = true;
      map.flyTo(offsetCenter, targetZoom, {
        animate: true,
        duration: 0.65,
      });
    },
    [isSidebarCollapsed, setActiveEntity],
  );

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
    let heatRedrawRafId = null;
    const scheduleHeatRedraw = ({ requireAutoNavigation = false } = {}) => {
      if (!heatLayerRef.current) return;
      if (requireAutoNavigation && !isAutoNavigatingRef.current) return;
      if (heatRedrawRafId !== null) return;
      heatRedrawRafId = requestAnimationFrame(() => {
        heatRedrawRafId = null;
        if (heatLayerRef.current) heatLayerRef.current.redraw();
      });
    };
    const handleHeatRedrawOnZoom = () => scheduleHeatRedraw();
    const handleHeatRedrawOnMove = () =>
      scheduleHeatRedraw({ requireAutoNavigation: true });
    const finalizeHeatAfterMovement = () => {
      isAutoNavigatingRef.current = false;
      if (heatLayerRef.current) heatLayerRef.current.redraw();
    };

    map.on("zoomend", syncViewportState);
    map.on("moveend", syncViewportState);
    map.on("smoothzoom", handleHeatRedrawOnZoom);
    map.on("zoomanim", handleHeatRedrawOnZoom);
    map.on("zoom", handleHeatRedrawOnZoom);
    map.on("move", handleHeatRedrawOnMove);
    map.on("zoomend", finalizeHeatAfterMovement);
    map.on("moveend", finalizeHeatAfterMovement);

    return () => {
      if (heatRedrawRafId !== null) cancelAnimationFrame(heatRedrawRafId);
      map.off("zoomend", syncViewportState);
      map.off("moveend", syncViewportState);
      map.off("smoothzoom", handleHeatRedrawOnZoom);
      map.off("zoomanim", handleHeatRedrawOnZoom);
      map.off("zoom", handleHeatRedrawOnZoom);
      map.off("move", handleHeatRedrawOnMove);
      map.off("zoomend", finalizeHeatAfterMovement);
      map.off("moveend", finalizeHeatAfterMovement);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      markerLayerRef.current = null;
      heatLayerRef.current = null;
      isAutoNavigatingRef.current = false;
    };
  }, [mapContainerRef]);

  const requestCoordinatePick = useCallback(() => {
    return new Promise((resolve) => {
      // Resolve any previous in-flight request to avoid leaking pending promises.
      if (coordinatePickResolveRef.current) {
        coordinatePickResolveRef.current(null);
      }
      coordinatePickResolveRef.current = resolve;
      setIsPickingCoordinates(true);
    });
  }, []);

  const cancelCoordinatePick = useCallback(() => {
    setIsPickingCoordinates(false);
    if (coordinatePickResolveRef.current) {
      coordinatePickResolveRef.current(null);
      coordinatePickResolveRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!mapRef.current || !isPickingCoordinates) return;
    const map = mapRef.current;
    const container = map.getContainer();
    container.style.cursor = "crosshair";

    const handleMapClick = (event) => {
      const { lat, lng } = event.latlng;
      if (coordinatePickResolveRef.current) {
        coordinatePickResolveRef.current({
          latitude: lat.toFixed(6),
          longitude: lng.toFixed(6),
        });
        coordinatePickResolveRef.current = null;
      }
      setIsPickingCoordinates(false);
    };

    map.on("click", handleMapClick);

    return () => {
      map.off("click", handleMapClick);
      container.style.cursor = "";
    };
  }, [isPickingCoordinates]);

  useEffect(() => {
    if (!mapRef.current || isPickingCoordinates) return;
    const map = mapRef.current;

    const handleMapBackgroundClick = () => {
      setActiveEntity((current) => (current ? null : current));
    };

    map.on("click", handleMapBackgroundClick);
    return () => {
      map.off("click", handleMapBackgroundClick);
    };
  }, [isPickingCoordinates, setActiveEntity]);

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
    const shouldShowSelectedMarkersWhenZoomedOut = Boolean(activeEntity);
    const markersToRender =
      showMarkers || !shouldShowSelectedMarkersWhenZoomedOut
        ? pointEntities
        : pointEntities.filter((pointEntity) => pointEntity.entity.id === activeEntity.id);

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

    if (showMarkers || shouldShowSelectedMarkersWhenZoomedOut) {
      markersToRender.forEach((pointEntity) => {
        const { entity, coordinate, pointIndex } = pointEntity;
        const isActive = activeEntity?.id === entity.id;
        const marker = L.circleMarker(coordinate, {
          radius: isActive ? 10 : zoom >= 15 ? 9 : 6,
          color: isActive ? "#1d4ed8" : "#1f2937",
          weight: isActive ? 2 : 1,
          fillColor: isActive ? "#60a5fa" : "#f4a261",
          fillOpacity: isActive ? 1 : 0.88,
          bubblingMouseEvents: false,
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
  }, [
    activeEntity,
    focusEntity,
    heatData,
    pointEntities,
    setActiveEntity,
    showMarkers,
    zoom,
  ]);

  return {
    mapRef,
    zoom,
    showMarkers,
    visibleEntities,
    focusEntity,
    isPickingCoordinates,
    requestCoordinatePick,
    cancelCoordinatePick,
  };
}
