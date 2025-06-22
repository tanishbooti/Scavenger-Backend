import { v2 as cloudinary } from 'cloudinary';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (filePath) => {
  try {
    if (!filePath) {
      return null;
    }

    const response = await cloudinary.uploader.upload(filePath, {
      resource_type: 'auto',
      folder: 'profilepic',
    });

    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('Local file deleted after upload:', filePath);
      }
    });

    console.log('Uploaded to Cloudinary:', response.secure_url);
    return response;
  } catch (error) {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
      } else {
        console.log('File deleted successfully (after error):', filePath);
      }
    });
    console.error('Error uploading to Cloudinary:', error);
    throw new Error('Cloudinary upload failed');
  }
};

export { uploadOnCloudinary };
