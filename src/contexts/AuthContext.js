import React, { createContext, useState, useEffect, useRef } from "react";
import { auth } from "../services/firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "../services/firebaseConfig";
import NotificationService from "../services/NotificationService";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMountedRef = useRef(true);
  const previousUserRef = useRef(null);
  const notificationInitializedRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          try {
            const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};

            const userObject = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              ...userData,
            };

            // Only update state if component is still mounted
            if (isMountedRef.current) {
              setUser(userObject);
            }

            // Initialize notifications for authenticated user (non-blocking)
            if (!notificationInitializedRef.current && isMountedRef.current) {
              notificationInitializedRef.current = true;

              // Non-blocking notification setup
              Promise.resolve()
                .then(() => NotificationService.initialize())
                .then(() => {
                  if (isMountedRef.current) {
                    return NotificationService.scheduleWeeklySummary();
                  }
                })
                .catch((error) => {
                  if (isMountedRef.current) {
                    console.warn(
                      "Notification setup failed:",
                      error?.message || error
                    );
                    notificationInitializedRef.current = false;
                  }
                });
            }

            previousUserRef.current = firebaseUser;
          } catch (error) {
            console.warn("Could not fetch user data:", error.message);

            // Fallback user object
            const fallbackUser = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
            };

            if (isMountedRef.current) {
              setUser(fallbackUser);
            }

            previousUserRef.current = firebaseUser;
          }
        } else {
          // User logged out

          // Only cleanup notifications if we previously had a user
          if (previousUserRef.current) {
            // Non-blocking cleanup
            Promise.resolve()
              .then(() => NotificationService.cleanup())
              .then(() => NotificationService.cancelAllNotifications())
              .catch((error) => {
                if (isMountedRef.current) {
                  console.warn(
                    "Notification cleanup failed:",
                    error?.message || error
                  );
                }
              })
              .finally(() => {
                notificationInitializedRef.current = false;
              });
          }

          // Update state only if component is mounted
          if (isMountedRef.current) {
            setUser(null);
          }

          previousUserRef.current = null;
        }
      } catch (error) {
        console.warn("Auth state change error:", error.message);

        if (isMountedRef.current) {
          setUser(null);
        }

        previousUserRef.current = null;
        notificationInitializedRef.current = false;
      }

      // Always update loading state at the end (only if mounted)
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    });

    return () => {
      isMountedRef.current = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  const login = async (email, password) => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Schedule welcome back notification with delay
      setTimeout(() => {
        if (isMountedRef.current) {
          NotificationService.scheduleNotification(
            "👋 Welcome back to FLOWZI!",
            "Ready to continue your financial journey? Check your latest progress!",
            { type: "welcome_back" }
          ).catch((error) => {
            if (isMountedRef.current) {
              console.warn(
                "Could not schedule welcome notification:",
                error?.message || error
              );
            }
          });
        }
      }, 3000);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.warn("Login failed:", error.code || "Unknown error");
      return { success: false, error: error };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const register = async (email, password, firstName, lastName) => {
    try {
      if (isMountedRef.current) {
        setIsLoading(true);
      }

      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Create user document in Firestore
      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName,
        lastName,
        email,
        createdAt: new Date().toISOString(),
        monthlyIncome: 0,
        notificationsEnabled: true,
      });

      // Schedule welcome notification with delay
      setTimeout(() => {
        if (isMountedRef.current) {
          NotificationService.scheduleNotification(
            "🎉 Welcome to FLOWZI!",
            "Thanks for joining! Let's start building your financial future together.",
            { type: "welcome_new_user" }
          ).catch((error) => {
            if (isMountedRef.current) {
              console.warn(
                "Could not schedule welcome notification:",
                error?.message || error
              );
            }
          });
        }
      }, 4000);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.warn("Registration failed:", error.code || "Unknown error");
      return { success: false, error: error };
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.warn("Logout failed:", error.code || error.message);
      return { success: false, error: error };
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.warn("Password reset failed:", error.code || error.message);
      return { success: false, error: error };
    }
  };

  const value = {
    user,
    isLoading,
    login,
    register,
    logout,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
