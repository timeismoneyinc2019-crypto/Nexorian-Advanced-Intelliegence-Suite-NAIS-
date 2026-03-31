/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, auth } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { NexusKernel } from './nexusKernel';

export interface SubscriptionInfo {
  status: 'active' | 'inactive' | 'expired';
  tier: 'professional' | 'enterprise';
  expiryDate: number;
  licenseKey: string;
}

export class LicenseService {
  private static readonly LICENSE_DOC = 'nexus/licensing';

  /**
   * Verifies a license key and updates the kernel state
   */
  static async verifyAndActivate(key: string): Promise<boolean> {
    console.log(`License Service: VERIFYING KEY [${key}]`);
    
    // In a real enterprise app, this would call a secure backend or check a signed JWT
    // For this implementation, we use a deterministic check based on the key format
    const isValid = this.validateKeyFormat(key);
    
    if (isValid) {
      const info: SubscriptionInfo = {
        status: 'active',
        tier: key.includes('ENT') ? 'enterprise' : 'professional',
        expiryDate: Date.now() + (30 * 24 * 60 * 60 * 1000), // 30 days
        licenseKey: key
      };

      await NexusKernel.updateConfig({
        subscriptionActive: true,
        licenseKey: key
      });

      // Persist license info globally for the instance
      await setDoc(doc(db, this.LICENSE_DOC), info);
      
      console.log(`License Service: ACTIVATION SUCCESSFUL [Tier: ${info.tier}]`);
      return true;
    }

    console.error('License Service: INVALID LICENSE KEY');
    return false;
  }

  private static validateKeyFormat(key: string): boolean {
    // Format: NEXUS-[PRO|ENT]-[A-Z0-9]{4}-[A-Z0-9]{4}
    const regex = /^NEXUS-(PRO|ENT)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
    return regex.test(key);
  }

  /**
   * Checks if the current subscription is still valid
   */
  static async checkSubscription(): Promise<boolean> {
    const snap = await getDoc(doc(db, this.LICENSE_DOC));
    if (!snap.exists()) return false;

    const info = snap.data() as SubscriptionInfo;
    const isExpired = Date.now() > info.expiryDate;

    if (isExpired) {
      await NexusKernel.updateConfig({ subscriptionActive: false });
      return false;
    }

    return info.status === 'active';
  }
}
