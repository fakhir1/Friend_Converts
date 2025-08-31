// License validation service for Chrome extension
export interface LicenseResponse {
  valid: boolean;
  status?: number;
  error?: string;
  data?: {
    status: number;
    expires_at?: string;
    user_id?: string;
  };
}

export class LicenseService {
  private static readonly API_BASE = 'https://friendconvert.net/wp-json/lmfwc/v2';

  // Note: In production, these should be handled more securely
  // Consider using a proxy endpoint or environment variables
  private static readonly CONSUMER_KEY = 'ck_4f30c589b534effdc0b3f7dbf8aaf867a7692390';
  private static readonly CONSUMER_SECRET = 'cs_49394afe29908bc33d246ffa3234b5aacf95bed3';

  // Cache for license validation to avoid frequent API calls
  private static licenseCache: Map<string, { valid: boolean; timestamp: number }> = new Map();
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Validates a license key against the WooCommerce API
   * @param licenseKey The license key to validate
   * @param useCache Whether to use cached results (default: true)
   * @returns Promise<LicenseResponse>
   */
  static async validateLicense(licenseKey: string, useCache: boolean = true): Promise<LicenseResponse> {
    if (!licenseKey || licenseKey.trim() === '') {
      return { valid: false, error: 'License key is required' };
    }

    // Check cache first
    if (useCache) {
      const cached = this.getCachedResult(licenseKey);
      if (cached) {
        return { valid: cached.valid };
      }
    }

    try {
      // Create authorization header
      const credentials = btoa(`${this.CONSUMER_KEY}:${this.CONSUMER_SECRET}`);
      const headers = {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/json',
      };

      // Make API request
      const response = await fetch(`${this.API_BASE}/licenses/${licenseKey}`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const licenseData = data.data || {};
      const status = licenseData.status;

      // Status 2 means active license in WooCommerce License Manager
      const isValid = status === 2;

      // Cache the result
      this.setCachedResult(licenseKey, isValid);

      return {
        valid: isValid,
        status: status,
        data: licenseData
      };

    } catch (error) {
      // console.error('License validation error:', error);
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validates license with offline fallback
   * If online validation fails, check if we have a recent valid cache
   */
  static async validateLicenseWithFallback(licenseKey: string): Promise<LicenseResponse> {
    // Try online validation first
    const onlineResult = await this.validateLicense(licenseKey, false);

    if (onlineResult.valid) {
      return onlineResult;
    }

    // If online validation failed, check if we have a recent cache
    const cached = this.getCachedResult(licenseKey, 24 * 60 * 60 * 1000); // 24 hours for fallback
    if (cached && cached.valid) {
      console.warn('Using cached license validation due to network error');
      return { valid: true };
    }

    return onlineResult;
  }

  /**
   * Stores license key in Chrome storage after validation
   */
  static async storeLicenseKey(licenseKey: string): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.set({
        licenseKey: licenseKey,
        licenseValidatedAt: Date.now()
      }, () => {
        resolve();
      });
    });
  }

  /**
   * Removes license key from Chrome storage
   */
  static async removeLicenseKey(): Promise<void> {
    return new Promise((resolve) => {
      chrome.storage.local.remove(['licenseKey', 'licenseValidatedAt', 'lastPage'], () => {
        resolve();
      });
    });
  }

  /**
   * Gets stored license key from Chrome storage
   */
  static async getStoredLicenseKey(): Promise<string | null> {
    return new Promise((resolve) => {
      chrome.storage.local.get(['licenseKey'], (result) => {
        resolve(result.licenseKey || null);
      });
    });
  }

  /**
   * Validates stored license key if it exists
   */
  static async validateStoredLicense(): Promise<boolean> {
    const storedKey = await this.getStoredLicenseKey();
    if (!storedKey) {
      return false;
    }

    const result = await this.validateLicenseWithFallback(storedKey);
    return result.valid;
  }

  // Private helper methods
  private static getCachedResult(licenseKey: string, maxAge: number = this.CACHE_DURATION): { valid: boolean } | null {
    const cached = this.licenseCache.get(licenseKey);
    if (cached && (Date.now() - cached.timestamp) < maxAge) {
      return { valid: cached.valid };
    }
    return null;
  }

  private static setCachedResult(licenseKey: string, valid: boolean): void {
    this.licenseCache.set(licenseKey, {
      valid,
      timestamp: Date.now()
    });
  }

  /**
   * Clears the license cache
   */
  static clearCache(): void {
    this.licenseCache.clear();
  }
}
