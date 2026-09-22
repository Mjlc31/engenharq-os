const fs = require('fs');
let code = fs.readFileSync('src/pages/Operations.tsx', 'utf8');

code = code.replace(/const processReplacement = async \(signatureDataUrl: string, photoFile\?: File\) => \{/g, 'const processReplacement = async (signatureDataUrl: string, photoFile?: File) => {\nconst photoUrl = await uploadPhoto(photoFile);');

fs.writeFileSync('src/pages/Operations.tsx', code);
