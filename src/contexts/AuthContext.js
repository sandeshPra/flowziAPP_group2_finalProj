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
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
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

          await NotificationService.initialize();

          await NotificationService.scheduleWeeklySummary();
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUser({
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
          });
        }
      } else {
        setUser(null);

        NotificationService.cleanup();
        await NotificationService.cancelAllNotifications();
      }
      setIsLoading(false);
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

      setTimeout(() => {
        NotificationService.scheduleNotification(
          "👋 Welcome back to FLOWZI!",
          "Ready to continue your financial journey? Check your latest progress!",
          { type: "welcome_back" }
        );
      }, 2000);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: error.message };
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
        );
      }, 3000);

      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Registration error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      await signOut(auth);
      return { success: true };
    } catch (error) {
      console.error("Logout error:", error);
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email) => {
    try {
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error) {
      console.error("Reset password error:", error);
      return { success: false, error: error.message };
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
