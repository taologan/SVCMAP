function TopBar({
  topBarRef,
  isSigningIn,
  authUser,
  isCheckingAdmin,
  isAdmin,
  onAdminLogin,
  onOpenAddModal,
  onOpenStatusLookupModal,
}) {
  return (
    <header ref={topBarRef} className="top-bar">
      <div className="title-wrap">
        <p className="eyebrow">South-View Cemetery</p>
        <h1>Atlanta Community Story Map</h1>
        <p className="subtitle">
          Firestore-powered story map with heatmap and zoom-based markers.
        </p>
      </div>
      <div className="header-controls">
        <button
          type="button"
          className="admin-login-btn"
          onClick={onAdminLogin}
          disabled={isSigningIn || (Boolean(authUser) && isCheckingAdmin)}
        >
          {isSigningIn
            ? "Signing in..."
            : authUser && isCheckingAdmin
              ? "Checking admin..."
              : isAdmin
                ? "Open Admin Panel"
                : authUser
                  ? "Switch Admin Account"
                  : "Admin Login"}
        </button>
        <button type="button" className="add-waypoint-btn" onClick={onOpenAddModal}>
          + Add Connection
        </button>
        <button
          type="button"
          className="add-waypoint-btn secondary"
          onClick={onOpenStatusLookupModal}
        >
          Check Request Status
        </button>
      </div>
    </header>
  );
}

export default TopBar;
