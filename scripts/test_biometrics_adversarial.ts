import { processBiometricMatch, computeFeatureMatch, extractBuffer, extractFeatureVector } from '../server';

interface TestResult {
  category: string;
  name: string;
  passed: boolean;
  durationMs: number;
  details?: string;
}

const results: TestResult[] = [];

function assertTest(category: string, name: string, condition: boolean, durationMs: number, details?: string) {
  results.push({ category, name, passed: condition, durationMs, details });
  if (condition) {
    console.log(`  ✅ [PASS] ${category} - ${name} (${durationMs.toFixed(1)}ms)`);
  } else {
    console.error(`  ❌ [FAIL] ${category} - ${name} (${durationMs.toFixed(1)}ms)`);
    if (details) console.error(`      Details: ${details}`);
  }
}

// Sample Image Payloads
const IMG_WHITE_10x10 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNk+M9QzwAFjIwM/4mE2Dg0MBIS49DASEiMQwMjITEODQxYhBA+E00fQIoBANgCGf5xN3m1AAAAAElFTkSuQmCC";
const IMG_WHITE_DUP = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAMklEQVR42mNk+M9QzwAFjIwM/4mE2Dg0MBIS49DASEiMQwMjITEODQxYhBA+E00fQIoBANgCGf5xN3m1AAAAAElFTkSuQmCC";
const IMG_TRANSPARENT_32x32 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAALUlEQVRYR+3QQREAAAzCQNr/0psKzh0qYFNJ6q9bAQECBAgQIECAAAECBB4LHk0BAf8t8r4AAAAASUVORK5CYII=";

// Generate a synthetic solid black 50x50 PNG base64
const bufBlack = Buffer.alloc(1000, 0x00);
const IMG_SOLID_BLACK = "data:image/png;base64," + bufBlack.toString('base64');

// Generate a synthetic high-entropy noise payload
const bufNoise = Buffer.alloc(1000);
for (let i = 0; i < bufNoise.length; i++) bufNoise[i] = (i * 37 + 13) % 256;
const IMG_NOISE = "data:image/png;base64," + bufNoise.toString('base64');

// Generate another noise payload with inverted spectrum
const bufNoiseInverted = Buffer.alloc(1000);
for (let i = 0; i < bufNoiseInverted.length; i++) bufNoiseInverted[i] = 255 - bufNoise[i];
const IMG_NOISE_INVERTED = "data:image/png;base64," + bufNoiseInverted.toString('base64');

async function runAdversarialSuite() {
  console.log("=========================================================================");
  console.log(" EngenharQ OS - Biometric Engine Empirical Adversarial & Stress Harness ");
  console.log("=========================================================================\n");

  // SECTION 1: Deterministic Accuracy & Matching
  console.log("--- Category 1: Deterministic Matching & Rejection ---");

  // 1.1 Identical payload -> MUST APPROVE
  let t0 = performance.now();
  try {
    const res = await processBiometricMatch(IMG_WHITE_10x10, IMG_WHITE_DUP);
    const t1 = performance.now();
    assertTest(
      "Accuracy",
      "Identical face images MUST BE APROVED (match: true, score >= 75)",
      res.status === 200 && res.result.match === true && res.result.score >= 75,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Accuracy", "Identical face images", false, performance.now() - t0, e.message);
  }

  // 1.2 Distinct face images -> MUST REJECT
  t0 = performance.now();
  try {
    const res = await processBiometricMatch(IMG_WHITE_10x10, IMG_TRANSPARENT_32x32);
    const t1 = performance.now();
    assertTest(
      "Accuracy",
      "Distinct face images MUST BE REJECTED (match: false)",
      res.status === 200 && res.result.match === false,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Accuracy", "Distinct face images", false, performance.now() - t0, e.message);
  }

  // 1.3 Opposite noise spectrums -> MUST REJECT with low score
  t0 = performance.now();
  try {
    const res = await processBiometricMatch(IMG_NOISE, IMG_NOISE_INVERTED);
    const t1 = performance.now();
    assertTest(
      "Accuracy",
      "Inverted noise spectrum images MUST BE REJECTED (match: false)",
      res.status === 200 && res.result.match === false && res.result.score < 50,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Accuracy", "Inverted noise spectrum", false, performance.now() - t0, e.message);
  }

  // 1.4 Unregistered / missing reference tokens
  const unregTokens = ['unregistered', 'no_match', 'mock_reference_path', 'none'];
  for (const token of unregTokens) {
    t0 = performance.now();
    try {
      const res = await processBiometricMatch(IMG_WHITE_10x10, token);
      const t1 = performance.now();
      assertTest(
        "Accuracy",
        `Reference token '${token}' MUST BE REJECTED (match: false, score: 0)`,
        res.status === 200 && res.result.match === false && res.result.score === 0,
        t1 - t0,
        `Result: ${JSON.stringify(res.result)}`
      );
    } catch (e: any) {
      assertTest("Accuracy", `Reference token '${token}'`, false, performance.now() - t0, e.message);
    }
  }


  // SECTION 2: Malicious / Invalid Payload Resilience
  console.log("\n--- Category 2: Invalid Payload & Edge Case Handling ---");

  // 2.1 Empty selfie string -> Status 400
  t0 = performance.now();
  try {
    const res = await processBiometricMatch("", IMG_WHITE_10x10);
    const t1 = performance.now();
    assertTest(
      "Resilience",
      "Empty string selfie returns 400 Bad Request",
      res.status === 400 && res.result.error !== undefined,
      t1 - t0,
      `Status: ${res.status}, Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Resilience", "Empty string selfie", false, performance.now() - t0, e.message);
  }

  // 2.2 Header-only base64 ("data:image/png;base64,") -> Rejection / empty buffer handling
  t0 = performance.now();
  try {
    const res = await processBiometricMatch("data:image/png;base64,", IMG_WHITE_10x10);
    const t1 = performance.now();
    assertTest(
      "Resilience",
      "Header-only base64 ('data:image/png;base64,') handles gracefully without throwing",
      (res.status === 200 && res.result.match === false) || res.status === 400,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Resilience", "Header-only base64", false, performance.now() - t0, e.message);
  }

  // 2.3 Malformed non-base64 noise payload ("@#$%^&*()!@#$")
  t0 = performance.now();
  try {
    const res = await processBiometricMatch("!@#$%^&*()!@#$%^&*()", IMG_WHITE_10x10);
    const t1 = performance.now();
    assertTest(
      "Resilience",
      "Malformed non-base64 text payload handles safely without crash",
      res.status === 200 || res.status === 400,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Resilience", "Malformed payload", false, performance.now() - t0, e.message);
  }

  // 2.4 Null / undefined reference photo
  t0 = performance.now();
  try {
    const res = await processBiometricMatch(IMG_WHITE_10x10, undefined as any);
    const t1 = performance.now();
    assertTest(
      "Resilience",
      "Undefined reference photo is safely REJECTED (match: false, score: 0)",
      res.status === 200 && res.result.match === false && res.result.score === 0,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Resilience", "Undefined reference photo", false, performance.now() - t0, e.message);
  }

  // 2.5 Extremely short 1-byte payload
  t0 = performance.now();
  try {
    const res = await processBiometricMatch("data:image/png;base64,AA==", IMG_WHITE_10x10);
    const t1 = performance.now();
    assertTest(
      "Resilience",
      "1-byte base64 payload is safely handled",
      res.status === 200,
      t1 - t0,
      `Result: ${JSON.stringify(res.result)}`
    );
  } catch (e: any) {
    assertTest("Resilience", "1-byte payload", false, performance.now() - t0, e.message);
  }


  // SECTION 3: Mathematical Boundary & Threshold Consistency
  console.log("\n--- Category 3: Mathematical Threshold Verification ---");

  // Direct unit test on computeFeatureMatch
  t0 = performance.now();
  const directMatch = computeFeatureMatch(IMG_WHITE_10x10, IMG_WHITE_DUP);
  const t1 = performance.now();
  assertTest(
    "Unit Math",
    "computeFeatureMatch: score calculation and boolean match consistency",
    directMatch.match === (directMatch.score >= 75.0) && typeof directMatch.score === 'number',
    t1 - t0,
    `Match: ${directMatch.match}, Score: ${directMatch.score}`
  );

  // Test zero-buffer handling in extractFeatureVector
  t0 = performance.now();
  const emptyVec = extractFeatureVector(Buffer.alloc(0), 256);
  const t2 = performance.now();
  assertTest(
    "Unit Math",
    "extractFeatureVector: empty buffer returns array of zeros of length 256",
    emptyVec.length === 256 && emptyVec.every(v => v === 0),
    t2 - t0
  );


  // SECTION 4: Concurrency & Stress Load Testing
  console.log("\n--- Category 4: Concurrency & Stress Load Testing ---");

  // 4.1 100 Parallel Concurrent Requests
  const CONCURRENT_COUNT = 100;
  t0 = performance.now();
  const promises = [];
  for (let i = 0; i < CONCURRENT_COUNT; i++) {
    const isMatchCase = i % 2 === 0;
    const ref = isMatchCase ? IMG_WHITE_DUP : IMG_TRANSPARENT_32x32;
    promises.push(processBiometricMatch(IMG_WHITE_10x10, ref).then(res => ({ index: i, isMatchCase, res })));
  }

  try {
    const batchResults = await Promise.all(promises);
    const duration = performance.now() - t0;
    
    let allValid = true;
    let matchErrors = 0;

    for (const item of batchResults) {
      if (item.res.status !== 200) {
        allValid = false;
      }
      if (item.isMatchCase && item.res.result.match !== true) {
        matchErrors++;
      }
      if (!item.isMatchCase && item.res.result.match !== false) {
        matchErrors++;
      }
    }

    assertTest(
      "Stress Load",
      `100 Parallel Requests: 0 crashes, 100% deterministic accuracy (Total Time: ${duration.toFixed(1)}ms)`,
      allValid && matchErrors === 0,
      duration,
      `Batch size: ${CONCURRENT_COUNT}, Match errors: ${matchErrors}, Avg per request: ${(duration / CONCURRENT_COUNT).toFixed(2)}ms`
    );
  } catch (e: any) {
    assertTest("Stress Load", "100 Parallel Requests", false, performance.now() - t0, e.message);
  }

  // 4.2 Large Payload Stress (2MB synthetic image string)
  t0 = performance.now();
  const largeBuf = Buffer.alloc(2 * 1024 * 1024, 0xAB);
  const largeBase64 = "data:image/jpeg;base64," + largeBuf.toString('base64');
  
  try {
    const largeRes = await processBiometricMatch(largeBase64, largeBase64);
    const duration = performance.now() - t0;
    assertTest(
      "Stress Load",
      `2MB Large Payload: Processed without memory error or stack overflow`,
      largeRes.status === 200 && largeRes.result.match === true,
      duration,
      `Score: ${largeRes.result.score}, Execution Time: ${duration.toFixed(1)}ms`
    );
  } catch (e: any) {
    assertTest("Stress Load", "2MB Large Payload", false, performance.now() - t0, e.message);
  }


  // SUMMARY & REPORT GENERATION
  console.log("\n=========================================================================");
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;
  console.log(` Final Adversarial & Stress Test Results: ${passed}/${total} PASSED (${failed} FAILED)`);
  console.log("=========================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdversarialSuite();
