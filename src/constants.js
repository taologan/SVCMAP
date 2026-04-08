export const EMPTY_FORM = {
  name: "",
  role: "",
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
      label: "South-View Foundation",
      url: "https://www.southviewfoundation.org/",
    },
    {
      label: "Support the Foundation",
      url: "https://givebutter.com/southview-cemetary-qtdsw7",
    },
    {
      label: "Instagram Storytelling",
      url: "https://www.instagram.com/cslmc475/",
    },
    // {
    //   label: "TikTok Storytelling",
    //   url: "https://www.tiktok.com/",
    // },
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
