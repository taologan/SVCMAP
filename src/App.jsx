import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import 'leaflet/dist/leaflet.css'
import './App.css'

const EMPTY_FORM = {
  name: '',
  story: '',
  latitude: '',
  longitude: '',
  files: [],
}

const MARKER_VISIBILITY_ZOOM = 12

const MOCK_ENTITIES = [
  {
    id: 'john-wesley-dobbs',
    type: 'person',
    name: 'John Wesley Dobbs and Family',
    summary:
      "Often referred to as the unofficial mayor of Auburn Avenue, Dobbs coined the term 'Sweet Auburn' and helped lead major voter registration and civic organizing in Atlanta's Black community.",
    dates: 'Voting rights advocate',
    coordinates: [
      [33.7554, -84.3738],
      [33.7559, -84.3729],
    ],
  },
  {
    id: 'clara-maxwell-cater-pitts',
    type: 'person',
    name: 'Clara Maxwell Cater Pitts',
    summary:
      'Pitts served as superintendent of the Carrie Steele Orphans Home, modernized its operations, and was later honored with the renamed Carrie Steele Pitts Home and a school in her name.',
    dates: 'Educator and orphanage manager',
    coordinates: [
      [33.7347, -84.4152],
      [33.7388, -84.4126],
    ],
  },
  {
    id: 'moses-amos',
    type: 'person',
    name: 'Moses Amos',
    summary:
      'Amos became the first African American granted a Georgia druggist license in 1911 and built Gate City Drug Store into a hub of mentorship and opportunity.',
    dates: 'First licensed Black pharmacist in Georgia',
    coordinates: [
      [33.7598, -84.3878],
      [33.7555, -84.3735],
    ],
  },
  {
    id: 'dinah-watts-pace',
    type: 'person',
    name: 'Dinah Watts Pace',
    summary:
      'Born enslaved in 1833, Pace founded one of Georgia’s earliest orphanages for African American children and helped build foundational faith and education institutions.',
    dates: 'Educator and orphanage founder',
    coordinates: [
      [33.7366, -84.3866],
      [33.5968, -83.8602],
    ],
  },
  {
    id: 'adrienne-herndon',
    type: 'person',
    name: 'Adrienne Herndon',
    summary:
      'Herndon was an educator and performer who became one of Atlanta University’s first Black faculty members and later designed the Herndon family’s Diamond Hill estate.',
    dates: 'Educator and actor',
    coordinates: [
      [33.749, -84.4122],
      [33.7674, -84.3992],
    ],
  },
  {
    id: 'george-union-wilder',
    type: 'person',
    name: 'George "Union" Wilder',
    summary:
      'In Brownsville, Wilder was killed while defending his home during the 1906 Race Massacre; this resistance slowed white mobs as violence spread.',
    dates: 'Victim of the 1906 Race Massacre',
    coordinates: [[33.6893, -84.3885]],
  },
  {
    id: 'ad-jennie-williams',
    type: 'person',
    name: 'A. D. and Jennie Williams',
    summary:
      "A.D. Williams and Jennie Parks Williams shaped Ebenezer’s civic and faith leadership, with A.D. also helping found the Atlanta NAACP branch.",
    dates: 'Grandparents of Dr. Martin Luther King Jr.',
    coordinates: [
      [33.7542, -84.3738],
      [33.7546, -84.3729],
    ],
  },
  {
    id: 'walter-westmoreland',
    type: 'person',
    name: 'Walter Westmoreland',
    summary:
      "Westmoreland, a Morehouse and Atlanta University graduate, served as a Tuskegee Airman with the Red Tail Flyers during WWII.",
    dates: 'First Lieutenant, Tuskegee Airman',
    coordinates: [[33.7478, -84.4141]],
  },
  {
    id: 'mlk-sr-and-alberta',
    type: 'person',
    name: 'Rev. and Mrs. Martin Luther King, Sr.',
    summary:
      'Rev. Martin Luther King Sr. and Alberta Williams King helped shape Atlanta’s religious and civic life through decades of leadership at Ebenezer and beyond.',
    dates: 'Parents of Dr. Martin Luther King Jr.',
    coordinates: [
      [33.7542, -84.3738],
      [33.749, -84.388],
    ],
  },
  {
    id: 'henry-aaron',
    type: 'person',
    name: 'Henry Aaron',
    summary:
      "Aaron broke baseball barriers on and off the field, then leveraged his legacy to support civil rights and public service causes.",
    dates: 'Baseball legend and civil rights supporter',
    coordinates: [
      [33.7348, -84.3899],
      [33.755, -84.3727],
    ],
  },
  {
    id: 'julian-bond',
    type: 'person',
    name: 'Julian Bond',
    summary:
      'Bond rose from student activism at Morehouse to SNCC leadership and major public service in Georgia politics and civil rights advocacy.',
    dates: 'Civil rights organizer and legislator',
    coordinates: [
      [33.7478, -84.4141],
      [33.749, -84.3878],
    ],
  },
  {
    id: 'john-lewis',
    type: 'person',
    name: 'Congressman John Lewis',
    summary:
      'Lewis bridged grassroots civil rights organizing and national public office, representing Georgia while sustaining movement leadership for decades.',
    dates: 'Civil rights leader and U.S. Congressman',
    coordinates: [
      [33.7552, -84.3903],
      [33.7493, -84.3884],
    ],
  },
]

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
  const [userWaypoints, setUserWaypoints] = useState([])
  const entities = useMemo(
    () => [...MOCK_ENTITIES, ...userWaypoints],
    [userWaypoints],
  )
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

  const handleAddWaypoint = (event) => {
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

    const newWaypoint = {
      id: `user-${Date.now()}`,
      type: 'submission',
      name,
      summary: story,
      dates: 'Community submission',
      coordinates: [[latitude, longitude]],
      uploadedFiles: waypointForm.files.map((file) => file.name),
    }

    setUserWaypoints((current) => [...current, newWaypoint])
    setActiveEntity(newWaypoint)
    closeAddModal()
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

  return (
    <main className="app">
      <section className="map-shell">
        <header className="top-bar">
          <div className="title-wrap">
            <p className="eyebrow">South-View Cemetery</p>
            <h1>Atlanta Community Story Map</h1>
            <p className="subtitle">
              Frontend prototype with local data, heatmap, and zoom-based markers.
            </p>
          </div>
          <div className="header-controls">
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
              <button type="submit" className="submit-btn">
                Save local waypoint
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
