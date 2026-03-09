function DetailsDrawer({ activeEntity, onClose }) {
  const isLink = (value) => /^https?:\/\//i.test(value);
  const isImageLink = (value) => {
    if (!isLink(value)) return false;

    try {
      const parsed = new URL(value);
      const decodedPath = decodeURIComponent(parsed.pathname).toLowerCase();
      return /\.(avif|bmp|gif|heic|heif|jpe?g|png|svg|webp)$/.test(decodedPath);
    } catch {
      return false;
    }
  };

  return (
    <aside className={activeEntity ? "details-drawer" : "details-drawer empty"}>
      {activeEntity ? (
        <>
          <div className="drawer-header">
            <div>
              <p className="eyebrow">Waypoint</p>
              <h2>{activeEntity.name}</h2>
            </div>
            <button type="button" className="drawer-close" onClick={onClose}>
              Close
            </button>
          </div>
          <div className="drawer-body">
            <p>{activeEntity.summary}</p>
            {activeEntity.role ? (
              <p>
                <strong>Role:</strong> {activeEntity.role}
              </p>
            ) : null}
            {activeEntity.uploadedFiles?.length ? (
              <div className="file-list">
                <strong>Files:</strong>
                <ul>
                  {activeEntity.uploadedFiles.map((fileRef) => {
                    if (!isLink(fileRef)) {
                      return <li key={fileRef}>{fileRef}</li>;
                    }

                    if (isImageLink(fileRef)) {
                      return (
                        <li key={fileRef} className="file-item image">
                          <a href={fileRef} target="_blank" rel="noreferrer">
                            <img
                              src={fileRef}
                              alt="Uploaded waypoint"
                              className="file-image-preview"
                              loading="lazy"
                            />
                          </a>
                          <a href={fileRef} target="_blank" rel="noreferrer">
                            Open image
                          </a>
                        </li>
                      );
                    }

                    return (
                      <li key={fileRef}>
                        <a href={fileRef} target="_blank" rel="noreferrer">
                          {fileRef}
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
