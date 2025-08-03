# FLOWZI (Personal Finance Management App)

FLOWZI is a mobile application built with React Native and Expo to simplify personal finance management. It enables users to track expenses, set and monitor financial goals, manage bills, and gain actionable insights into their spending habits. With Firebase for authentication and data storage, customizable themes, and smart notifications, FLOWZI empowers users to achieve financial success with ease.

## Features

- **Authentication**: Secure login, registration, and password reset using Firebase Authentication, with session persistence via AsyncStorage.
- **Dashboard**: Displays total balance, recent transactions, goal progress, upcoming bills, and savings opportunities.
- **Transactions**: Add, delete, and filter transactions (All, Income, Expenses, Regular, Side Income) with search and bulk deletion capabilities.
- **Goals**: Create, edit, and track financial goals with progress tracking, milestone notifications (25%, 50%, 75%, 90%, 100%), and budget breakdowns.
- **Reports**: Offers detailed analytics, including performance metrics (Contribution Consistency, Goal Velocity), financial breakdowns, and savings source insights.
- **Settings**: Customize theme (light/dark/system), currency (USD, EUR, GBP, CAD, INR, AUD, JPY, CNY), income frequency, and clear all data.
- **Notifications**: Delivers bill reminders (7/3/1-day alerts), goal milestone celebrations, weekly summaries, and personalized insights via Expo Notifications.
- **Currency Support**: Formats amounts in multiple currencies with user-defined symbol position and cents display.
- **Responsive UI**: Consistent design with theme-aware colors, decorative elements, and accessibility features (labels, hints).

## Tech Stack

- **Frontend**: React Native v0.74.5, Expo SDK ~51.0.0
- **Backend**: Firebase v10.12.0 (Authentication, Firestore)
- **Navigation**: React Navigation v6 (Stack and Bottom Tabs)
- **Notifications**: Expo Notifications ~0.28.19
- **State Management**: React Context API (Auth, Theme, Currency)
- **Storage**: @react-native-async-storage/async-storage
- **Icons**: @expo/vector-icons (MaterialIcons)
- **Animations**: react-native-reanimated ~3.10.1
- **Dependencies**: @react-native-picker/picker, @shopify/react-native-skia, react-native-gesture-handler, react-native-safe-area-context

## Prerequisites

- Node.js v18 or higher
- Yarn (recommended) or npm
- Expo CLI (install via `npm install -g expo-cli`)
- Firebase account with Authentication and Firestore enabled
- Physical iOS/Android device for testing push notifications (emulators lack full support)

## Usage

- **Sign Up/Login**: Register with email, first name, last name, and password, or log in with existing credentials. Use the Forgot Password option for recovery.
- **Set Income**: Configure income (weekly, monthly, or yearly) in Settings or Goals for accurate budget calculations.
- **Manage Transactions/Bills**: Add income, expenses, or bills in the Wallet tab. Filter transactions or search by category/note.
- **Set Goals**: Create goals in the Goals tab with a name, target amount, and timeframe. Receive milestone notifications as you progress.
- **View Analytics**: Explore financial insights, performance metrics, and savings recommendations in the Analytics tab.
- **Customize Preferences**: Adjust theme, currency, and notification settings in the Settings tab.
- **Notifications**: Enable push notifications for bill reminders, goal milestones, weekly summaries, and smart insights.

## Installation

### Clone the Repository

```bash
git clone https://github.com/your-username/flowzi.git
cd flowzi
```

### Install Dependencies

```bash
yarn install
```

or

```bash
npm install
```

### Configure Firebase

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com).

Enable Email/Password Authentication and Firestore Database.

Add your Firebase configuration to `services/firebaseConfig.js` or use a `.env` file with expo-constants for security:

```javascript
// services/firebaseConfig.js
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID,
};
```

## Running the App

After installation and configuration:

1. Start the Expo development server:

   ```bash
   expo start
   ```

   or

   ```bash
   yarn start
   ```

2. Use the Expo Go app on your mobile device to scan the QR code, or run on an emulator/simulator.
