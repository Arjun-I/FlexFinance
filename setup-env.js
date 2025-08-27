#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FlexFinance Environment Setup');
console.log('================================\n');

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  .env file already exists!');
  console.log('If you want to recreate it, please delete the existing .env file first.\n');
  process.exit(0);
}

// Check if env.example exists
if (!fs.existsSync(envExamplePath)) {
  console.log('❌ env.example file not found!');
  console.log('Please make sure you have the env.example file in your project root.\n');
  process.exit(1);
}

try {
  // Copy env.example to .env
  fs.copyFileSync(envExamplePath, envPath);
  
  console.log('✅ .env file created successfully!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('1. Open the .env file in your project root');
  console.log('2. Replace the placeholder values with your actual API keys:');
  console.log('');
  console.log('   🔥 Firebase Configuration (Required):');
  console.log('   - Get these from: Firebase Console > Project Settings > General > Your apps');
  console.log('   - EXPO_PUBLIC_FIREBASE_API_KEY');
  console.log('   - EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  console.log('   - EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  console.log('   - EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET');
  console.log('   - EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  console.log('   - EXPO_PUBLIC_FIREBASE_APP_ID');
  console.log('');
  console.log('   🤖 Groq AI API (Required for recommendations):');
  console.log('   - Get from: https://console.groq.com/');
  console.log('   - EXPO_PUBLIC_GROQ_API_KEY');
  console.log('');
  console.log('   📊 Finnhub API (Required for stock data):');
  console.log('   - Get from: https://finnhub.io/');
  console.log('   - EXPO_PUBLIC_FINNHUB_API_KEY');
  console.log('');
  console.log('3. Save the .env file');
  console.log('4. Restart your development server: npx expo start --clear');
  console.log('');
  console.log('🎉 You\'re all set! Happy coding!');
  
} catch (error) {
  console.error('❌ Error creating .env file:', error.message);
  process.exit(1);
}
