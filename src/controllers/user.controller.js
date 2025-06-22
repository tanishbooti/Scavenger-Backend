import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';

export const registerUser = asyncHandler(async (req, res) => {
  const { name, email, age, password, occupation, phoneNumber } = req.body;
  if (!name || !email || !password || !age || !occupation || !phoneNumber) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  const existingUser = await User.findOne({ $or: [{ email }, { phoneNumber }] });
  if (existingUser) return res.status(400).json({ error: 'User already exists' });

  const newUser = new User({ name, email, age, password, occupation, phoneNumber });
  await newUser.save();
  res.status(201).json({ message: 'User registered successfully' });
});

export const loginUser = asyncHandler(async (req, res) => {
  const { phoneNumber, email, password } = req.body;
  console.log('Login attempt:', { phoneNumber, email, password });
  if (!phoneNumber && !email) return res.status(400).json({ error: 'Phone or email required' });
  if (!password) return res.status(400).json({ error: 'Password is required' });

  const query = phoneNumber ? { phoneNumber } : { email };
  const user = await User.findOne(query);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const isMatch = await user.isPasswordCorrect(password);
  if (!isMatch) return res.status(401).json({ error: 'Invalid credentials' });

  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();
  user.refreshToken = refreshToken;
  await user.save();

  res.status(200).json({ message: 'Login successful', userId: user._id, accessToken, refreshToken });
});

export const getUserProfile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('-password');
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.status(200).json(user);
});

export const updateUserProfile = asyncHandler(async (req, res) => {
  const updates = req.body;
  if (updates.password) delete updates.password;

  const updatedUser = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true, runValidators: true }).select('-password');
  if (!updatedUser) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ message: 'Profile updated successfully', updatedUser });
});

export const deleteUserProfile = asyncHandler(async (req, res) => {
  const deletedUser = await User.findByIdAndDelete(req.user._id);
  if (!deletedUser) return res.status(404).json({ error: 'User not found' });
  res.status(200).json({ message: 'Account deleted successfully' });
});

export const logoutUser = asyncHandler(async (req, res) => {
  res.status(200).json({ message: 'Logged out successfully — clear tokens on client' });
});
