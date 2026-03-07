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

  const [zoom, setZoom] = useState(11);
  const [bounds, setBounds] = useState(null);

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
  }, [mapContainerRef]);

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
  }, [activeEntity, focusEntity, heatData, pointEntities, setActiveEntity, zoom]);

  return {
    mapRef,
    zoom,
    showMarkers,
    visibleEntities,
    focusEntity,
  };
}
