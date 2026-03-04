import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet.heat'
import './leaflet-smooth-wheel-zoom'
import 'leaflet/dist/leaflet.css'
import './App.css'

const EMPTY_FORM = {
  name: '',
  story: '',
  latitude: '',
  longitude: '',
  uploadedImages: [],
}
const LOCAL_STORAGE_PENDING_KEY = 'svcmap_pending_requests_v1'
const LOCAL_STORAGE_APPROVED_KEY = 'svcmap_approved_waypoints_v1'

const MARKER_VISIBILITY_ZOOM = 11.75
const HEAT_HIDE_AT_ZOOM = 15
const IMAGE_BY_ENTITY_ID = {
  'john-wesley-dobbs': 'John Wesley Dobbs.jpg',
  'clara-maxwell-cater-pitts': 'Clara Pitts.png',
  'moses-amos': 'Moses Amos.jpeg',
  'dinah-watts-pace': 'Dinah Watts Pace.jpg',
  'adrienne-herndon': 'Adrienne Herndon.jpg',
  'george-union-wilder': 'George _Union_ Wilder.jpg',
  'ad-jennie-williams': 'A. D. and Jennie Williams.jpg',
  'walter-westmoreland': 'Walter Westmoreland.jpg',
  'mlk-sr-and-alberta': 'Rev. and Mrs. Martin Luther King, Sr..png',
  'henry-aaron': 'Henry Aaron.png',
  'julian-bond': 'Julian Bond.jpg',
  'john-lewis': 'Congressman John Lewis.jpg',
  'william-guest': 'william-guest.jpeg',
}

const MOCK_ENTITIES = [
  {
    id: 'john-wesley-dobbs',
    type: 'person',
    name: 'John Wesley Dobbs and Family',
    summary: `Often referred to as the unofficial mayor of Auburn Avenue, Dobbs coined the term ‘Sweet Auburn,’ an expression of the area's thriving businesses and active social and civic life.” Dobbs was a member of the Prince Hall Masons. The broken column on his gravesite indicates that he held the office of Grand Master until his death. It also contains the masonic symbol. In the 1930s and 40s Dobbs helped establish the Atlanta Civic and Political League, the Atlanta Negro Voters League, and the Georgia Voters League. In the 1940s, he led a voter registration drive that was considered the birth of Atlanta’s modern Civil Rights Era. He was instrumental in the desegregation of the Atlanta police department when eight black men joined the force in 1948. They used the Butler Street YMCA as their precinct. These early officers were not allowed to wear their uniforms to and from work, and they only patrolled black sections of the city, on foot. They were not allowed to drive squad cars or arrest white Americans.`,
    coordinates: [
      [33.7554, -84.3738],
      [33.7559, -84.3729],
    ],
  },
  {
    id: 'clara-maxwell-cater-pitts',
    type: 'person',
    name: 'Clara Maxwell Cater Pitts',
    summary: `Pitts servied as the superintendent of the Carrie Steele Orphans Home. During her administration she updated the operation and relocated the facility to Roy Street in southwest Atlnata. She also secured funding for the home through the Atlanta Community Chest (later the United Way) To reflect her years of dedication and service, in 1950 the name o fthe home was changed to the Carrie Steele Pitts Home. An Atlanta Public School was also named in her honor.`,
    coordinates: [
      [33.7347, -84.4152],
      [33.7388, -84.4126],
    ],
  },
  {
    id: 'moses-amos',
    type: 'person',
    name: 'Moses Amos',
    summary: `In June 1911 Amos passed the Georgai State pharmacy Exam and became the first African American granted a druggist license by the Georgia State Boare of Pharmacy. He worked at the Huss Pharmacy on Peachtree Street as a young man. Then he became the Proprietor of the Gate City Drug Store on Auburn Ave. In 1914 he opened a new Gate City Drugstore in the Odd Fellows building. He hired the first African American woman to work ina publie place in Atlanta and employed nine young African American men who later earned college degrees and went on to establish careers in pharmacy, medicine and dentistry.`,
    coordinates: [
      [33.7598, -84.3878],
      [33.7555, -84.3735],
    ],
  },
  {
    id: 'dinah-watts-pace',
    type: 'person',
    name: 'Dinah Watts Pace',
    summary: `Born enslaved in Athens GA in 1833, she founded one of the first orphanages for African American children in Georgia. As a teenager, she started a Sunday School in her neighborhood, Summer Hill, that grew in to the Reed Street Baptist Church (today Pardise Missionary Baptist Church). Pace graduated from Atlanta University with a teaching certificate and started teaching in Covington, Georgia. 2 years later she started the Covington Colored Orphans Home. The students of Wellesley College in Massachusets were regular contributors to the home. The orphanage operated until 1930 when Pase was badly burned in a open fireplace and died a few days later.`,
    coordinates: [
      [33.7366, -84.3866],
      [33.5968, -83.8602],
    ],
  },
  {
    id: 'adrienne-herndon',
    type: 'person',
    name: 'Adrienne Herndon',
    summary: `Herndon graduated from Atlanta University and became one of the first African American faculty members at her alma mater. She taught elecution and staged Shakespearean productions. She dreamed of becoming a professional actor and made her debut in Boston in 1904. She used the satge name Anne Du Bignon. She graduated from the School of Dramatic Arts in New York City in 1908. She designed Diamond Hill, the Herndon family's two story, fifteen room mansion in Atlanta.`,
    coordinates: [
      [33.749, -84.4122],
      [33.7674, -84.3992],
    ],
  },
  {
    id: 'george-union-wilder',
    type: 'person',
    name: 'George "Union" Wilder',
    summary: `In the Brownsville Community, a mob of White men killed Union Army Veteran George Wilder as he was defending his home with a muzzle loaded musket. The stand against the white mobs in Brownsville likely slowed the rioters as they lost their momentum. The deaths of 12 African Americans and 2 white men were acknowledged by the police.`,
    coordinates: [[33.6893, -84.3885]],
  },
  {
    id: 'ad-jennie-williams',
    type: 'person',
    name: 'A. D. and Jennie Williams',
    summary: `Adam Daniel Williams was the second pastor of Ebenezer Baptist Church. In his first year as pastor he grew the congregation from just a hadful of members to more than 60. He developed Ebenezer as a religious institution that also served as a cemter for politicaland community activities. Williams was president of the Atlanta Baptist Ministers' Union and received his doctor of divinity degree from Morehouse College. In 1917 he helped establish the Atlanta brance of the NAACP and later served as its president. Jennie Celeste Parks was involved in many aspects of Ebenezer and led the church's missionery society. The couple's daughter, Alberta Williams King, was the mother of Martin Luther King, Jr.`,
    coordinates: [
      [33.7542, -84.3738],
      [33.7546, -84.3729],
    ],
  },
  {
    id: 'walter-westmoreland',
    type: 'person',
    name: 'Walter Westmoreland',
    summary: `First Lieutenant Walter D. Westmoreland graduated from Morehouse College and earned a master's degree from Atlanta University. As a Tuskegee Airman, he was one of the African American pilots who service in combat with the Army air forces during WWII. Westmoreland flew with teh 332nd fighter squadron of the 302nd Group. The 332nd painded thie tails of their aircraft a solid red, hense their nickname, the Red Tail Flyers. His plane was shot down on October 13, 1944 while returning from an escort mission to Blexhammer, Germany.`,
    coordinates: [[33.7478, -84.4141]],
  },
  {
    id: 'mlk-sr-and-alberta',
    type: 'person',
    name: 'Rev. and Mrs. Martin Luther King, Sr.',
    summary: `Rev. Martin Luther King Sr was pastor or Ebenezer Baptist Church for 44 year. He was involved in the Atlanta Civic and Political League and the NAACP. He led a voting rights march on Atlanta City Hall in 1936 and advocated for equalization of teacher pay, King served on the boards of Atlanta University and Morehouse College. He was married to Alberta Williams, a church musician. She started the choir at Ebenezer while her father was paster. She was killed by a deranged gunmane as she played "The Lords Prayer" during Sunday worship servie at Ebenezer. She rests on the same side of the crypt where her son's remains were placed n 1968.`,
    coordinates: [
      [33.7542, -84.3738],
      [33.749, -84.388],
    ],
  },
  {
    id: 'henry-aaron',
    type: 'person',
    name: 'Henry Aaron',
    summary: `He surpassed Babe Ruth’s career home run record despite enduring racial insults and threats to his life throughout his career. After retiring as a player, he became the first black American to hold a senior management position in baseball as a front office executive for the Atlanta Braves. He used his Hall of Fame baseball career as a platform to champion civil rights, and he served as a director on the board of the NAACP. President George W. Bush awarded Aaron the Presidential Medal of Freedom for his philanthropy and humanitarian endeavors. The NAACP Legal Defense Fund awarded him the Thurgood Marshall Lifetime Achievement Award. He is included in the International Civil Rights Walk of Fame at the Martin Luther King Jr. National Historic Park.`,
    coordinates: [
      [33.7348, -84.3899],
      [33.755, -84.3727],
    ],
  },
  {
    id: 'julian-bond',
    type: 'person',
    name: 'Julian Bond',
    summary: `A Civil Rights leader, politician, and scholar, his activism started while he was still a student at Morehouse. He was the first leader of SNCC (the Student Nonviolent Coordinating Committee) which brought together college students and other citizen activists to walk picket lines and participate in sit-ins and boycotts. He was elected to the Georgia House of Representatives in 1965, but he was barred from taking his seat because of his outspoken statements against the Vietnam War. It was not until 1967 that he won the right to take his seat through a U.S. Supreme Court decision. Bond served in the Georgia Senate and later served as the first president of the Southern Poverty Law Center. He also served as president of the Atlanta chapter of the NAACP and then as chairman of the national NAACP.`,
    coordinates: [
      [33.7478, -84.4141],
      [33.749, -84.3878],
    ],
  },
  {
    id: 'john-lewis',
    type: 'person',
    name: 'Congressman John Lewis',
    summary: `an American politician and civil rights activist who served in the United States House of Representatives for Georgia's 5th congressional district from 1987 until his death in 2020. He participated in the 1960 Nashville sit-ins, the Freedom Rides, was the chairman of the Student Nonviolent Coordinating Committee (SNCC) from 1963 to 1966, and was one of the "Big Six" leaders of groups who organized the 1963 March on Washington.`,
    coordinates: [
      [33.7552, -84.3903],
      [33.7493, -84.3884],
    ],
  },
  {
    id: 'william-guest',
    type: 'person',
    name: 'William Guest',
    summary: `William Guest was an Atlanta born singer and was one of the signature background vocalists for Gladys Knight & the Pips, helping shape many songs such as "Midnight Train to Georgia." He attended Booker T. Washington High School and first started singing at Mount Moriah Baptist Church.`,
    audioClips: [
      {
        title: 'Midnight Train to Georgia (sample)',
        src: '/audio/gladys-knight.mp3',
      },
    ],
    coordinates: [
      [33.7536477, -84.4217112],
      [33.75, -84.42],
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
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false)
  const [isPickingCoordinates, setIsPickingCoordinates] = useState(false)
  const [waypointForm, setWaypointForm] = useState(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [submissionNotice, setSubmissionNotice] = useState('')
  const [pendingRequests, setPendingRequests] = useState([])
  const [selectedRequestId, setSelectedRequestId] = useState(null)
  const [reviewDraft, setReviewDraft] = useState(null)
  const [userWaypoints, setUserWaypoints] = useState([])
  const entities = useMemo(
    () =>
      [...MOCK_ENTITIES, ...userWaypoints].map((entity) => {
        const imageFile = IMAGE_BY_ENTITY_ID[entity.id]
        if (!imageFile) return entity
        return {
          ...entity,
          imageUrl: `/images/${encodeURIComponent(imageFile)}`,
          imageAlt: entity.name,
        }
      }),
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
  const selectedRequest = useMemo(
    () => pendingRequests.find((request) => request.id === selectedRequestId) ?? null,
    [pendingRequests, selectedRequestId],
  )
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
    try {
      const savedPending = localStorage.getItem(LOCAL_STORAGE_PENDING_KEY)
      if (savedPending) {
        const parsed = JSON.parse(savedPending)
        if (Array.isArray(parsed)) setPendingRequests(parsed)
      }
      const savedApproved = localStorage.getItem(LOCAL_STORAGE_APPROVED_KEY)
      if (savedApproved) {
        const parsed = JSON.parse(savedApproved)
        if (Array.isArray(parsed)) setUserWaypoints(parsed)
      }
    } catch (error) {
      console.error('Failed to restore local requests/images:', error)
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_PENDING_KEY, JSON.stringify(pendingRequests))
    } catch (error) {
      console.error('Failed to persist pending requests locally:', error)
    }
  }, [pendingRequests])

  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_APPROVED_KEY, JSON.stringify(userWaypoints))
    } catch (error) {
      console.error('Failed to persist approved waypoints locally:', error)
    }
  }, [userWaypoints])

  useEffect(() => {
    if (!pendingRequests.length) {
      setSelectedRequestId(null)
      setReviewDraft(null)
      return
    }
    if (!selectedRequestId || !pendingRequests.some((request) => request.id === selectedRequestId)) {
      setSelectedRequestId(pendingRequests[0].id)
    }
  }, [pendingRequests, selectedRequestId])

  useEffect(() => {
    if (!selectedRequest) {
      setReviewDraft(null)
      return
    }
    setReviewDraft({
      name: selectedRequest.name,
      summary: selectedRequest.summary,
      latitude: String(selectedRequest.coordinates[0][0]),
      longitude: String(selectedRequest.coordinates[0][1]),
      uploadedImages: selectedRequest.uploadedImages ?? [],
    })
  }, [selectedRequest])


  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
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
    const onSmoothZoom = () => {
      if (heatLayerRef.current) heatLayerRef.current.redraw()
    }

    map.on('zoomend', syncViewportState)
    map.on('moveend', syncViewportState)
    map.on('smoothzoom', onSmoothZoom)

    return () => {
      map.off('zoomend', syncViewportState)
      map.off('moveend', syncViewportState)
      map.off('smoothzoom', onSmoothZoom)
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

    const showHeat = zoom <= HEAT_HIDE_AT_ZOOM

    if (showHeat) {
      const heatPoints = pointEntities.map((pointEntity) => [
        pointEntity.coordinate[0],
        pointEntity.coordinate[1],
      ])
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 30,
        blur: 22,
        maxZoom: 18,
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
        setIsAdminPanelOpen(false)
        setIsPickingCoordinates(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const openAddModal = () => {
    setFormError('')
    setSubmissionNotice('')
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

  const handleFileChange = async (event) => {
    try {
      const fileList = event.target.files ? Array.from(event.target.files) : []
      const imageFiles = fileList.filter((file) => file.type.startsWith('image/'))
      const uploads = await Promise.all(
        imageFiles.map(
          (file) =>
            new Promise((resolve, reject) => {
              const reader = new FileReader()
              reader.onload = () =>
                resolve({
                  name: file.name,
                  type: file.type,
                  dataUrl: String(reader.result ?? ''),
                })
              reader.onerror = () => reject(new Error(`Failed to read ${file.name}`))
              reader.readAsDataURL(file)
            }),
        ),
      )

      setWaypointForm((current) => ({ ...current, uploadedImages: uploads }))
      setFormError('')
    } catch (error) {
      console.error('Failed to process uploaded images:', error)
      setFormError('Could not process one or more images. Please try different files.')
    }
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

    const newRequest = {
      id: `pending-${Date.now()}`,
      type: 'submission',
      name,
      summary: story,
      coordinates: [[latitude, longitude]],
      uploadedImages: waypointForm.uploadedImages,
    }

    setPendingRequests((current) => [newRequest, ...current])
    setSelectedRequestId(newRequest.id)
    setSubmissionNotice('Request submitted for admin review.')
    closeAddModal()
  }

  const handleReviewDraftChange = (event) => {
    const { name, value } = event.target
    setReviewDraft((current) => (current ? { ...current, [name]: value } : current))
  }

  const saveReviewEdits = () => {
    if (!selectedRequest || !reviewDraft) return
    const latitude = Number(reviewDraft.latitude)
    const longitude = Number(reviewDraft.longitude)
    const name = reviewDraft.name.trim()
    const summary = reviewDraft.summary.trim()

    if (!name || !summary || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return
    }

    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return
    }

    setPendingRequests((current) =>
      current.map((request) =>
        request.id === selectedRequest.id
          ? {
              ...request,
              name,
              summary,
              coordinates: [[latitude, longitude]],
              uploadedImages: reviewDraft.uploadedImages ?? [],
            }
          : request,
      ),
    )
  }

  const approveRequest = () => {
    if (!selectedRequest || !reviewDraft) return
    const latitude = Number(reviewDraft.latitude)
    const longitude = Number(reviewDraft.longitude)
    const name = reviewDraft.name.trim()
    const summary = reviewDraft.summary.trim()

    if (!name || !summary || Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return
    }
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return
    }

    const approvedWaypoint = {
      id: `approved-${selectedRequest.id}`,
      type: 'person',
      name,
      summary,
      coordinates: [[latitude, longitude]],
      uploadedImages: reviewDraft.uploadedImages ?? [],
    }

    setUserWaypoints((current) => [approvedWaypoint, ...current])
    setPendingRequests((current) =>
      current.filter((request) => request.id !== selectedRequest.id),
    )
    setActiveEntity(approvedWaypoint)
    setSubmissionNotice('Request approved and added to map.')
  }

  const rejectRequest = () => {
    if (!selectedRequest) return
    setPendingRequests((current) =>
      current.filter((request) => request.id !== selectedRequest.id),
    )
    setSubmissionNotice('Request rejected and removed from queue.')
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
            <button
              type="button"
              className="admin-panel-btn"
              onClick={() => setIsAdminPanelOpen(true)}
            >
              Admin Panel ({pendingRequests.length})
            </button>
            {/* <div className="status">
              <span className="stat-chip">Zoom {zoom}</span>
              <span className="stat-chip">{visibleEntities.length} visible</span>
              <span className="stat-chip">Style: Carto Light</span>
              {submissionNotice ? <span className="stat-chip">{submissionNotice}</span> : null}
            </div> */}
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
                        {entry.visiblePointCount} point
                        {entry.visiblePointCount === 1 ? '' : 's'} in view
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
                {activeEntity.imageUrl ? (
                  <figure className="entity-image">
                    <img src={activeEntity.imageUrl} alt={activeEntity.imageAlt ?? activeEntity.name} />
                  </figure>
                ) : null}
                <p>{activeEntity.summary}</p>
                {activeEntity.audioClips?.length ? (
                  <div className="audio-list">
                    <strong>Audio:</strong>
                    <ul>
                      {activeEntity.audioClips.map((clip) => (
                        <li key={`${clip.src}-${clip.title ?? 'clip'}`}>
                          {clip.title ? <span>{clip.title}</span> : null}
                          <audio controls preload="none" src={clip.src}>
                            Your browser does not support the audio element.
                          </audio>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
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
                {activeEntity.uploadedImages?.length ? (
                  <div className="uploaded-gallery">
                    {activeEntity.uploadedImages.map((image) => (
                      <figure key={`${image.name}-${image.dataUrl.slice(0, 24)}`}>
                        <img src={image.dataUrl} alt={image.name} />
                      </figure>
                    ))}
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
              {waypointForm.uploadedImages.length ? (
                <div className="uploaded-gallery">
                  {waypointForm.uploadedImages.map((image) => (
                    <figure key={`${image.name}-${image.dataUrl.slice(0, 24)}`}>
                      <img src={image.dataUrl} alt={image.name} />
                    </figure>
                  ))}
                </div>
              ) : null}
              {formError ? <p className="form-error">{formError}</p> : null}
              <button type="submit" className="submit-btn">
                Submit request
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {isAdminPanelOpen ? (
        <div className="entity-modal-backdrop" role="presentation" onClick={() => setIsAdminPanelOpen(false)}>
          <section
            className="admin-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Pending waypoint requests"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="admin-panel-header">
              <div>
                <p className="eyebrow">Admin tools</p>
                <h2>Pending Requests</h2>
              </div>
              <button
                type="button"
                className="entity-modal-close"
                onClick={() => setIsAdminPanelOpen(false)}
              >
                Close
              </button>
            </div>

            <div className="admin-panel-grid">
              <aside className="pending-list">
                {pendingRequests.length === 0 ? (
                  <p className="sidebar-empty">No pending requests.</p>
                ) : (
                  <ul>
                    {pendingRequests.map((request) => (
                      <li key={request.id}>
                        <button
                          type="button"
                          className={request.id === selectedRequestId ? 'active' : ''}
                          onClick={() => setSelectedRequestId(request.id)}
                        >
                          <strong>{request.name}</strong>
                          <span>Pending request</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className="review-editor">
                {selectedRequest && reviewDraft ? (
                  <>
                    <label>
                      Name
                      <input
                        name="name"
                        value={reviewDraft.name}
                        onChange={handleReviewDraftChange}
                      />
                    </label>
                    <label>
                      Story
                      <textarea
                        name="summary"
                        rows={6}
                        value={reviewDraft.summary}
                        onChange={handleReviewDraftChange}
                      />
                    </label>
                    <div className="coord-grid">
                      <label>
                        Latitude
                        <input
                          name="latitude"
                          type="number"
                          step="any"
                          value={reviewDraft.latitude}
                          onChange={handleReviewDraftChange}
                        />
                      </label>
                      <label>
                        Longitude
                        <input
                          name="longitude"
                          type="number"
                          step="any"
                          value={reviewDraft.longitude}
                          onChange={handleReviewDraftChange}
                        />
                      </label>
                    </div>
                    {reviewDraft.uploadedImages?.length ? (
                      <div className="uploaded-gallery">
                        {reviewDraft.uploadedImages.map((image) => (
                          <figure key={`${image.name}-${image.dataUrl.slice(0, 24)}`}>
                            <img src={image.dataUrl} alt={image.name} />
                          </figure>
                        ))}
                      </div>
                    ) : null}
                    <div className="admin-actions">
                      <button type="button" className="submit-btn" onClick={saveReviewEdits}>
                        Save edits
                      </button>
                      <button type="button" className="approve-btn" onClick={approveRequest}>
                        Approve
                      </button>
                      <button type="button" className="reject-btn" onClick={rejectRequest}>
                        Reject
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="sidebar-empty">Select a pending request to review.</p>
                )}
              </section>
            </div>
          </section>
        </div>
      ) : null}
    </main>
  )
}

export default App
