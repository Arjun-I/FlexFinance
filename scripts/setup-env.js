#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔧 FlexFinance Environment Setup');
console.log('================================\n');

// Check if .env file exists
const envPath = path.join(__dirname, '..', '.env');
const envExamplePath = path.join(__dirname, '..', 'env.example');

if (fs.existsSync(envPath)) {
  console.log('✅ .env file already exists');
  console.log('📝 Current configuration:');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  
  lines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key] = line.split('=');
      console.log(`   ${key}`);
    }
  });
} else {
  console.log('📝 Creating .env file from template...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created from template');
  } else {
    console.log('❌ env.example not found');
    process.exit(1);
  }
}

console.log('\n📋 Next Steps:');
console.log('1. Edit the .env file with your API keys');
console.log('2. Firebase configuration is required');
console.log('3. OpenAI API key is optional (app works without it)');
console.log('4. Yahoo Finance API is free (no key needed)');
console.log('\n🔗 Get API Keys:');
console.log('- Firebase: https://console.firebase.google.com');
console.log('- OpenAI: https://platform.openai.com/api-keys');
console.log('\n🚀 Run the app with: npx expo start'); 