import express from 'express';
import {
  checkScamText,
  checkScamImage,
  getScamDetectionHistory,
  addScamUpdate,
  getAllScamUpdates,
  deleteScamUpdate,
  getUserScamAnalytics,
  addToWatchlist,
  getUserWatchlist,
  deleteWatchlistEntry,
  checkScamUrl,
  checkPhoneNumberReputation,
  reportScamEntry,
} from '../controllers/scam.controller.js';

import { verifyToken } from '../middlewares/authMiddleware.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

// Detection endpoints
router.post('/check-text', verifyToken, checkScamText);
router.post('/check-image', verifyToken, upload.single('image'), checkScamImage);
router.post('/check-url', verifyToken, checkScamUrl);
router.post('/check-phone', verifyToken, checkPhoneNumberReputation);
router.get('/history', verifyToken, getScamDetectionHistory);
router.get('/analytics', verifyToken, getUserScamAnalytics);

// Scam notices (public)
router.post('/update', addScamUpdate);
router.get('/updates', getAllScamUpdates);
router.delete('/update/:id', deleteScamUpdate);

// Watchlist endpoints
router.post('/watchlist', verifyToken, addToWatchlist);
router.get('/watchlist', verifyToken, getUserWatchlist);
router.delete('/watchlist/:id', verifyToken, deleteWatchlistEntry);
router.post('/watchlist/report', verifyToken, reportScamEntry);

export default router;
