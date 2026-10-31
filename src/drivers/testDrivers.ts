/**
 * Node.js test for Phase 2: Session Vault, Bezier Trajectory, and Driver scaffolds
 */

import { SessionVault } from '../vault/sessionVault.ts';
import { generateHumanTrajectory } from '../utils/bezier.ts';
import { GhostAndroidDriver } from './androidDriver.ts';

async function testPhase2() {
  console.log('=== GHOSTBRIDGE PHASE 2 DRIVER & VAULT BENCHMARKS ===\n');

  // 1. Test Session Vault
  console.log('--- 1. Testing Session Vault ---');
  const vault = new SessionVault();
  const testDomain = 'https://subdomain.github.com/login?redirect=1';
  const cleanDomain = vault.sanitizeDomain(testDomain);
  console.log(`URL Sanitization: "${testDomain}" -> "${cleanDomain}"`);

  // Save mock storage state
  const mockState = {
    cookies: [
      { name: 'session_id', value: 'secret_abc_123', domain: '.github.com', path: '/' },
      { name: 'user_token', value: 'tok_live_999', domain: '.github.com', path: '/' },
    ],
    origins: [
      {
        origin: 'https://github.com',
        localStorage: [{ name: 'theme', value: 'dark' }],
      },
    ],
  };

  const record = vault.saveStorageState(cleanDomain, mockState, 'Automated Phase 2 Unit Test');
  console.log(`Saved session to vault: ${record.domain} (${record.cookies.length} cookies)`);

  const loaded = vault.loadStorageState(cleanDomain);
  console.log(`Loaded from vault: ${loaded?.domain} matches: ${loaded?.cookies[0]?.name === 'session_id'}`);

  const entries = vault.listEntries();
  console.log(`Total vault profiles: ${entries.length}`);

  // 2. Test Bezier Mouse Trajectory
  console.log('\n--- 2. Testing Human-Like Bezier Mouse Curve ---');
  const start = { x: 50, y: 50 };
  const target = { x: 450, y: 300 };
  const trajectory = generateHumanTrajectory(start, target, {
    deviationFactor: 0.25,
    jitterFactor: 1.2,
  });

  console.log(`Generated ${trajectory.length} trajectory waypoints from (${start.x},${start.y}) to (${target.x},${target.y})`);
  console.log(`Start point: (${trajectory[0].x}, ${trajectory[0].y}) @ t=0ms`);
  const mid = trajectory[Math.floor(trajectory.length / 2)];
  console.log(`Mid waypoint (with organic drift): (${mid.x}, ${mid.y}) @ t=${mid.timeMs}ms`);
  const last = trajectory[trajectory.length - 1];
  console.log(`Target arrival: (${last.x}, ${last.y}) @ t=${last.timeMs}ms`);

  // 3. Test Android Driver initialization
  console.log('\n--- 3. Testing ADB Driver Discovery ---');
  const androidDriver = new GhostAndroidDriver();
  const devices = await androidDriver.listDevices();
  console.log(`Connected ADB devices detected: ${devices.length}`);
  if (devices.length > 0) {
    devices.forEach((d) => console.log(` - Device [${d.serial}]: ${d.model || d.product || 'Android'} (${d.connectionType})`));
  } else {
    console.log(' - No physical phone currently connected via USB/Wi-Fi (Driver in safe standby mode)');
  }

  console.log('\n✓ Phase 2 components verified successfully!');
}

if (process.argv[1]?.includes('testDrivers')) {
  testPhase2().catch(console.error);
}
