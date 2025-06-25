import Tesseract from 'tesseract.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { checkScamWithLLM } from '../utils/llmHelper.js';
import { User, ScamUpdate, ScamWatchlist } from '../models/user.model.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';
import axios from 'axios';




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






const GOOGLE_SAFE_BROWSING_API_KEY = process.env.GOOGLE_SAFE_BROWSING_API_KEY;

export const checkScamUrl = asyncHandler(async (req, res) => {
  const { url } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  /
  const response = await axios.post(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${GOOGLE_SAFE_BROWSING_API_KEY}`,
    {
      client: {
        clientId: "yourappname",
        clientVersion: "1.0.0"
      },
      threatInfo: {
        threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
        platformTypes: ["ANY_PLATFORM"],
        threatEntryTypes: ["URL"],
        threatEntries: [{ url }]
      }
    }
  );

  const isScam = response.data && response.data.matches && response.data.matches.length > 0;

  const user = await User.findById(req.user._id);
  user.scamDetectionHistory.push({
    content: url,
    result: isScam ? 'scam' : 'safe',
    explanation: isScam ? 'URL flagged by Google Safe Browsing' : 'URL not flagged',
    sourceType: 'url'
  });
  await user.save();

  res.status(200).json({
    result: isScam ? 'scam' : 'safe',
    explanation: isScam ? 'URL flagged by Google Safe Browsing' : 'URL not flagged'
  });
});



const IPQS_API_KEY = process.env.IPQS_API_KEY;

export const checkPhoneNumberReputation = asyncHandler(async (req, res) => {
  const { phoneNumber } = req.body;
  if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required' });

  const found = await ScamWatchlist.findOne({ value: phoneNumber, type: 'phone' });
  if (found) {
    return res.status(200).json({
      result: 'scam',
      reason: 'Reported by users',
      dateAdded: found.dateAdded
    });
  }

  
  const response = await axios.get(`https://ipqualityscore.com/api/json/phone/${IPQS_API_KEY}/${phoneNumber}`);

  const isScam = response.data && response.data.spam_score && response.data.spam_score >= 80;

  res.status(200).json({
    result: isScam ? 'scam' : 'safe',
    explanation: isScam
      ? `High spam score (${response.data.spam_score}) from IPQS`
      : `Low spam score (${response.data.spam_score}) from IPQS`
  });
});



export const reportScamEntry = asyncHandler(async (req, res) => {
  const { value, type } = req.body;

  if (!value || !type || !['phone', 'email', 'url'].includes(type)) {
    return res.status(400).json({ error: 'Value and valid type (phone/email/url) are required' });
  }


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
