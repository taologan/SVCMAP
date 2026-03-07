import { useCallback, useEffect, useState } from "react";
import { getEntities } from "../firebase";

export function useMapEntities() {
  const [entities, setEntities] = useState([]);
  const [entitiesStatus, setEntitiesStatus] = useState("loading");
  const [entitiesError, setEntitiesError] = useState("");

  const reloadEntities = useCallback(async () => {
    setEntitiesStatus("loading");
    setEntitiesError("");
    try {
      const loadedEntities = await getEntities();
      setEntities(loadedEntities);
      setEntitiesStatus("ready");
    } catch (error) {
      console.error("Failed to fetch entries from Firestore:", error);
      setEntitiesStatus("error");
      setEntitiesError("Unable to load data from Firestore.");
    }
  }, []);

  useEffect(() => {
    reloadEntities();
  }, [reloadEntities]);

  return {
    entities,
    entitiesStatus,
    entitiesError,
    reloadEntities,
  };
}
