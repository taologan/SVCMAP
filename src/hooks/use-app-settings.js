import { useEffect, useState } from "react";
import { APP_CONFIG } from "../constants";
import { subscribeToAppSettings } from "../firebase";

export function useAppSettings() {
  const [appSettings, setAppSettings] = useState({
    allowCommunitySubmissions: APP_CONFIG.defaultAllowCommunitySubmissions,
  });
  const [settingsStatus, setSettingsStatus] = useState("loading");
  const [settingsError, setSettingsError] = useState("");

  useEffect(() => {
    const unsubscribe = subscribeToAppSettings({
      onChange: (nextSettings) => {
        setAppSettings(nextSettings);
        setSettingsStatus("ready");
        setSettingsError("");
      },
      onError: (error) => {
        console.error("Failed to load app settings:", error);
        setSettingsStatus("error");
        setSettingsError("Unable to load app settings.");
      },
    });

    return () => unsubscribe();
  }, []);

  return {
    appSettings,
    allowCommunitySubmissions: appSettings.allowCommunitySubmissions,
    settingsStatus,
    settingsError,
  };
}
