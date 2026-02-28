import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import './App.css'
import { addEntity, getEntities, signInWithGoogle } from './firebase'

const EMPTY_FORM = {
  name: '',
  story: '',
  latitude: '',
  longitude: '',
  files: [],
}

const MARKER_VISIBILITY_ZOOM = 12

const ATLANTA_CENTER = [33.749, -84.388]
const CARTO_LIGHT_BASEMAP = {
  url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  options: {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
    subdomains: 'abcd',
    maxZoom: 20,
  },
}

function App() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const tileLayerRef = useRef(null)
  const markerLayerRef = useRef(null)
  const heatLayerRef = useRef(null)

  const [zoom, setZoom] = useState(11)
  const [bounds, setBounds] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeEntity, setActiveEntity] = useState(null)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false)
  const [waypointForm, setWaypointForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [isSavingWaypoint, setIsSavingWaypoint] = useState(false)
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [firebaseEntities, setFirebaseEntities] = useState([])
  const [entitiesStatus, setEntitiesStatus] = useState('loading')
  const [entitiesError, setEntitiesError] = useState('')
  const entities = firebaseEntities
  const pointEntities = useMemo(
    () =>
      entities.flatMap((entity) =>
        entity.coordinates.map((coordinate, pointIndex) => ({
          entity,
          coordinate,
          pointIndex,
        })),
      ),
    [entities],
  )
  const showMarkers = zoom >= MARKER_VISIBILITY_ZOOM
  const visibleEntities = useMemo(() => {
    if (!bounds || !showMarkers) return []
    return entities
      .map((entity) => {
        const visiblePoints = entity.coordinates.filter(([lat, lng]) => {
          return (
            lat >= bounds.south &&
            lat <= bounds.north &&
            lng >= bounds.west &&
            lng <= bounds.east
          )
        })
        return {
          entity,
          visiblePointCount: visiblePoints.length,
          visiblePoints,
        }
      })
      .filter((entry) => entry.visiblePointCount > 0)
  }, [bounds, entities, showMarkers])

  useEffect(() => {
    let isMounted = true

    const loadEntities = async () => {
      setEntitiesStatus('loading')
      setEntitiesError('')
      try {
        const loadedEntities = await getEntities()
        if (!isMounted) return
        setFirebaseEntities(loadedEntities)
        setEntitiesStatus('ready')
      } catch (error) {
        if (!isMounted) return
        console.error('Failed to fetch entities from Firestore:', error)
        setEntitiesStatus('error')
        setEntitiesError('Unable to load data from Firestore.')
      }
    }

    loadEntities()

    return () => {
      isMounted = false
    }
  }, [])


  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      minZoom: 8,
      maxZoom: 18,
    }).setView(ATLANTA_CENTER, 11)
    L.control.zoom({ position: 'bottomright' }).addTo(map)

    tileLayerRef.current = L.tileLayer(
      CARTO_LIGHT_BASEMAP.url,
      CARTO_LIGHT_BASEMAP.options,
    ).addTo(map)

    markerLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    setZoom(map.getZoom())
    const initialBounds = map.getBounds()
    setBounds({
      north: initialBounds.getNorth(),
      south: initialBounds.getSouth(),
      east: initialBounds.getEast(),
      west: initialBounds.getWest(),
    })

    const syncViewportState = () => {
      setZoom(map.getZoom())
      const nextBounds = map.getBounds()
      setBounds({
        north: nextBounds.getNorth(),
        south: nextBounds.getSouth(),
        east: nextBounds.getEast(),
        west: nextBounds.getWest(),
      })
    }
    map.on('zoomend', syncViewportState)
    map.on('moveend', syncViewportState)

    return () => {
      map.off('zoomend', syncViewportState)
      map.off('moveend', syncViewportState)
      map.remove()
      mapRef.current = null
      tileLayerRef.current = null
      markerLayerRef.current = null
      heatLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) return
    const map = mapRef.current
    const markerLayer = markerLayerRef.current
    markerLayer.clearLayers()

    if (heatLayerRef.current) {
      map.removeLayer(heatLayerRef.current)
      heatLayerRef.current = null
    }

    if (pointEntities.length === 0) {
      setActiveEntity(null)
      return
    }

    const showHeat = zoom <= 12

    if (showHeat) {
      const heatPoints = pointEntities.map((pointEntity) => [
        pointEntity.coordinate[0],
        pointEntity.coordinate[1],
      ])
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 22,
        maxZoom: 14,
        minOpacity: 0.35,
        gradient: {
          0.15: '#ffd166',
          0.45: '#f8961e',
          0.7: '#ef476f',
          1.0: '#6a040f',
        },
      }).addTo(map)
    }

    if (showMarkers) {
      pointEntities.forEach((pointEntity) => {
        const { entity, coordinate, pointIndex } = pointEntity
        const isActive = activeEntity?.id === entity.id
        const marker = L.circleMarker(coordinate, {
          radius: isActive ? 10 : zoom >= 15 ? 9 : 6,
          color: isActive ? '#1d4ed8' : '#1f2937',
          weight: isActive ? 2 : 1,
          fillColor: isActive ? '#60a5fa' : '#f4a261',
          fillOpacity: isActive ? 1 : 0.88,
        })

        marker.bindTooltip(entity.name, {
          permanent: isActive,
          direction: 'top',
        })
        marker.on('click', () => focusEntity(entity))
        marker.options.entityListKey = `${entity.id}-${pointIndex}`
        marker.addTo(markerLayer)
      })
    }
  }, [activeEntity, pointEntities, zoom])

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setActiveEntity(null)
        setIsAddModalOpen(false)
        setIsPickingCoordinates(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!activeEntity) return
    const entityStillExists = entities.some((entity) => entity.id === activeEntity.id)
    if (!entityStillExists) setActiveEntity(null)
  }, [activeEntity, entities])

  const openAddModal = () => {
    setFormError('')
    setWaypointForm(EMPTY_FORM)
    setIsAddModalOpen(true)
  }

  const closeAddModal = () => {
    setFormError('')
    setWaypointForm(EMPTY_FORM)
    setIsAddModalOpen(false)
    setIsPickingCoordinates(false)
  }

  const focusEntity = (entity, visiblePoints = []) => {
    setActiveEntity(entity)
    const map = mapRef.current
    if (!map) return

    const pointsToShow = visiblePoints.length > 1 ? visiblePoints : entity.coordinates

    if (pointsToShow.length > 1) {
      const latLngBounds = L.latLngBounds(pointsToShow.map((coordinate) => L.latLng(coordinate)))
      map.flyToBounds(latLngBounds, {
        animate: true,
        duration: 0.65,
        paddingTopLeft: L.point(isSidebarCollapsed ? 54 : 340, 120),
        paddingBottomRight: L.point(450, 80),
        maxZoom: 15,
      })
      return
    }

    const targetZoom = Math.max(map.getZoom(), 14)
    const targetLatLng = L.latLng(pointsToShow[0])
    const projectedTarget = map.project(targetLatLng, targetZoom)
    const mapSize = map.getSize()
    const viewportCenter = L.point(mapSize.x / 2, mapSize.y / 2)
    const desiredPoint = L.point(mapSize.x * 0.33, mapSize.y / 2)
    const offset = desiredPoint.subtract(viewportCenter)
    const offsetCenter = map.unproject(projectedTarget.subtract(offset), targetZoom)

    map.flyTo(offsetCenter, targetZoom, {
      animate: true,
      duration: 0.65,
    })
  }

  const handleFieldChange = (event) => {
    const { name, value } = event.target
    setWaypointForm((current) => ({ ...current, [name]: value }))
  }

  const handleFileChange = (event) => {
    const fileList = event.target.files ? Array.from(event.target.files) : []
    setWaypointForm((current) => ({ ...current, files: fileList }))
  }

  const handleAddWaypoint = async (event) => {
    event.preventDefault()
    const latitude = Number(waypointForm.latitude)
    const longitude = Number(waypointForm.longitude)
    const name = waypointForm.name.trim()
    const story = waypointForm.story.trim()

    if (!name || !story) {
      setFormError('Name and story are required.')
      return
    }

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      setFormError('Latitude and longitude must be valid numbers.')
      return
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      setFormError('Coordinates are out of range.')
      return
    }

    setFormError('')
    setIsSavingWaypoint(true)

    try {
      const newWaypoint = await addEntity({
        type: 'submission',
        name,
        summary: story,
        dates: 'Community submission',
        coordinates: [[latitude, longitude]],
        uploadedFiles: waypointForm.files.map((file) => file.name),
        source: 'user',
      })

      setFirebaseEntities((current) => [...current, newWaypoint])
      setActiveEntity(newWaypoint)
      closeAddModal()
    } catch (error) {
      console.error('Failed to save waypoint to Firestore:', error)
      setFormError('Could not save to Firebase. Please try again.')
    } finally {
      setIsSavingWaypoint(false)
    }
  }

  const startCoordinatePicker = () => {
    setFormError('')
    setIsAddModalOpen(false)
    setIsPickingCoordinates(true)
  }

  const cancelCoordinatePicker = () => {
    setIsPickingCoordinates(false)
    setIsAddModalOpen(true)
  }

  useEffect(() => {
    if (!mapRef.current || !isPickingCoordinates) return
    const map = mapRef.current
    const container = map.getContainer()
    container.style.cursor = 'crosshair'

    const handleMapClick = (event) => {
      const { lat, lng } = event.latlng
      setWaypointForm((current) => ({
        ...current,
        latitude: lat.toFixed(6),
        longitude: lng.toFixed(6),
      }))
      setIsPickingCoordinates(false)
      setIsAddModalOpen(true)
    }

    map.on('click', handleMapClick)

    return () => {
      map.off('click', handleMapClick)
      container.style.cursor = ''
    }
  }, [isPickingCoordinates])

  const handleAdminLogin = async () => {
    setIsSigningIn(true)
    try {
      const user = await signInWithGoogle()
      console.log('Signed in with Google email:', user?.email ?? '(no email)')
    } catch (error) {
      console.error('Google sign-in failed:', error)
    } finally {
      setIsSigningIn(false)
    }
  }

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
            <button type="button" className="admin-login-btn" onClick={handleAdminLogin} disabled={isSigningIn}>
              {isSigningIn ? 'Signing in...' : 'Admin Login'}
            </button>
            <button type="button" className="add-waypoint-btn" onClick={openAddModal}>
              + Add Connection
            </button>
            {/* <div className="status">
              <span className="stat-chip">Zoom {zoom}</span>
              <span className="stat-chip">{visibleEntities.length} visible</span>
              <span className="stat-chip">Style: Carto Light</span>
              {/* Map style selector temporarily disabled to keep navigation focused. */}
            {/* </div> */} 
          </div>
        </header>
        <aside className={isSidebarCollapsed ? 'visible-sidebar collapsed' : 'visible-sidebar'}>
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setIsSidebarCollapsed((current) => !current)}
            aria-expanded={!isSidebarCollapsed}
          >
            <span className="burger-icon" aria-hidden="true">
              <span />
              <span />
              <span />
            </span>
            <span className="sidebar-toggle-label">
              {isSidebarCollapsed ? 'Open visible list' : 'Hide visible list'}
            </span>
          </button>
          <div className="visible-sidebar-body">
            <p className="eyebrow">On-screen waypoints</p>
            <h3>Visible People & Sites</h3>
            {entitiesStatus === 'loading' ? (
              <p className="sidebar-empty">Loading waypoints from Firestore...</p>
            ) : null}
            {entitiesStatus === 'error' ? (
              <p className="sidebar-empty">{entitiesError}</p>
            ) : null}
            {!showMarkers ? (
              <p className="sidebar-empty">
                Zoom Further in to see a list of people.
              </p>
            ) : null}
            {showMarkers && visibleEntities.length === 0 ? (
              <p className="sidebar-empty">
                No waypoints in this view. Pan or zoom to another area.
              </p>
            ) : null}
            {showMarkers && visibleEntities.length ? (
              <ul className="visible-stack">
                {visibleEntities.map((entry) => (
                  <li key={entry.entity.id}>
                    <button
                      type="button"
                      className={activeEntity?.id === entry.entity.id ? 'active' : ''}
                      aria-current={activeEntity?.id === entry.entity.id ? 'true' : undefined}
                      onClick={() => focusEntity(entry.entity, entry.visiblePoints)}
                    >
                      <span className="stack-type">{entry.entity.type}</span>
                      <strong>{entry.entity.name}</strong>
                      <span>
                        {entry.entity.dates}
                        {entry.visiblePointCount > 1
                          ? ` • ${entry.visiblePointCount} points in view`
                          : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </aside>
        <div ref={mapContainerRef} className="map" />
        {isPickingCoordinates ? (
          <div className="map-pick-banner">
            <span>Click on the map to set waypoint coordinates.</span>
            <button type="button" onClick={cancelCoordinatePicker}>
              Cancel
            </button>
          </div>
        ) : null}
        <aside className={activeEntity ? 'details-drawer' : 'details-drawer empty'}>
          {activeEntity ? (
            <>
              <div className="drawer-header">
                <div>
                  <p className="eyebrow">{activeEntity.type}</p>
                  <h2>{activeEntity.name}</h2>
                </div>
                <button type="button" className="drawer-close" onClick={() => setActiveEntity(null)}>
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
                Click a waypoint from the map or visible list to read more details here. The map recenters toward
                the left so you can keep exploring while reading.
              </p>
            </div>
          )}
        </aside>
      </section>

      {isAddModalOpen ? (
        <div className="entity-modal-backdrop" role="presentation" onClick={closeAddModal}>
          <section
            className="entity-modal form-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Add waypoint"
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="entity-modal-close" onClick={closeAddModal}>
              Close
            </button>
            <p className="eyebrow">New waypoint request</p>
            <h2>Add a Waypoint</h2>
            <form className="add-waypoint-form" onSubmit={handleAddWaypoint}>
              <label>
                Name
                <input
                  name="name"
                  type="text"
                  value={waypointForm.name}
                  onChange={handleFieldChange}
                  placeholder="Person or place name"
                  required
                />
              </label>
              <label>
                Story
                <textarea
                  name="story"
                  value={waypointForm.story}
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
                    value={waypointForm.latitude}
                    onChange={handleFieldChange}
                    placeholder="33.7490"
                    required
                  />
                </label>
                <label>
                  Longitude
                  <input
                    name="longitude"
                    type="number"
                    step="any"
                    value={waypointForm.longitude}
                    onChange={handleFieldChange}
                    placeholder="-84.3880"
                    required
                  />
                </label>
              </div>
              <button type="button" className="pick-coord-btn" onClick={startCoordinatePicker}>
                Select coordinates on map
              </button>
              <label>
                Upload files
                <input type="file" multiple onChange={handleFileChange} />
              </label>
              {waypointForm.files.length ? (
                <ul className="selected-files">
                  {waypointForm.files.map((file) => (
                    <li key={`${file.name}-${file.size}`}>{file.name}</li>
                  ))}
                </ul>
              ) : null}
              {formError ? <p className="form-error">{formError}</p> : null}
              <button type="submit" className="submit-btn" disabled={isSavingWaypoint}>
                {isSavingWaypoint ? 'Saving to Firebase...' : 'Save waypoint'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
