const fs = require('fs');
let code = fs.readFileSync('src/pages/Scanner.tsx', 'utf-8');

if (!code.includes("import { motion } from 'framer-motion';")) {
  code = code.replace(
    "import { User, Package, CheckCircle2, AlertCircle, X, PenTool, Check, ScanFace, MapPin } from 'lucide-react';",
    "import { User, Package, CheckCircle2, AlertCircle, X, PenTool, Check, ScanFace, MapPin } from 'lucide-react';\nimport { motion } from 'framer-motion';"
  );
}

const oldError = `{error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}`;

const newError = `{error && (
        <motion.div 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: [-10, 10, -10, 10, 0] }}
          transition={{ duration: 0.4 }}
          className="bg-red-600 border-2 border-red-500 text-white p-4 rounded-md flex items-start gap-3 shadow-lg shadow-red-500/20"
        >
          <AlertCircle className="w-6 h-6 shrink-0" />
          <p className="text-sm font-bold tracking-wide">{error}</p>
        </motion.div>
      )}`;

code = code.replace(oldError, newError);
fs.writeFileSync('src/pages/Scanner.tsx', code);
