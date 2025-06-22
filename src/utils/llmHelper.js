import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export const checkScamWithLLM = async (text) => {
  const apiKey = process.env.GEMINI_API_KEY;

  const prompt = `This is a financial message: "${text}". 
Is this message potentially a financial scam? 
Reply strictly in JSON format like: 
{"result":"scam" or "safe","explanation":"long reason", "risk score": "out of 10"}.
No code block, no markdown — only pure JSON.`;

  const response = await axios.post(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      contents: [{ parts: [{ text: prompt }] }]
    },
    { headers: { 'Content-Type': 'application/json' } }
  );

  let content = response.data.candidates[0].content.parts[0].text;

  // 🧽 Remove any accidental backticks or code block wrappers
  content = content.replace(/```(json)?|```/g, '').trim();

  return JSON.parse(content);
};
