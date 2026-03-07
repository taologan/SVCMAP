function CoordinatePickerBanner({ isVisible, onCancel }) {
  if (!isVisible) return null;

  return (
    <div className="map-pick-banner">
      <span>Click on the map to set waypoint coordinates.</span>
      <button type="button" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

export default CoordinatePickerBanner;
