import { processBiometricMatch, computeFeatureMatch } from '../server';

async function investigateBiometricVulnerabilities() {
  console.log("=========================================================================");
  console.log(" EngenharQ OS - Deep Empirical Vulnerability Analysis ");
  console.log("=========================================================================\n");

  // Helper to construct PNG base64 with filled bytes
  function makeBase64(fillVal: number, len = 1024): string {
    const b = Buffer.alloc(len, fillVal);
    return "data:image/png;base64," + b.toString('base64');
  }

  function makePatternBase64(generator: (i: number) => number, len = 1024): string {
    const b = Buffer.alloc(len);
    for (let i = 0; i < len; i++) b[i] = generator(i);
    return "data:image/png;base64," + b.toString('base64');
  }

  const white = makeBase64(255);
  const grey = makeBase64(128);
  const darkGrey = makeBase64(64);
  const black = makeBase64(0);

  const patternA = makePatternBase64(i => i % 256);
  const patternB = makePatternBase64(i => (i * 7 + 100) % 256);
  const patternA_reversed = makePatternBase64(i => (1023 - i) % 256);

  const testPairs = [
    { name: "White vs Grey", img1: white, img2: grey, expected: false },
    { name: "White vs Dark Grey", img1: white, img2: darkGrey, expected: false },
    { name: "Grey vs Dark Grey", img1: grey, img2: darkGrey, expected: false },
    { name: "White vs Black", img1: white, img2: black, expected: false },
    { name: "Pattern A vs Pattern B", img1: patternA, img2: patternB, expected: false },
    { name: "Pattern A vs Reversed Pattern A", img1: patternA, img2: patternA_reversed, expected: false },
  ];

  console.log("--- Testing Synthetic Image Pattern Pairs ---\n");

  for (const pair of testPairs) {
    const res = await processBiometricMatch(pair.img1, pair.img2);
    const score = res.result.score;
    const match = res.result.match;
    const pass = match === pair.expected;
    const statusStr = pass ? "✅ PASS" : "❌ FALSE POSITIVE MATCH";
    console.log(`${statusStr} | ${pair.name.padEnd(35)} | Score: ${score.toFixed(1).padStart(5)} | Match: ${match} (Expected: ${pair.expected})`);
  }

  console.log("\n=========================================================================");
}

investigateBiometricVulnerabilities();
