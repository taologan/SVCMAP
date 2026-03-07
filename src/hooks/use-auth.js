import { useCallback, useEffect, useState } from "react";
import { isUserAdmin, onAuthUserChanged, signInWithGoogle } from "../firebase";

export function useAuth() {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const unsubscribe = onAuthUserChanged((user) => {
      if (!isMounted) return;
      setAuthUser(user);

      if (!user) {
        setIsAdmin(false);
        setIsCheckingAdmin(false);
        return;
      }

      setIsCheckingAdmin(true);
      isUserAdmin(user)
        .then((allowed) => {
          if (!isMounted) return;
          setIsAdmin(allowed);
        })
        .catch((error) => {
          if (!isMounted) return;
          console.error("Failed to verify admin status:", error);
          setIsAdmin(false);
        })
        .finally(() => {
          if (!isMounted) return;
          setIsCheckingAdmin(false);
        });
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async () => {
    setIsSigningIn(true);
    try {
      const user = await signInWithGoogle();
      console.log("Signed in with Google email:", user?.email ?? "(no email)");
      return user;
    } finally {
      setIsSigningIn(false);
    }
  }, []);

  return {
    isSigningIn,
    authUser,
    isAdmin,
    isCheckingAdmin,
    signIn,
  };
}
