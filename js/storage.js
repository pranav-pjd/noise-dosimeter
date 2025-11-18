/**
 * Storage Module - IndexedDB wrapper for local data persistence
 * Implements privacy-first architecture with all data stored locally
 */

class StorageManager {
  constructor() {
    this.dbName = 'NoiseDosimeterDB';
    this.dbVersion = 1;
    this.db = null;
  }

  /**
   * Initialize the IndexedDB database
   */
  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error('IndexedDB error:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object stores
        if (!db.objectStoreNames.contains('exposureRecords')) {
          const exposureStore = db.createObjectStore('exposureRecords', {
            keyPath: 'id',
            autoIncrement: true
          });
          exposureStore.createIndex('timestamp', 'timestamp', { unique: false });
          exposureStore.createIndex('date', 'date', { unique: false });
        }

        if (!db.objectStoreNames.contains('dailySummary')) {
          const summaryStore = db.createObjectStore('dailySummary', {
            keyPath: 'date'
          });
          summaryStore.createIndex('date', 'date', { unique: true });
        }

        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }

        console.log('IndexedDB schema created');
      };
    });
  }

  /**
   * Save an exposure record
   */
  async saveExposureRecord(record) {
    const transaction = this.db.transaction(['exposureRecords'], 'readwrite');
    const store = transaction.objectStore('exposureRecords');

    return new Promise((resolve, reject) => {
      const request = store.add(record);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get exposure records for a date range
   */
  async getExposureRecords(startDate, endDate) {
    const transaction = this.db.transaction(['exposureRecords'], 'readonly');
    const store = transaction.objectStore('exposureRecords');
    const index = store.index('timestamp');

    const range = IDBKeyRange.bound(startDate.getTime(), endDate.getTime());

    return new Promise((resolve, reject) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get exposure records for today
   */
  async getTodayRecords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return this.getExposureRecords(today, tomorrow);
  }

  /**
   * Save daily summary
   */
  async saveDailySummary(summary) {
    const transaction = this.db.transaction(['dailySummary'], 'readwrite');
    const store = transaction.objectStore('dailySummary');

    return new Promise((resolve, reject) => {
      const request = store.put(summary);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get daily summaries for date range
   */
  async getDailySummaries(startDate, endDate) {
    const transaction = this.db.transaction(['dailySummary'], 'readonly');
    const store = transaction.objectStore('dailySummary');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.filter(summary => {
          const date = new Date(summary.date);
          return date >= startDate && date <= endDate;
        });
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get today's summary
   */
  async getTodaySummary() {
    const today = new Date().toISOString().split('T')[0];
    const transaction = this.db.transaction(['dailySummary'], 'readonly');
    const store = transaction.objectStore('dailySummary');

    return new Promise((resolve, reject) => {
      const request = store.get(today);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Save a setting
   */
  async saveSetting(key, value) {
    const transaction = this.db.transaction(['settings'], 'readwrite');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get a setting
   */
  async getSetting(key, defaultValue = null) {
    const transaction = this.db.transaction(['settings'], 'readonly');
    const store = transaction.objectStore('settings');

    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.value : defaultValue);
      };
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Export all data as JSON
   */
  async exportData() {
    const exposureRecords = await this.getAllRecords('exposureRecords');
    const dailySummaries = await this.getAllRecords('dailySummary');
    const settings = await this.getAllRecords('settings');

    return {
      version: this.dbVersion,
      exportDate: new Date().toISOString(),
      data: {
        exposureRecords,
        dailySummaries,
        settings
      }
    };
  }

  /**
   * Get all records from a store
   */
  async getAllRecords(storeName) {
    const transaction = this.db.transaction([storeName], 'readonly');
    const store = transaction.objectStore(storeName);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all data (for testing or user request)
   */
  async clearAllData() {
    const storeNames = ['exposureRecords', 'dailySummary'];

    for (const storeName of storeNames) {
      const transaction = this.db.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      await new Promise((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }

    console.log('All data cleared');
  }

  /**
   * Get statistics
   */
  async getStats() {
    const transaction = this.db.transaction(['exposureRecords', 'dailySummary'], 'readonly');
    const exposureStore = transaction.objectStore('exposureRecords');
    const summaryStore = transaction.objectStore('dailySummary');

    const exposureCount = await new Promise((resolve) => {
      const request = exposureStore.count();
      request.onsuccess = () => resolve(request.result);
    });

    const summaryCount = await new Promise((resolve) => {
      const request = summaryStore.count();
      request.onsuccess = () => resolve(request.result);
    });

    return {
      totalRecords: exposureCount,
      totalDays: summaryCount
    };
  }
}

// Create global instance
const storage = new StorageManager();
