import { processBiometricMatch, computeFeatureMatch } from '../server';
import fs from 'fs';
import path from 'path';

async function runBiometricsAndModuleTests() {
  console.log("=================================================");
  console.log(" EngenharQ OS - Automated Test Suite ");
  console.log("=================================================\n");

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] Test ${totalTests}: ${testName}`);
    } else {
      console.error(`❌ [FAIL] Test ${totalTests}: ${testName}`);
      if (detail) console.error(`   Details: ${detail}`);
    }
  }

  // 1. Check Package Name in package.json
  try {
    const pkgPath = path.join(process.cwd(), 'package.json');
    const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    assert(pkgContent.name === 'engenharq-os', 'package.json "name" field is "engenharq-os"', `Got "${pkgContent.name}"`);
  } catch (e: any) {
    assert(false, 'package.json "name" field check', e.message);
  }

  // 2. Check Existence of All 8 Module Components + BiometricScanner
  const requiredFiles = [
    'src/pages/Dashboard.tsx',
    'src/pages/Scanner.tsx',
    'src/pages/Assets.tsx',
    'src/pages/Workers.tsx',
    'src/pages/Sites.tsx',
    'src/pages/Map.tsx',
    'src/pages/PrintTags.tsx',
    'src/pages/Audit.tsx',
    'src/components/BiometricScanner.tsx',
    'supabase/schema.sql'
  ];

  for (const relPath of requiredFiles) {
    const fullPath = path.join(process.cwd(), relPath);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Module file exists: ${relPath}`);
  }

  // 3. Prepare Test Image Base64 Data
  // Create solid white canvas image data (10x10 JPEG/PNG base64 equivalent) and solid dark image data
  const base64SampleA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNk+M9QzwAFjIwM/4mE2Dg0MBIS49DASEiMQwMjITEODQxYhBA+E00fQIoBANgCGf5xN3m1AAAAAElFTkSuQmCC";
  const base64SampleA_duplicate = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNk+M9QzwAFjIwM/4mE2Dg0MBIS49DASEiMQwMjITEODQxYhBA+E00fQIoBANgCGf5xN3m1AAAAAElFTkSuQmCC";
  
  // Creating distinct image B with different bytes pattern
  const base64SampleB = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVRYR+3QQREAAAzCQNr/0psKzh0qYFNJ6q9bAQECBAgQIECAAAECBB4LHk0BAf8t8r4AAAAASUVORK5CYII=";

  console.log("\n--- Testing Biometric Facial Matching Logic ---\n");

  // Test Case 4: Valid Match (Identical / Matching Face Sample) -> MUST APPROVE
  try {
    const matchRes = await processBiometricMatch(base64SampleA, base64SampleA_duplicate);
    assert(
      matchRes.status === 200 && matchRes.result.match === true && matchRes.result.score >= 75.0,
      'Biometric Match: Valid matching face MUST BE APPROVED (match: true, score >= 75)',
      `Returned: ${JSON.stringify(matchRes.result)}`
    );
  } catch (e: any) {
    assert(false, 'Biometric Match: Valid matching face', e.message);
  }

  // Test Case 5: Mismatched Face (Distinct Persons / Non-Matching Images) -> MUST REJECT
  try {
    const noMatchRes = await processBiometricMatch(base64SampleA, base64SampleB);
    assert(
      noMatchRes.status === 200 && noMatchRes.result.match === false,
      'Biometric Match: Non-matching faces MUST BE REJECTED (match: false)',
      `Returned: ${JSON.stringify(noMatchRes.result)}`
    );
  } catch (e: any) {
    assert(false, 'Biometric Match: Non-matching faces', e.message);
  }

  // Test Case 6: Unregistered Worker (No Reference Photo) -> MUST REJECT
  try {
    const unregisteredRes = await processBiometricMatch(base64SampleA, 'unregistered');
    assert(
      unregisteredRes.status === 200 && unregisteredRes.result.match === false && unregisteredRes.result.score === 0,
      'Biometric Match: Unregistered face MUST BE REJECTED (match: false, score: 0)',
      `Returned: ${JSON.stringify(unregisteredRes.result)}`
    );
  } catch (e: any) {
    assert(false, 'Biometric Match: Unregistered face', e.message);
  }

  // Test Case 7: Missing Selfie -> Status 400
  try {
    const missingSelfieRes = await processBiometricMatch("", base64SampleA);
    assert(
      missingSelfieRes.status === 400,
      'Biometric Match: Missing selfie returns 400 Bad Request',
      `Returned status: ${missingSelfieRes.status}`
    );
  } catch (e: any) {
    assert(false, 'Biometric Match: Missing selfie', e.message);
  }

  console.log("\n=================================================");
  console.log(` Test Summary: ${passedTests}/${totalTests} Passed `);
  console.log("=================================================\n");

  if (passedTests < totalTests) {
    process.exit(1);
  }
}

runBiometricsAndModuleTests();
