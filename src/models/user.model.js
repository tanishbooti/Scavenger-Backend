import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

const financeEntrySchema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  category: { type: String, enum: ['income', 'expense'], required: true },
  tags: { type: [String], default: [] },
});

const scamUpdateSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  description: { type: String, trim: true },
  date: { type: Date, default: Date.now },
  type: { type: String },
});

const allowedSourceTypes = ['text', 'image', 'url', 'phone'];

const scamDetectionResultSchema = new mongoose.Schema({
  content: { type: String, required: true },
  result: { type: String, enum: ['scam', 'safe'], required: true },
  explanation: { type: String },
  sourceType: { type: String, enum: allowedSourceTypes, required: true },
  date: { type: Date, default: Date.now },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 8 },
  financeEntries: [financeEntrySchema],
  age: { type: Number, min: 18, max: 120 },
  profilePicture: { type: String, default: 'default-profile-picture.png' },
  occupation: { type: String, trim: true },
  scamUpdates: [{ type: mongoose.Schema.Types.ObjectId, ref: 'ScamUpdate' }],
  scamDetectionHistory: [scamDetectionResultSchema],
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[1-9]\d{1,14}$/, 'Please enter a valid phone number'],
  },
  refreshToken: { type: String, default: null },
});

userSchema.pre('save', async function (next) {
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.isPasswordCorrect = async function (password) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  return jwt.sign(
    { _id: this._id, email: this.email },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '1h' }
  );
};

userSchema.methods.generateRefreshToken = function () {
  return jwt.sign(
    { _id: this._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );
};

const scamWatchlistSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  value: { type: String, required: true },
  type: { type: String, enum: ['phone', 'email', 'url'], required: true },
  dateAdded: { type: Date, default: Date.now },
});

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export const ScamUpdate = mongoose.models.ScamUpdate || mongoose.model('ScamUpdate', scamUpdateSchema);
export const ScamWatchlist = mongoose.models.ScamWatchlist || mongoose.model('ScamWatchlist', scamWatchlistSchema);
