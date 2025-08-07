// debug/test-firebase.js - Test Firebase operations independently
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, getDocs, deleteDoc } from 'firebase/firestore';
import Constants from 'expo-constants';

// Initialize Firebase
const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: Constants.expoConfig?.extra?.EXPO_PUBLIC_FIREBASE_APP_ID
};

async function testFirebaseOperations() {
  console.log('🧪 Testing Firebase operations...\n');
  
  try {
    // Initialize Firebase
    console.log('🔥 Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    console.log('✅ Firebase initialized successfully');
    console.log('');

    // Test user ID (simulate authenticated user)
    const testUserId = 'debug-user-' + Date.now();
    console.log('👤 Using test user ID:', testUserId);
    console.log('');

    // Test 1: Write and read user document
    console.log('1️⃣ Testing user document operations...');
    const userDoc = {
      email: 'debug@test.com',
      createdAt: new Date().toISOString(),
      hasCompletedQuiz: true,
      riskProfile: {
        volatility: 5,
        timeHorizon: 'long-term',
        knowledge: 'intermediate'
      }
    };

    await setDoc(doc(db, 'users', testUserId), userDoc);
    console.log('✅ User document written');

    const userSnapshot = await getDoc(doc(db, 'users', testUserId));
    if (userSnapshot.exists()) {
      console.log('✅ User document read successfully:', userSnapshot.data().email);
    } else {
      console.log('❌ User document not found after write');
    }
    console.log('');

    // Test 2: Write and read generated stocks
    console.log('2️⃣ Testing generated stocks operations...');
    const sampleStocks = [
      {
        symbol: 'AAPL',
        name: 'Apple Inc.',
        sector: 'Technology',
        price: 150.00,
        change: 2.50,
        changePercent: 1.69,
        confidence: 0.8,
        riskLevel: 'medium',
        createdAt: new Date().toISOString()
      },
      {
        symbol: 'MSFT',
        name: 'Microsoft Corporation',
        sector: 'Technology',
        price: 300.00,
        change: -1.50,
        changePercent: -0.50,
        confidence: 0.9,
        riskLevel: 'low',
        createdAt: new Date().toISOString()
      }
    ];

    // Write generated stocks
    for (const stock of sampleStocks) {
      await addDoc(collection(db, 'users', testUserId, 'generatedStocks'), stock);
    }
    console.log('✅ Generated stocks written:', sampleStocks.length);

    // Read generated stocks
    const stocksSnapshot = await getDocs(collection(db, 'users', testUserId, 'generatedStocks'));
    const retrievedStocks = [];
    stocksSnapshot.forEach((doc) => {
      retrievedStocks.push({ id: doc.id, ...doc.data() });
    });
    console.log('✅ Generated stocks read:', retrievedStocks.length);
    console.log('✅ Sample retrieved stock:', {
      symbol: retrievedStocks[0]?.symbol,
      name: retrievedStocks[0]?.name,
      price: retrievedStocks[0]?.price
    });
    console.log('');

    // Test 3: Write and read user preferences
    console.log('3️⃣ Testing user preferences operations...');
    const userPrefs = {
      likedStocks: ['AAPL', 'GOOGL'],
      rejectedStocks: ['TSLA'],
      portfolio: [
        { symbol: 'SPY', shares: 10, averagePrice: 400.00 }
      ],
      updatedAt: new Date().toISOString()
    };

    await setDoc(doc(db, 'users', testUserId, 'preferences', 'main'), userPrefs);
    console.log('✅ User preferences written');

    const prefsSnapshot = await getDoc(doc(db, 'users', testUserId, 'preferences', 'main'));
    if (prefsSnapshot.exists()) {
      const prefs = prefsSnapshot.data();
      console.log('✅ User preferences read:', {
        likedCount: prefs.likedStocks?.length || 0,
        rejectedCount: prefs.rejectedStocks?.length || 0,
        portfolioCount: prefs.portfolio?.length || 0
      });
    } else {
      console.log('❌ User preferences not found');
    }
    console.log('');

    // Test 4: Cleanup - delete test documents
    console.log('4️⃣ Cleaning up test data...');
    
    // Delete generated stocks
    for (const stock of retrievedStocks) {
      await deleteDoc(doc(db, 'users', testUserId, 'generatedStocks', stock.id));
    }
    
    // Delete preferences
    await deleteDoc(doc(db, 'users', testUserId, 'preferences', 'main'));
    
    // Delete user document
    await deleteDoc(doc(db, 'users', testUserId));
    
    console.log('✅ Test data cleaned up');
    console.log('');

    // Test 5: Verify cleanup
    console.log('5️⃣ Verifying cleanup...');
    const cleanupCheck = await getDoc(doc(db, 'users', testUserId));
    if (!cleanupCheck.exists()) {
      console.log('✅ Cleanup verified - test user deleted');
    } else {
      console.log('⚠️ Cleanup incomplete - test user still exists');
    }
    console.log('');

    console.log('🎉 All Firebase tests passed!');
    return true;

  } catch (error) {
    console.error('❌ Firebase test failed:', error.message);
    console.error('🔍 Full error:', error);
    return false;
  }
}

// Export for use in other scripts
export { testFirebaseOperations };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testFirebaseOperations()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
      console.error('💥 Unexpected error:', err);
      process.exit(1);
    });
}
