/**
 * Storage Engine - IndexedDB wrapper
 * Handles all local data persistence
 */

class StorageEngine {
  constructor() {
    this.db = null;
    this.dbName = CONFIG.STORAGE.dbName;
    this.dbVersion = CONFIG.STORAGE.dbVersion;
  }

  async init() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        debugLog('Storage', 'IndexedDB initialized');
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Exposure records (raw data)
        if (!db.objectStoreNames.contains('exposureRecords')) {
          const store = db.createObjectStore('exposureRecords', {
            keyPath: 'id',
            autoIncrement: true
          });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('date', 'date', { unique: false });
        }

        // Hourly summaries
        if (!db.objectStoreNames.contains('hourlySummaries')) {
          const store = db.createObjectStore('hourlySummaries', {
            keyPath: 'id'
          });
          store.createIndex('datetime', 'datetime', { unique: true });
        }

        // Daily summaries
        if (!db.objectStoreNames.contains('dailySummaries')) {
          const store = db.createObjectStore('dailySummaries', {
            keyPath: 'date'
          });
          store.createIndex('date', 'date', { unique: true });
        }

        // Settings
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };
    });
  }

  // Settings
  async saveSetting(key, value) {
    const tx = this.db.transaction(['settings'], 'readwrite');
    const store = tx.objectStore('settings');
    return store.put({ key, value });
  }

  async getSetting(key, defaultValue = null) {
    try {
      if (!this.db) {
        console.warn('Database not initialized, returning default value');
        return defaultValue;
      }
      const tx = this.db.transaction(['settings'], 'readonly');
      const store = tx.objectStore('settings');
      const result = await store.get(key);
      return result ? result.value : defaultValue;
    } catch (error) {
      console.error(`Error getting setting ${key}:`, error);
      return defaultValue;
    }
  }

  // Exposure records
  async saveExposureRecord(record) {
    const tx = this.db.transaction(['exposureRecords'], 'readwrite');
    const store = tx.objectStore('exposureRecords');
    return store.add(record);
  }

  async getTodayRecords() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tx = this.db.transaction(['exposureRecords'], 'readonly');
    const store = tx.objectStore('exposureRecords');
    const index = store.index('timestamp');
    const range = IDBKeyRange.bound(today.getTime(), tomorrow.getTime());

    return new Promise((resolve) => {
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Hourly summaries
  async saveHourlySummary(summary) {
    const tx = this.db.transaction(['hourlySummaries'], 'readwrite');
    const store = tx.objectStore('hourlySummaries');
    return store.put(summary);
  }

  async getHourlySummaries(daysBack = 0) {
    try {
      if (!this.db) {
        console.warn('Database not initialized');
        return [];
      }

      // Calculate date range - default to TODAY (daysBack = 0)
      const now = new Date();
      const targetDate = new Date(now);

      // daysBack = 0 means today, daysBack = 1 means yesterday, etc.
      if (daysBack > 0) {
        targetDate.setDate(targetDate.getDate() - daysBack);
      }

      const dateStr = targetDate.toISOString().split('T')[0];

      const tx = this.db.transaction(['hourlySummaries'], 'readonly');
      const store = tx.objectStore('hourlySummaries');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          const results = request.result.filter(s =>
            s.datetime && s.datetime.startsWith(dateStr)
          );
          debugLog('Storage', `Found ${results.length} hourly summaries for ${dateStr}`);
          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting hourly summaries:', error);
      return [];
    }
  }

  // Daily summaries
  async saveDailySummary(summary) {
    const tx = this.db.transaction(['dailySummaries'], 'readwrite');
    const store = tx.objectStore('dailySummaries');
    return store.put(summary);
  }

  async getTodaySummary() {
    try {
      if (!this.db) {
        console.warn('Database not initialized');
        return null;
      }
      const today = new Date().toISOString().split('T')[0];
      const tx = this.db.transaction(['dailySummaries'], 'readonly');
      const store = tx.objectStore('dailySummaries');

      return new Promise((resolve, reject) => {
        const request = store.get(today);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting today summary:', error);
      return null;
    }
  }

  async getDailySummaries(daysBackOrStartDate, endDate = null) {
    try {
      if (!this.db) {
        console.warn('Database not initialized');
        return [];
      }

      const tx = this.db.transaction(['dailySummaries'], 'readonly');
      const store = tx.objectStore('dailySummaries');

      return new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => {
          let results = request.result;

          // If number provided, treat as days back from today
          if (typeof daysBackOrStartDate === 'number') {
            const daysBack = daysBackOrStartDate;
            const endDate = new Date();
            endDate.setHours(23, 59, 59, 999);
            const startDate = new Date(endDate);
            startDate.setDate(startDate.getDate() - daysBack);
            startDate.setHours(0, 0, 0, 0);

            results = results.filter(s => {
              const date = new Date(s.date);
              return date >= startDate && date <= endDate;
            });
          }
          // If Date objects provided, use date range
          else if (daysBackOrStartDate instanceof Date && endDate instanceof Date) {
            results = results.filter(s => {
              const date = new Date(s.date);
              return date >= daysBackOrStartDate && date <= endDate;
            });
          }

          resolve(results);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error getting daily summaries:', error);
      return [];
    }
  }

  // Export all data
  async exportData() {
    const [exposures, hourly, daily, settings] = await Promise.all([
      this.getAllFromStore('exposureRecords'),
      this.getAllFromStore('hourlySummaries'),
      this.getAllFromStore('dailySummaries'),
      this.getAllFromStore('settings')
    ]);

    return {
      version: CONFIG.APP.version,
      exportDate: new Date().toISOString(),
      data: { exposures, hourly, daily, settings }
    };
  }

  async getAllFromStore(storeName) {
    const tx = this.db.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
    });
  }

  // Clear all data
  async clearAllData() {
    const stores = ['exposureRecords', 'hourlySummaries', 'dailySummaries'];
    for (const storeName of stores) {
      const tx = this.db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      await store.clear();
    }
    debugLog('Storage', 'All data cleared');
  }
}

// Global instance
const storageEngine = new StorageEngine();
