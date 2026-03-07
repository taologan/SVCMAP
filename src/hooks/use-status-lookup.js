import { useCallback, useState } from "react";
import { EMPTY_STATUS_LOOKUP_FORM } from "../constants";
import { lookupRequestStatus } from "../firebase";

export function useStatusLookup() {
  const [isStatusLookupOpen, setIsStatusLookupOpen] = useState(false);
  const [statusLookupForm, setStatusLookupForm] = useState(
    EMPTY_STATUS_LOOKUP_FORM,
  );
  const [statusLookupResult, setStatusLookupResult] = useState([]);
  const [statusLookupError, setStatusLookupError] = useState("");
  const [isCheckingStatusLookup, setIsCheckingStatusLookup] = useState(false);
  const [hasStatusLookupAttempted, setHasStatusLookupAttempted] =
    useState(false);

  const openStatusLookupModal = useCallback(() => {
    setStatusLookupForm(EMPTY_STATUS_LOOKUP_FORM);
    setStatusLookupResult([]);
    setStatusLookupError("");
    setHasStatusLookupAttempted(false);
    setIsStatusLookupOpen(true);
  }, []);

  const closeStatusLookupModal = useCallback(() => {
    setStatusLookupForm(EMPTY_STATUS_LOOKUP_FORM);
    setStatusLookupResult([]);
    setStatusLookupError("");
    setHasStatusLookupAttempted(false);
    setIsStatusLookupOpen(false);
  }, []);

  const dismissStatusLookupModal = useCallback(() => {
    setIsStatusLookupOpen(false);
  }, []);

  const handleStatusLookupFieldChange = useCallback((event) => {
    const { name, value } = event.target;
    setStatusLookupForm((current) => ({ ...current, [name]: value }));
  }, []);

  const handleStatusLookup = useCallback(
    async (event) => {
      event.preventDefault();
      setHasStatusLookupAttempted(true);
      setStatusLookupError("");
      setStatusLookupResult([]);

      if (
        !statusLookupForm.contactEmail.trim() &&
        !statusLookupForm.contactPhone.trim()
      ) {
        setStatusLookupError(
          "Please provide the email or phone used on submission.",
        );
        return;
      }

      setIsCheckingStatusLookup(true);
      try {
        const result = await lookupRequestStatus({
          submitterEmail: statusLookupForm.contactEmail,
          submitterPhone: statusLookupForm.contactPhone,
        });
        setStatusLookupResult(result);
      } catch (error) {
        setStatusLookupError(error.message || "Could not find that request.");
      } finally {
        setIsCheckingStatusLookup(false);
      }
    },
    [statusLookupForm],
  );

  return {
    isStatusLookupOpen,
    statusLookupForm,
    statusLookupResult,
    statusLookupError,
    isCheckingStatusLookup,
    hasStatusLookupAttempted,
    openStatusLookupModal,
    closeStatusLookupModal,
    dismissStatusLookupModal,
    handleStatusLookupFieldChange,
    handleStatusLookup,
  };
}
