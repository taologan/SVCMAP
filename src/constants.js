export const EMPTY_FORM = {
  name: "",
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
