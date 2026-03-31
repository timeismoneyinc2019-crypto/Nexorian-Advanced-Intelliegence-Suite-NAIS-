/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { NexusKernel } from './nexusKernel';

export interface IntegrityState {
  version: string;
  config: Record<string, any>;
  lastVerified: number;
  checksum: string;
}

export class IntegrityService {
  private static readonly BASELINE_DOC = 'system/baseline';
  private static readonly CURRENT_DOC = 'system/current';

  /**
   * Calculates a simple checksum of a configuration object
   */
  private static calculateChecksum(obj: any): string {
    return btoa(JSON.stringify(obj)).slice(0, 32);
  }

  /**
   * Calculates the drift between two objects (0 to 1)
   */
  private static calculateDrift(baseline: any, current: any): number {
    const baselineStr = JSON.stringify(baseline);
    const currentStr = JSON.stringify(current);
    
    if (baselineStr === currentStr) return 0;
    
    // Simple property count difference
    const baselineKeys = Object.keys(baseline);
    const currentKeys = Object.keys(current);
    
    let diffCount = 0;
    const allKeys = new Set([...baselineKeys, ...currentKeys]);
    
    allKeys.forEach(key => {
      if (JSON.stringify(baseline[key]) !== JSON.stringify(current[key])) {
        diffCount++;
      }
    });
    
    return diffCount / allKeys.size;
  }

  /**
   * Monitors system integrity and performs self-healing if drift exceeds threshold
   */
  static monitorIntegrity(onDriftDetected?: (drift: number) => void) {
    console.log('Integrity Monitor: ACTIVE');
    
    return onSnapshot(doc(db, this.CURRENT_DOC), async (snapshot) => {
      if (!snapshot.exists()) return;

      const currentData = snapshot.data();
      const baselineSnap = await getDoc(doc(db, this.BASELINE_DOC));
      
      if (!baselineSnap.exists()) {
        console.warn('Integrity Monitor: No baseline found. Establishing current as baseline.');
        await setDoc(doc(db, this.BASELINE_DOC), currentData);
        return;
      }

      const baselineData = baselineSnap.data();
      const drift = this.calculateDrift(baselineData, currentData);
      const threshold = NexusKernel.getConfig().driftThreshold;

      console.log(`Integrity Monitor: Drift detected at ${(drift * 100).toFixed(2)}% (Threshold: ${(threshold * 100).toFixed(2)}%)`);

      if (drift > threshold) {
        console.error('Integrity Monitor: CRITICAL DRIFT DETECTED. Initiating Self-Healing Protocol.');
        if (onDriftDetected) onDriftDetected(drift);
        
        // Self-healing: Rollback to baseline
        await this.realign(baselineData);
      }
    });
  }

  /**
   * Manually realigns the system to the baseline
   */
  static async realign(targetState?: any) {
    const state = targetState || (await getDoc(doc(db, this.BASELINE_DOC))).data();
    if (!state) return;

    console.log('Integrity Monitor: Re-aligning system state...');
    await setDoc(doc(db, this.CURRENT_DOC), {
      ...state,
      lastVerified: Date.now(),
      status: 'REALIGNED'
    });
    console.log('Integrity Monitor: System integrity restored.');
  }

  /**
   * Sets a new baseline for the system
   */
  static async setBaseline(config: any) {
    const state: IntegrityState = {
      version: '1.0.0',
      config,
      lastVerified: Date.now(),
      checksum: this.calculateChecksum(config)
    };
    
    await setDoc(doc(db, this.BASELINE_DOC), state);
    await setDoc(doc(db, this.CURRENT_DOC), state);
    console.log('Integrity Monitor: New baseline established.');
  }
}
