import { APP_CONFIG } from "../constants";

function TopBar({
  topBarRef,
  isSigningIn,
  isSigningOut,
  authUser,
  isCheckingAdmin,
  isAdmin,
  onAdminLogin,
  onSignOut,
  onOpenAddModal,
  onOpenStatusLookupModal,
}) {
  return (
    <header ref={topBarRef} className="top-bar">
      <div className="title-wrap">
        <div className="brand-placeholder">
          <img src="/svc_logo.png" alt="South View" className="brand-logo" />
        </div>
        <p className="subtitle">
          A memorial-style map for exploring burial stories, Atlanta landmarks, and
          foundation resources in the South-View ecosystem.
        </p>
        <div className="foundation-link-row">
          {APP_CONFIG.foundationLinks.map((link) => (
            <a key={link.url} href={link.url} target="_blank" rel="noreferrer">
              {link.label}
            </a>
          ))}
        </div>
      </div>
      <div className="header-controls">
        {/* <p className="nav-caption">Foundation Links</p> */}
        <div className="admin-actions">
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
          {authUser ? (
            <button
              type="button"
              className="sign-out-btn"
              onClick={onSignOut}
              disabled={isSigningOut}
            >
              {isSigningOut ? "Signing out..." : "Sign Out"}
            </button>
          ) : null}
        </div>
        {onOpenAddModal ? (
          <button type="button" className="add-waypoint-btn" onClick={onOpenAddModal}>
            + Suggest a Story
          </button>
        ) : (
          <p className="header-note">
            Community submissions are currently paused while South-View curates stories
            directly.
          </p>
        )}
        {onOpenStatusLookupModal ? (
          <button
            type="button"
            className="add-waypoint-btn secondary"
            onClick={onOpenStatusLookupModal}
          >
            Check Request Status
          </button>
        ) : null}
      </div>
    </header>
  );
}

export default TopBar;
