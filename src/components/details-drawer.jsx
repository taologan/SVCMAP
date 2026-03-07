function DetailsDrawer({ activeEntity, onClose }) {
  const isLink = (value) => /^https?:\/\//i.test(value);

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
