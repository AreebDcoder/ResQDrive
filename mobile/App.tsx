import firebase from '@react-native-firebase/app';
import 'react-native-gesture-handler';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { store } from './src/store/store';
import Navigation from './src/navigation';

// Cast to any to bypass the TypeScript 'children' prop error
const GHRootView = GestureHandlerRootView as any;

// Force initialize Firebase manually (bypasses native config issues)
const firebaseConfig = {
  apiKey: "AIzaSyAMxau3GeWhobnsVumOG6iuC8r-3fELkNw",
  projectId: "resqdrive-f55dd",
  appId: "1:67462047048:android:94f6f038ca10fefd383f7d",
  messagingSenderId: "67462047048",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export default function App() {
  return (
    <GHRootView style={{ flex: 1 }}>
      <Provider store={store}>
        <SafeAreaProvider>
          <Navigation />
          <StatusBar style="light" />
        </SafeAreaProvider>
      </Provider>
    </GHRootView>
  );
}