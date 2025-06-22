import Tesseract from 'tesseract.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkScamWithLLM } from '../utils/llmHelper.js';
import { User, ScamUpdate, ScamWatchlist } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';



// 📌 Check plain text
export const checkScamText = asyncHandler(async (req, res) => {
  const { text } = req.body;
  console.log('Received text for scam check:', text);
  if (!text) return res.status(400).json({ error: 'Text is required' });
  const scamResult = await checkScamWithLLM(text);
  const user = await User.findById(req.user._id);
  user.scamDetectionHistory.push({
    content: text,
    result: scamResult.result,
    explanation: scamResult.explanation,
    sourceType: 'text',
  });
  await user.save();
  res.status(200).json({ scamResult });
});

export const checkScamImage = asyncHandler(async (req, res) => {
  const file = req.file;
  console.log('Received image file for scam check:', file);
  if (!file) return res.status(400).json({ error: 'Image required' });
  const upload = await uploadOnCloudinary(file.path);
  const { data: { text } } = await Tesseract.recognize(upload.secure_url, 'eng');
  const scamResult = await checkScamWithLLM(text);
  const user = await User.findById(req.user._id);
  user.scamDetectionHistory.push({
    content: text,
    result: scamResult.result,
    explanation: scamResult.explanation,
    sourceType: 'image',
  });
  await user.save();
  res.status(200).json({ scamResult, extractedText: text });
});

export const getScamDetectionHistory = asyncHandler(async (req, res) => {
  
  const user = await User.findById(req.user._id).select('scamDetectionHistory');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ history: user.scamDetectionHistory });
});

// ✅ Scam Updates (admin/public)
export const addScamUpdate = asyncHandler(async (req, res) => {
  const { title, description, type } = req.body;
  if (!title || !description || !type) return res.status(400).json({ error: 'Fields missing' });
  const update = await ScamUpdate.create({ title, description, type });
  res.status(201).json({ message: 'Scam update added', update });
});

export const getAllScamUpdates = asyncHandler(async (req, res) => {
  const updates = await ScamUpdate.find().sort({ date: -1 });
  res.status(200).json({ updates });
});

export const deleteScamUpdate = asyncHandler(async (req, res) => {
  await ScamUpdate.findByIdAndDelete(req.params.id);
  res.status(200).json({ message: 'Scam update deleted' });
});

// ✅ Scam Analytics
export const getUserScamAnalytics = asyncHandler(async (req, res) => {
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const recentScams = await User.findById(req.user._id).select('scamDetectionHistory');
  const totalScams = recentScams.scamDetectionHistory.filter(s => new Date(s.date) >= last30).length;
  const typeCount = { text: 0, image: 0 };
  recentScams.scamDetectionHistory.forEach(s => { typeCount[s.sourceType]++ });
  const safetyScore = Math.max(100 - totalScams * 5, 0);
  res.status(200).json({ totalScams, typeCount, safetyScore });
});

// ✅ Watchlist Management
export const addToWatchlist = asyncHandler(async (req, res) => {
  const { value, type } = req.body;
  if (!value || !type) return res.status(400).json({ error: 'Value and type required' });
  const entry = await ScamWatchlist.create({ user: req.user._id, value, type });
  res.status(201).json({ message: 'Added to watchlist', entry });
});

export const getWatchlist = asyncHandler(async (req, res) => {
  const list = await ScamWatchlist.find({ user: req.user._id });
  res.status(200).json({ watchlist: list });
});



// 📌 Check URL Scam
export const checkScamUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  // LLM check (or regex/basic checks first)
  const scamResult = await checkScamWithLLM(`Is this URL a scam: ${url}`);

  const user = await User.findById(req.user._id);
  user.scamDetectionHistory.push({
    content: url,
    result: scamResult.result,
    explanation: scamResult.explanation,
    sourceType: 'url',
  });
  await user.save();

  res.status(200).json({ scamResult });
});


export const checkPhoneNumberReputation = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;

  if (!phoneNumber) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Check in your watchlist DB
  const found = await ScamWatchlist.findOne({ value: phoneNumber, type: 'phone' });

  if (found) {
    return res.status(200).json({
      result: 'scam',
      reason: 'Reported by users',
      dateAdded: found.dateAdded,
    });
  }

  // Optional LLM analysis
  const scamResult = await checkScamWithLLM(`Is this phone number a scam: ${phoneNumber}?`);

  res.status(200).json({
    result: scamResult.result,
    explanation: scamResult.explanation,
  });
});



export const reportScamEntry = asyncHandler(async (req, res) => {
  const { value, type } = req.body;

  if (!value || !type || !['phone', 'email', 'url'].includes(type)) {
    return res.status(400).json({ error: 'Value and valid type (phone/email/url) are required' });
  }

  // Check if already exists
  const existing = await ScamWatchlist.findOne({ value, type });
  if (existing) {
    return res.status(400).json({ error: 'This entry is already reported.' });
  }

  const newEntry = await ScamWatchlist.create({
    user: req.user._id,
    value,
    type,
  });

  res.status(201).json({ message: 'Reported successfully', entry: newEntry });
});


export const getUserWatchlist = asyncHandler(async (req, res) => {
  const watchlist = await ScamWatchlist.find({ user: req.user._id }).sort({ dateAdded: -1 });
  res.status(200).json({ watchlist });
});


export const deleteWatchlistEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const deleted = await ScamWatchlist.findOneAndDelete({
    _id: id,
    user: req.user._id,
  });

  if (!deleted) {
    return res.status(404).json({ error: 'Entry not found or unauthorized' });
  }

  res.status(200).json({ message: 'Entry removed successfully' });
});
