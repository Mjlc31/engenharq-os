import express from 'express';
import { biometricsMatch } from '../controllers/biometrics';

const router = express.Router();

// General JSON parsing for normal routes (but omit for biometrics match)
router.use((req, res, next) => {
  if (req.path === '/biometrics/match') {
    return next();
  }
  express.json({ limit: '2mb' })(req, res, next);
});

router.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Increase limit ONLY for the biometrics route that needs base64
router.post('/biometrics/match', express.json({ limit: '50mb' }), biometricsMatch);

export default router;
