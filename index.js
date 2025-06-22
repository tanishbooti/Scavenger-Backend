import dotenv from 'dotenv';
dotenv.config(); // ✅ Load env variables early — before any other imports

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './src/db/index.js';

// routes
import userRouter from './src/routes/user.routes.js';
import authRouter from './src/routes/auth.routes.js';
import scamRouter from './src/routes/scam.routes.js';

const app = express();

// Connect DB
connectDB()
  .then(() => {
    app.listen(process.env.PORT, () => {
      console.log(`✅ Server is running on port ${process.env.PORT}`);
    });
    console.log('✅ Database connected successfully');
  })
  .catch((error) => {
    console.error('❌ Database connection failed:', error);
  });

// Middlewares
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(cookieParser());
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static('public'));

// Routes
app.use('/api/users', userRouter);
app.use('/api/auth', authRouter);
app.use('/api/scam', scamRouter);

export { app };
