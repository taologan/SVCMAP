export function flattenPointEntities(entities) {
  return entities.flatMap((entity) =>
    entity.coordinates.map((coordinate, pointIndex) => ({
      entity,
      coordinate,
      pointIndex,
    })),
  );
}

export function buildHeatData(pointEntities) {
  if (pointEntities.length === 0) {
    return {
      points: [],
      maxIntensity: 1,
    };
  }

  // Bucket nearby coordinates so dense local groups contribute higher intensity.
  const bucketCounts = new Map();
  pointEntities.forEach((pointEntity) => {
    const [lat, lng] = pointEntity.coordinate;
    const bucketKey = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    bucketCounts.set(bucketKey, (bucketCounts.get(bucketKey) ?? 0) + 1);
  });

  let maxBucketCount = 0;
  const weightedPoints = pointEntities.map((pointEntity) => {
    const [lat, lng] = pointEntity.coordinate;
    const bucketKey = `${lat.toFixed(4)}:${lng.toFixed(4)}`;
    const localWeight = bucketCounts.get(bucketKey) ?? 1;
    if (localWeight > maxBucketCount) maxBucketCount = localWeight;
    return [lat, lng, localWeight];
  });

  return {
    points: weightedPoints,
    // Keep one-off points from rendering at full saturation.
    maxIntensity: Math.max(maxBucketCount, 3),
  };
}

export function getVisibleEntities({ entities, bounds, showMarkers }) {
  if (!bounds || !showMarkers) return [];

  return entities
    .map((entity) => {
      const visiblePoints = entity.coordinates.filter(([lat, lng]) => {
        return (
          lat >= bounds.south &&
          lat <= bounds.north &&
          lng >= bounds.west &&
          lng <= bounds.east
        );
      });
      return {
        entity,
        visiblePointCount: visiblePoints.length,
        visiblePoints,
      };
    })
    .filter((entry) => entry.visiblePointCount > 0);
}

export function getBoundsSnapshot(leafletBounds) {
  return {
    north: leafletBounds.getNorth(),
    south: leafletBounds.getSouth(),
    east: leafletBounds.getEast(),
    west: leafletBounds.getWest(),
  };
}
