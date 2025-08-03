import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

// Your config
const firebaseConfig = {
  apiKey: "AIzaSyCYjcncqkM8jEFyONIbLiVG7FiuGRHZwRI",
  authDomain: "flowzi.firebaseapp.com",
  databaseURL: "https://flowzi-default-rtdb.firebaseio.com",
  projectId: "flowzi",
  storageBucket: "flowzi.firebasestorage.app",
  messagingSenderId: "26275268986",
  appId: "1:26275268986:web:3991c3cb845181695f2ec3",
  measurementId: "G-STNL0L5VHX",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export { db, auth };
