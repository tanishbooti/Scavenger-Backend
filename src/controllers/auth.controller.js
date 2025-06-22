import jwt from 'jsonwebtoken';
import { asyncHandler } from '../utils/asyncHandler.js';
import { User } from '../models/user.model.js';

export const refreshAccessToken = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(400).json({ error: 'Refresh token is required' });

  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  const user = await User.findById(decoded._id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (user.refreshToken !== refreshToken) return res.status(403).json({ error: 'Invalid refresh token' });

  const newAccessToken = user.generateAccessToken();
  const newRefreshToken = user.generateRefreshToken();
  user.refreshToken = newRefreshToken;
  await user.save();

  res.status(200).json({ accessToken: newAccessToken, refreshToken: newRefreshToken });
});