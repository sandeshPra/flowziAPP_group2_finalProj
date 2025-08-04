import React, { createContext, useState, useEffect } from "react";
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

  useEffect(() => {
    let previousUser = null; // Track if we had a user before
    let notificationInitialized = false; // Track notification initialization

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            const userData = userDoc.exists() ? userDoc.data() : {};

            setUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              ...userData,
            });

            // Initialize notifications for authenticated user (non-blocking)
            // Only initialize once per session
            if (!notificationInitialized) {
              notificationInitialized = true;
              NotificationService.initialize()
                .then(() => {
                  // Only schedule weekly summary if initialization was successful
                  return NotificationService.scheduleWeeklySummary();
                })
                .catch((error) => {
                  console.warn("Notification setup failed:", error.message);
                  notificationInitialized = false; // Reset so we can try again
                });
            }

            previousUser = user;
          } catch (error) {
            console.warn("Could not fetch user data:", error.message);
            setUser({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
            });
            previousUser = user;
          }
        } else {
          // Only cleanup notifications if we previously had a user (actual logout)
          if (previousUser) {
            // Non-blocking cleanup
            Promise.resolve()
              .then(() => NotificationService.cleanup())
              .then(() => NotificationService.cancelAllNotifications())
              .catch((error) =>
                console.warn("Notification cleanup failed:", error.message)
              );

            notificationInitialized = false; // Reset for next login
          }

          setUser(null);
          previousUser = null;
        }
      } catch (error) {
        console.warn("Auth state change error:", error.message);
        setUser(null);
        previousUser = null;
        notificationInitialized = false;
      } finally {
        setIsLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const login = async (email, password) => {
    try {
      setIsLoading(true);
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );

      // Schedule welcome back notification only on successful login
      // Use a longer timeout to ensure NotificationService is initialized
      setTimeout(() => {
        NotificationService.scheduleNotification(
          "👋 Welcome back to FLOWZI!",
          "Ready to continue your financial journey? Check your latest progress!",
          { type: "welcome_back" }
        ).catch((error) => {
          console.warn(
            "Could not schedule welcome notification:",
            error.message
          );
        });
      }, 3000); // Increased timeout

      return { success: true, user: userCredential.user };
    } catch (error) {
      // Only log the error code for debugging, not the full error
      console.warn("Login failed:", error.code || "Unknown error");
      // Return the full error object to preserve error.code and error.message
      return { success: false, error: error };
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email, password, firstName, lastName) => {
    try {
      setIsLoading(true);
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      await setDoc(doc(db, "users", userCredential.user.uid), {
        firstName,
        lastName,
        email,
        createdAt: new Date().toISOString(),
        monthlyIncome: 0,
        notificationsEnabled: true,
      });

      setTimeout(() => {
        NotificationService.scheduleNotification(
          "🎉 Welcome to FLOWZI!",
          "Thanks for joining! Let's start building your financial future together.",
          { type: "welcome_new_user" }
        ).catch((error) => {
          console.warn(
            "Could not schedule welcome notification:",
            error.message
          );
        });
      }, 4000); // Increased timeout

      return { success: true, user: userCredential.user };
    } catch (error) {
      // Only log the error code for debugging, not the full error
      console.warn("Registration failed:", error.code || "Unknown error");
      // Return the full error object to preserve error.code and error.message
      return { success: false, error: error };
    } finally {
      setIsLoading(false);
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
