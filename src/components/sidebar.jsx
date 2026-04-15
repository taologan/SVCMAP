import { useMemo, useState } from "react";

function Sidebar({
  isSidebarCollapsed,
  onToggleCollapse,
  entitiesStatus,
  entitiesError,
  allEntities = [],
  visibleEntities,
  activeEntity,
  onFocusEntity,
  onClearActiveEntity,
}) {
  const [sortMode, setSortMode] = useState("map");
  const [nameFilter, setNameFilter] = useState("");
  const [keywordFilter, setKeywordFilter] = useState("");
  const [isGlobalSearch, setIsGlobalSearch] = useState(false);

  const visibleEntitiesById = useMemo(
    () => new Map(visibleEntities.map((entry) => [entry.entity.id, entry])),
    [visibleEntities],
  );

  const searchableEntities = useMemo(() => {
    if (!isGlobalSearch) return visibleEntities;

    return allEntities.map((entity) => {
      const visibleEntry = visibleEntitiesById.get(entity.id);
      return {
        entity,
        visiblePointCount: visibleEntry?.visiblePointCount ?? 0,
        visiblePoints: visibleEntry?.visiblePoints ?? [],
      };
    });
  }, [allEntities, isGlobalSearch, visibleEntities, visibleEntitiesById]);

  const filteredEntities = useMemo(() => {
    const normalizedNameFilter = nameFilter.trim().toLowerCase();
    const normalizedKeywordFilter = keywordFilter.trim().toLowerCase();

    return searchableEntities.filter((entry) => {
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
  }, [keywordFilter, nameFilter, searchableEntities]);

  const sortedEntities = useMemo(() => {
    if (sortMode === "map") return filteredEntities;

    return [...filteredEntities].sort((a, b) =>
      a.entity.name.localeCompare(b.entity.name, undefined, {
        sensitivity: "base",
      }),
    );
  }, [filteredEntities, sortMode]);

  const sidebarEntities = sortedEntities;

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
        <h3>{isGlobalSearch ? "All Stories" : "Visible Stories"}</h3>
        <p className="sidebar-intro">
          {isGlobalSearch
            ? "Global search is enabled. Filters run against every story, including off-screen results."
            : "Browse by names and keywords to turn the map into a guided story index instead of a raw marker list."}
        </p>
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
        <label className="sidebar-global-toggle" htmlFor="sidebar-global-search">
          <input
            id="sidebar-global-search"
            type="checkbox"
            checked={isGlobalSearch}
            onChange={(event) => setIsGlobalSearch(event.target.checked)}
          />
          <span>Global search</span>
        </label>
        <div className="sidebar-filter-grid">
          {/* <label className="sidebar-filter-field" htmlFor="sidebar-story-type">
            Story type
          </label>
          <select
            id="sidebar-story-type"
            className="sidebar-filter-input"
            value={storyTypeFilter}
            onChange={(event) => setStoryTypeFilter(event.target.value)}
          >
            <option value="all">All story types</option>
          </select> */}
          <label className="sidebar-filter-field" htmlFor="sidebar-person-name">
            Person or site
          </label>
          <input
            id="sidebar-person-name"
            className="sidebar-filter-input"
            type="text"
            value={nameFilter}
            onChange={(event) => setNameFilter(event.target.value)}
            placeholder="Filter by person or site"
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
            placeholder="Filter by role or story"
          />
        </div>
        {entitiesStatus === "loading" ? (
          <p className="sidebar-empty">Loading waypoints from Firestore...</p>
        ) : null}
        {entitiesStatus === "error" ? (
          <p className="sidebar-empty">{entitiesError}</p>
        ) : null}
        {!isGlobalSearch && visibleEntities.length === 0 ? (
          <p className="sidebar-empty">
            No waypoints in this view. Pan or zoom to another area.
          </p>
        ) : null}
        {isGlobalSearch && entitiesStatus === "success" && allEntities.length === 0 ? (
          <p className="sidebar-empty">No stories available yet.</p>
        ) : null}
        {searchableEntities.length > 0 && sortedEntities.length === 0 ? (
          <p className="sidebar-empty">
            {isGlobalSearch
              ? "No stories match the current filters."
              : "No visible waypoints match the current filters."}
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
                  {entry.entity.role ||
                  entry.visiblePointCount > 1 ||
                  (isGlobalSearch && entry.visiblePointCount <= 1) ? (
                    <span>
                      {[
                        entry.entity.role,
                        entry.visiblePointCount > 1
                          ? `${entry.visiblePointCount} points in view`
                          : isGlobalSearch
                            ? entry.visiblePointCount === 1
                              ? "1 point in view"
                              : "Off-screen"
                            : "",
                      ]
                        .filter(Boolean)
                        .join(" • ")}
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
