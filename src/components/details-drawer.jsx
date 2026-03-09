function DetailsDrawer({ activeEntity, onClose }) {
  const isLink = (value) => /^https?:\/\//i.test(value);
  const getLowercaseExtension = (value) => {
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
  };
  const isImageFile = (value) =>
    ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg", "avif"].includes(
      getLowercaseExtension(value),
    );
  const isAudioFile = (value) =>
    ["mp3", "m4a", "wav", "ogg", "aac", "flac"].includes(
      getLowercaseExtension(value),
    );

  return (
    <aside className={activeEntity ? "details-drawer" : "details-drawer empty"}>
      {activeEntity ? (
        <>
          <div className="drawer-header">
            <div>
              <p className="eyebrow">{activeEntity.type}</p>
              <h2>{activeEntity.name}</h2>
            </div>
            <button type="button" className="drawer-close" onClick={onClose}>
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
                  {activeEntity.uploadedFiles.map((fileName) => {
                    if (!isLink(fileName)) {
                      return <li key={fileName}>{fileName}</li>;
                    }

                    if (isImageFile(fileName)) {
                      return (
                        <li key={fileName} className="file-preview-item">
                          <img
                            src={fileName}
                            alt={`${activeEntity.name} attachment`}
                            className="drawer-image-preview"
                            loading="lazy"
                          />
                          <a href={fileName} target="_blank" rel="noreferrer">
                            Open image
                          </a>
                        </li>
                      );
                    }

                    if (isAudioFile(fileName)) {
                      return (
                        <li key={fileName} className="file-preview-item">
                          <audio controls preload="none" className="drawer-audio-preview">
                            <source src={fileName} />
                            Your browser does not support audio playback.
                          </audio>
                          <a href={fileName} target="_blank" rel="noreferrer">
                            Open audio file
                          </a>
                        </li>
                      );
                    }

                    return (
                      <li key={fileName}>
                        <a href={fileName} target="_blank" rel="noreferrer">
                          {fileName}
                        </a>
                      </li>
                    );
                  })}
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
            Click a waypoint from the map or visible list to read more details here. The
            map recenters toward the left so you can keep exploring while reading.
          </p>
        </div>
      )}
    </aside>
  );
}

export default DetailsDrawer;
