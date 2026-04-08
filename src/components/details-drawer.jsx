import { useEffect, useMemo, useRef, useState } from "react";
import L from "leaflet";
import { CARTO_LIGHT_BASEMAP } from "../constants";

const IMAGE_EXTENSIONS = new Set([
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "bmp",
  "svg",
  "avif",
]);

const AUDIO_EXTENSIONS = new Set(["mp3", "m4a", "wav", "ogg", "aac", "flac"]);

function isLink(value) {
  return /^https?:\/\//i.test(value);
}

function getLowercaseExtension(value) {
  const source = (value ?? "").trim();
  if (!source) return "";

  if (isLink(source)) {
    try {
      const parsedUrl = new URL(source);
      const decodedPath = decodeURIComponent(parsedUrl.pathname);
      const pathSegment = decodedPath.split("/").pop() ?? "";
      const fileName = pathSegment.split("?")[0];
      const dotIndex = fileName.lastIndexOf(".");
      return dotIndex >= 0 ? fileName.slice(dotIndex + 1).toLowerCase() : "";
    } catch {
      return "";
    }
  }

  const dotIndex = source.lastIndexOf(".");
  return dotIndex >= 0 ? source.slice(dotIndex + 1).toLowerCase() : "";
}

function isImageFile(value) {
  return IMAGE_EXTENSIONS.has(getLowercaseExtension(value));
}

function isAudioFile(value) {
  return AUDIO_EXTENSIONS.has(getLowercaseExtension(value));
}

function makeDisplayLabel(url, fallbackLabel) {
  if (!isLink(url)) return fallbackLabel || url;

  try {
    const parsedUrl = new URL(url);
    const fileName = decodeURIComponent(parsedUrl.pathname.split("/").pop() ?? "");
    return fileName || fallbackLabel || url;
  } catch {
    return fallbackLabel || url;
  }
}

function StoryPointsMap({ entity }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer(CARTO_LIGHT_BASEMAP.url, CARTO_LIGHT_BASEMAP.options).addTo(map);
    L.control.zoom({ position: "bottomright" }).addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !entity?.coordinates?.length) return;

    const layerGroup = L.layerGroup().addTo(map);
    const latLngs = entity.coordinates.map((coordinate) => L.latLng(coordinate));

    latLngs.forEach((latLng, index) => {
      L.circleMarker(latLng, {
        radius: 8,
        color: "#b82457",
        weight: 2,
        fillColor: "#d24473",
        fillOpacity: 0.92,
      })
        .bindTooltip(`Point ${index + 1}`, {
          direction: "top",
          offset: [0, -8],
        })
        .addTo(layerGroup);
    });

    if (latLngs.length === 1) {
      map.setView(latLngs[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(latLngs), { padding: [24, 24], maxZoom: 15 });
    }

    return () => {
      layerGroup.remove();
    };
  }, [entity]);

  return <div ref={containerRef} className="story-points-map" />;
}

function DetailsDrawer({ activeEntity, onClose }) {
  const mediaGroups = useMemo(() => {
    const uploadedFiles = activeEntity?.uploadedFiles ?? [];
    return uploadedFiles.reduce(
      (groups, fileRef) => {
        if (isImageFile(fileRef)) {
          groups.images.push(fileRef);
        } else if (isAudioFile(fileRef)) {
          groups.audio.push(fileRef);
        } else {
          groups.other.push(fileRef);
        }
        return groups;
      },
      { images: [], audio: [], other: [] },
    );
  }, [activeEntity]);

  const [selectedImageRef, setSelectedImageRef] = useState(null);

  useEffect(() => {
    if (!activeEntity) return undefined;

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose?.();
      }
    };

    document.body.classList.add("story-modal-open");
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.classList.remove("story-modal-open");
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeEntity, onClose]);

  if (!activeEntity) return null;

  const safeImageIndex = selectedImageRef
    ? Math.max(mediaGroups.images.indexOf(selectedImageRef), 0)
    : 0;
  const activeImage = mediaGroups.images[safeImageIndex] ?? null;
  const hasMultipleImages = mediaGroups.images.length > 1;
  const metadataLine = [
    activeEntity.role,
    // activeEntity.storyType,
    // activeEntity.neighborhood,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="story-modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="details-drawer fullscreen"
        role="dialog"
        aria-modal="true"
        aria-label={`${activeEntity.name} story`}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="story-modal-shell">
          <header className="story-modal-header">
            <div className="story-modal-title-block">
              <p className="eyebrow">South-View Story</p>
              <h2>{activeEntity.name}</h2>
              {metadataLine ? <p className="story-modal-meta">{metadataLine}</p> : null}
            </div>
            <button type="button" className="story-modal-close static" onClick={onClose}>
              Close
            </button>
          </header>

          <div className="story-modal-content">
            <div className="story-listing-main">
              <div className="story-section">
                <p className="eyebrow">Gallery</p>
                <h3>Photos</h3>
                <div className="story-gallery in-body">
                  <div className="story-gallery-main in-body">
                    {activeImage ? (
                      <>
                        <img
                          src={activeImage}
                          alt={`${activeEntity.name} gallery image ${safeImageIndex + 1}`}
                          className="story-gallery-hero"
                        />
                        {hasMultipleImages ? (
                          <div className="story-gallery-controls">
                            <button
                              type="button"
                              className="story-gallery-nav"
                              onClick={() =>
                                setSelectedImageRef(
                                  mediaGroups.images[
                                    (safeImageIndex - 1 + mediaGroups.images.length) %
                                      mediaGroups.images.length
                                  ],
                                )
                              }
                            >
                              Prev
                            </button>
                            <span className="story-gallery-count">
                              {safeImageIndex + 1} / {mediaGroups.images.length}
                            </span>
                            <button
                              type="button"
                              className="story-gallery-nav"
                              onClick={() =>
                                setSelectedImageRef(
                                  mediaGroups.images[
                                    (safeImageIndex + 1) % mediaGroups.images.length
                                  ],
                                )
                              }
                            >
                              Next
                            </button>
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <div className="story-gallery-placeholder" />
                    )}
                  </div>
                  {mediaGroups.images.length ? null : (
                    <p className="story-gallery-note">
                      Images will appear here once the upload pipeline is connected.
                    </p>
                  )}
                </div>
              </div>

              <div className="story-section">
                <p className="eyebrow">Story</p>
                <h3>Overview</h3>
                <p className="story-summary">{activeEntity.summary}</p>
              </div>

              {/* {activeEntity.sourceUrl ? (
                <div className="story-section">
                  <p className="eyebrow">Primary Source</p>
                  <h3>South-View Resource</h3>
                  <a href={activeEntity.sourceUrl} target="_blank" rel="noreferrer">
                    {activeEntity.sourceLabel || activeEntity.sourceUrl}
                  </a>
                </div>
              ) : null} */}

              {mediaGroups.audio.length ? (
                <div className="story-section">
                  <p className="eyebrow">Media</p>
                  <h3>Audio</h3>
                  <div className="story-audio-list">
                    {mediaGroups.audio.map((audioRef) => (
                      <div key={audioRef} className="story-audio-card">
                        <audio controls preload="none" className="drawer-audio-preview">
                          <source src={audioRef} />
                          Your browser does not support audio playback.
                        </audio>
                        <a href={audioRef} target="_blank" rel="noreferrer">
                          {makeDisplayLabel(audioRef, "Open audio file")}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {mediaGroups.other.length ? (
                <div className="story-section">
                  <p className="eyebrow">Attachments</p>
                  <h3>Additional Files</h3>
                  <ul className="story-link-list">
                    {mediaGroups.other.map((fileRef) => (
                      <li key={fileRef}>
                        {isLink(fileRef) ? (
                          <a href={fileRef} target="_blank" rel="noreferrer">
                            {makeDisplayLabel(fileRef, fileRef)}
                          </a>
                        ) : (
                          <span>{fileRef}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <aside className="story-listing-sidebar">
              <div className="story-fact-card">
                {/* <p className="eyebrow">Listing Details</p> */}
                <h3>At a Glance</h3>
                <dl className="story-facts">
                  {activeEntity.role ? (
                    <>
                      <dt>Role</dt>
                      <dd>{activeEntity.role}</dd>
                    </>
                  ) : null}
                  {/* {activeEntity.storyType ? (
                    <>
                      <dt>Story Type</dt>
                      <dd>{activeEntity.storyType}</dd>
                    </>
                  ) : null}
                  {activeEntity.neighborhood ? (
                    <>
                      <dt>Atlanta Connection</dt>
                      <dd>{activeEntity.neighborhood}</dd>
                    </>
                  ) : null} */}
                  {activeEntity.graveLocation ? (
                    <>
                      <dt>Burial Location</dt>
                      <dd>{activeEntity.graveLocation}</dd>
                    </>
                  ) : null}
                  <dt>Mapped Points</dt>
                  <dd>{activeEntity.coordinates?.length ?? 0}</dd>
                </dl>
              </div>

              {activeEntity.externalLinks?.length ? (
                <div className="story-fact-card">
                  <p className="eyebrow">Continue Exploring</p>
                  <h3>Related Links</h3>
                  <ul className="story-link-list">
                    {activeEntity.externalLinks.map((link) => (
                      <li key={`${link.url}-${link.label}`}>
                        <a href={link.url} target="_blank" rel="noreferrer">
                          {link.label}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="story-fact-card">
                <p className="eyebrow">Map Connection</p>
                <h3>Mapped Presence</h3>
                <StoryPointsMap entity={activeEntity} />
              </div>
            </aside>
          </div>
        </div>
      </section>
    </div>
  );
}

export default DetailsDrawer;
