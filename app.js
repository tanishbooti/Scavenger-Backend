import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app = express();



app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
}));

app.use(express.json({limit: '50mb'}));
app.use(cookieParser());
app.use(express.urlencoded({extended: true, limit: '50mb'}));
app.use(express.static('public'));



//routes import
import userRouter from './src/routes/user.routes.js';




//routes declaration
app.use('/api/users', userRouter);
export {app};