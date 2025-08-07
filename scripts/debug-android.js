#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 FlexFinance Android Debug Script');
console.log('=====================================\n');

// Check if we're in the right directory
if (!fs.existsSync('package.json')) {
  console.error('❌ Error: Please run this script from the project root directory');
  process.exit(1);
}

// Check if node_modules exists
if (!fs.existsSync('node_modules')) {
  console.log('📦 Installing dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✅ Dependencies installed successfully');
  } catch (error) {
    console.error('❌ Failed to install dependencies');
    process.exit(1);
  }
}

// Check if Expo CLI is installed
try {
  execSync('npx expo --version', { stdio: 'pipe' });
} catch (error) {
  console.log('📦 Installing Expo CLI...');
  try {
    execSync('npm install -g @expo/cli', { stdio: 'inherit' });
  } catch (error) {
    console.error('❌ Failed to install Expo CLI');
    process.exit(1);
  }
}

console.log('\n🔍 Pre-flight checks:');
console.log('1. ✅ Project structure verified');
console.log('2. ✅ Dependencies installed');
console.log('3. ✅ Expo CLI available');

console.log('\n📱 Android Debug Instructions:');
console.log('==============================');
console.log('1. Make sure your Android device is connected via USB');
console.log('2. Enable USB debugging on your device');
console.log('3. Run: adb devices (to verify connection)');
console.log('4. The app will start with enhanced debugging');

console.log('\n🚀 Starting Android development server...');
console.log('Press Ctrl+C to stop the server\n');

try {
  // Start the Expo development server with Android
  execSync('npx expo start --android --clear', { 
    stdio: 'inherit',
    env: {
      ...process.env,
      EXPO_DEBUG: '1',
      DEBUG: '*'
    }
  });
} catch (error) {
  console.error('\n❌ Failed to start Android development server');
  console.error('Error:', error.message);
  
  console.log('\n🔧 Troubleshooting steps:');
  console.log('1. Make sure Android Studio is installed');
  console.log('2. Check that ANDROID_HOME is set correctly');
  console.log('3. Verify that an Android device or emulator is connected');
  console.log('4. Try running: npx expo doctor');
  console.log('5. Clear Metro cache: npx expo start --clear');
  
  process.exit(1);
} 