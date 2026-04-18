export const EMPTY_FORM = {
  name: "",
  roles: [],
  storyType: "",
  neighborhood: "",
  graveLocation: "",
  sourceLabel: "",
  sourceUrl: "",
  externalLinks: "",
  story: "",
  latitude: "",
  longitude: "",
  coordinates: [],
  contactEmail: "",
  contactPhone: "",
  files: [],
};

export const EMPTY_STATUS_LOOKUP_FORM = {
  contactEmail: "",
  contactPhone: "",
};

export const MARKER_VISIBILITY_ZOOM = 11.75;
export const HEAT_VISIBILITY_ZOOM = 14;

export const ATLANTA_CENTER = [33.749, -84.388];

export const CARTO_LIGHT_BASEMAP = {
  url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
  options: {
    attribution: "&copy; OpenStreetMap contributors &copy; CARTO",
    subdomains: "abcd",
    maxZoom: 20,
  },
};

export const APP_CONFIG = {
  defaultAllowCommunitySubmissions: false,
  foundationLinks: [
    {
      label: "Support the Foundation",
      url: "https://givebutter.com/south-view-cemetery-nqvhuj",
    },
    {
      label: "Instagram Storytelling",
      url: "https://www.instagram.com/cslmc475/",
    },
  ],
};

export const STORY_TYPE_OPTIONS = [
  "Community memory",
  "Burial record",
  "Atlanta landmark",
  "Civil rights history",
  "Family connection",
  "Education resource",
];

export const OTHER_ROLE_LABEL = "Other";

export function normalizeAllowedRoles(roles = []) {
  const seen = new Set();
  return sortRolesAlphabetically(
    roles
      .map((role) => `${role ?? ""}`.trim())
      .filter((role) => {
        if (!role) return false;
        const normalizedRole = role.toLowerCase();
        if (seen.has(normalizedRole)) return false;
        seen.add(normalizedRole);
        return true;
      }),
  );
}

function sortRolesAlphabetically(roles = []) {
  const normalizedOtherRole = OTHER_ROLE_LABEL.toLowerCase();
  return [...roles].sort((leftRole, rightRole) => {
    const isLeftOtherRole = leftRole.toLowerCase() === normalizedOtherRole;
    const isRightOtherRole = rightRole.toLowerCase() === normalizedOtherRole;

    if (isLeftOtherRole && !isRightOtherRole) return 1;
    if (!isLeftOtherRole && isRightOtherRole) return -1;

    return leftRole.localeCompare(rightRole, undefined, { sensitivity: "base" });
  });
}

export function buildRoleOptions(allowedRoles = []) {
  const normalizedRoles = normalizeAllowedRoles(allowedRoles);
  const rolesWithOther = normalizedRoles.some(
    (role) => role.toLowerCase() === OTHER_ROLE_LABEL.toLowerCase(),
  )
    ? normalizedRoles
    : [...normalizedRoles, OTHER_ROLE_LABEL];
  return sortRolesAlphabetically(rolesWithOther);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildRoleCategoryOptions(allowedRoles = []) {
  return buildRoleOptions(allowedRoles).map((role) => ({
    value: role.toLowerCase(),
    label: role,
    matcher: new RegExp(`\\b${escapeRegExp(role)}\\b`, "i"),
  }));
}

export function rolesToText(roles = []) {
  return sortRolesAlphabetically(normalizeAllowedRoles(roles)).join(", ");
}
