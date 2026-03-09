import { useMemo, useState } from "react";

function Sidebar({
  isSidebarCollapsed,
  onToggleCollapse,
  entitiesStatus,
  entitiesError,
  showMarkers,
  visibleEntities,
  activeEntity,
  onFocusEntity,
  onClearActiveEntity,
}) {
  const [sortMode, setSortMode] = useState("map");
  const [nameFilter, setNameFilter] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");

  const filteredVisibleEntities = useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();
    const normalizedKeywordFilter = keywordFilter.trim().toLowerCase();

    return visibleEntities.filter((entry) => {
      const name = (entry.entity.name ?? "").toLowerCase();
      const role = (entry.entity.role ?? "").toLowerCase();
      const summary = (entry.entity.summary ?? "").toLowerCase();

      const matchesName =
        !normalizedNameFilter || name.includes(normalizedNameFilter);
      const matchesKeyword =
        !normalizedKeywordFilter ||
        name.includes(normalizedKeywordFilter) ||
        role.includes(normalizedKeywordFilter) ||
        summary.includes(normalizedKeywordFilter);

      return matchesName && matchesKeyword;
    });
  }, [keywordFilter, nameFilter, visibleEntities]);

  const sortedVisibleEntities = useMemo(() => {
    if (sortMode === "map") return filteredVisibleEntities;

    return [...filteredVisibleEntities].sort((a, b) =>
      a.entity.name.localeCompare(b.entity.name, undefined, {
        sensitivity: "base",
      }),
    );
  }, [filteredVisibleEntities, sortMode]);

  const sidebarEntities = useMemo(() => {
    if (showMarkers) return sortedVisibleEntities;
    if (!activeEntity) return [];
    return [
      {
        entity: activeEntity,
        visiblePointCount: activeEntity.coordinates?.length ?? 1,
        visiblePoints: activeEntity.coordinates ?? [],
      },
    ];
  }, [activeEntity, showMarkers, sortedVisibleEntities]);

  return (
    <aside
      className={
        isSidebarCollapsed ? "visible-sidebar collapsed" : "visible-sidebar"
      }
    >
      <button
        type="button"
        className="sidebar-toggle"
        onClick={onToggleCollapse}
        aria-expanded={!isSidebarCollapsed}
      >
        <span className="burger-icon" aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
        <span className="sidebar-toggle-label">
          {isSidebarCollapsed ? "Open visible list" : "Hide visible list"}
        </span>
      </button>
      <div className="visible-sidebar-body">
        <p className="eyebrow">On-screen waypoints</p>
        <h3>Visible People & Sites</h3>
        <div className="sidebar-controls">
          <label className="sidebar-sort-label" htmlFor="sidebar-sort">
            Sort
          </label>
          <select
            id="sidebar-sort"
            className="sidebar-sort-select"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
          >
            <option value="map">None</option>
            <option value="name">Name (A-Z)</option>
          </select>
        </div>
        <div className="sidebar-filter-grid">
          <label className="sidebar-filter-field" htmlFor="sidebar-person-name">
            Person name
          </label>
          <input
            id="sidebar-person-name"
            className="sidebar-filter-input"
            type="text"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Filter by person name"
          />
          <label className="sidebar-filter-field" htmlFor="sidebar-keywords">
            Keywords
          </label>
          <input
            id="sidebar-keywords"
            className="sidebar-filter-input"
            type="text"
            value={keywordFilter}
            onChange={(event) => setKeywordFilter(event.target.value)}
            placeholder="Filter by story or role"
          />
        </div>
        {entitiesStatus === "loading" ? (
          <p className="sidebar-empty">Loading waypoints from Firestore...</p>
        ) : null}
        {entitiesStatus === "error" ? (
          <p className="sidebar-empty">{entitiesError}</p>
        ) : null}
        {!showMarkers && !activeEntity ? (
          <p className="sidebar-empty">
            Zoom further in to see a list of people.
          </p>
        ) : null}
        {showMarkers && visibleEntities.length === 0 ? (
          <p className="sidebar-empty">
            No waypoints in this view. Pan or zoom to another area.
          </p>
        ) : null}
        {showMarkers &&
        visibleEntities.length > 0 &&
        sortedVisibleEntities.length === 0 ? (
          <p className="sidebar-empty">
            No visible waypoints match the current filters.
          </p>
        ) : null}
        {sidebarEntities.length ? (
          <ul className="visible-stack">
            {sidebarEntities.map((entry) => (
              <li key={entry.entity.id}>
                <button
                  type="button"
                  className={
                    activeEntity?.id === entry.entity.id ? "active" : ""
                  }
                  aria-current={
                    activeEntity?.id === entry.entity.id ? "true" : undefined
                  }
                  onClick={() => {
                    if (activeEntity?.id === entry.entity.id) {
                      onClearActiveEntity?.();
                      return;
                    }
                    onFocusEntity(entry.entity, entry.visiblePoints);
                  }}
                >
                  <strong>{entry.entity.name}</strong>
                  {entry.entity.role || entry.visiblePointCount > 1 ? (
                    <span>
                      {entry.entity.role}
                      {entry.visiblePointCount > 1
                        ? `${entry.entity.role ? " • " : ""}${entry.visiblePointCount} points in view`
                        : ""}
                    </span>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </aside>
  );
}

export default Sidebar;
