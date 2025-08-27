// firebaseService.js - Optimized Firebase operations with caching and batch processing
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot,
  writeBatch,
  runTransaction,
  serverTimestamp,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from '../firebase';

class FirebaseService {
  constructor() {
    this.cache = new Map();
    this.listeners = new Map();
    this.batchSize = 500; // Firestore batch limit
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  // Cache management
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCached(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  // Optimized single document operations
  async getDocument(path, useCache = true) {
    const cacheKey = `doc:${path}`;
    
    if (useCache) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const docRef = doc(db, ...path.split('/'));
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() };
        this.setCached(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error getting document:', error);
      throw error;
    }
  }

  async setDocument(path, data, merge = true) {
    try {
      const docRef = doc(db, ...path.split('/'));
      await setDoc(docRef, {
        ...data,
        updatedAt: serverTimestamp()
      }, { merge });
      
      // Update cache
      const cacheKey = `doc:${path}`;
      this.setCached(cacheKey, { id: docRef.id, ...data });
      
      return docRef.id;
    } catch (error) {
      console.error('Error setting document:', error);
      throw error;
    }
  }

  // Batch operations for better performance
  async batchSetDocuments(operations) {
    if (operations.length === 0) return [];

    const batches = [];
    const results = [];

    for (let i = 0; i < operations.length; i += this.batchSize) {
      const batch = writeBatch(db);
      const batchOperations = operations.slice(i, i + this.batchSize);

      batchOperations.forEach(({ path, data, merge = true }) => {
        const docRef = doc(db, ...path.split('/'));
        batch.set(docRef, {
          ...data,
          updatedAt: serverTimestamp()
        }, { merge });
      });

      batches.push(batch);
    }

    try {
      await Promise.all(batches.map(batch => batch.commit()));
      
      // Update cache for all operations
      operations.forEach(({ path, data }) => {
        const cacheKey = `doc:${path}`;
        this.setCached(cacheKey, data);
      });

      return results;
    } catch (error) {
      console.error('Error in batch operation:', error);
      throw error;
    }
  }

  // Optimized collection queries
  async getCollection(path, options = {}) {
    const { 
      whereClauses = [], 
      orderByClause = null, 
      limitCount = null,
      useCache = true 
    } = options;

    const cacheKey = `collection:${path}:${JSON.stringify(options)}`;
    
    if (useCache) {
      const cached = this.getCached(cacheKey);
      if (cached) return cached;
    }

    try {
      const collectionRef = collection(db, ...path.split('/'));
      let q = collectionRef;

      // Apply where clauses
      whereClauses.forEach(({ field, operator, value }) => {
        q = query(q, where(field, operator, value));
      });

      // Apply ordering
      if (orderByClause) {
        q = query(q, orderBy(orderByClause.field, orderByClause.direction || 'asc'));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const querySnapshot = await getDocs(q);
      const documents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      this.setCached(cacheKey, documents);
      return documents;
    } catch (error) {
      console.error('Error getting collection:', error);
      throw error;
    }
  }

  // Real-time listeners with cleanup
  subscribeToDocument(path, callback) {
    const listenerKey = `doc:${path}`;
    
    // Clean up existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)();
    }

    try {
      const docRef = doc(db, ...path.split('/'));
      const unsubscribe = onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = { id: doc.id, ...doc.data() };
          this.setCached(listenerKey, data);
          callback(data);
        } else {
          callback(null);
        }
      }, (error) => {
        console.error('Document listener error:', error);
        callback(null, error);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up document listener:', error);
      throw error;
    }
  }

  subscribeToCollection(path, callback, options = {}) {
    const { 
      whereClauses = [], 
      orderByClause = null, 
      limitCount = null 
    } = options;

    const listenerKey = `collection:${path}:${JSON.stringify(options)}`;
    
    // Clean up existing listener
    if (this.listeners.has(listenerKey)) {
      this.listeners.get(listenerKey)();
    }

    try {
      const collectionRef = collection(db, ...path.split('/'));
      let q = collectionRef;

      // Apply where clauses
      whereClauses.forEach(({ field, operator, value }) => {
        q = query(q, where(field, operator, value));
      });

      // Apply ordering
      if (orderByClause) {
        q = query(q, orderBy(orderByClause.field, orderByClause.direction || 'asc'));
      }

      // Apply limit
      if (limitCount) {
        q = query(q, limit(limitCount));
      }

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const documents = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        this.setCached(listenerKey, documents);
        callback(documents);
      }, (error) => {
        console.error('Collection listener error:', error);
        callback([], error);
      });

      this.listeners.set(listenerKey, unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up collection listener:', error);
      throw error;
    }
  }

  // Cleanup all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
  }

  // Network management
  async enableNetwork() {
    try {
      await enableNetwork(db);
      console.log('Firestore network enabled');
    } catch (error) {
      console.error('Error enabling network:', error);
    }
  }

  async disableNetwork() {
    try {
      await disableNetwork(db);
      console.log('Firestore network disabled');
    } catch (error) {
      console.error('Error disabling network:', error);
    }
  }

  // Transaction support
  async runTransaction(updateFunction) {
    try {
      return await runTransaction(db, updateFunction);
    } catch (error) {
      console.error('Transaction error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new FirebaseService();
