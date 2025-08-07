// screens/DebugScreen.js - Debug screen for the app
import React from 'react';
import { View, StyleSheet } from 'react-native';
import DebugPanel from '../components/DebugPanel';

const DebugScreen = ({ route }) => {
  const { user } = route.params || {};
  
  return (
    <View style={styles.container}>
      <DebugPanel user={user} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default DebugScreen;
