# ATS-Match Frontend

This is the frontend for ATS-Match, an AI-powered resume and job description matching tool. Users can upload their resume and a job description to instantly see how well they match based on machine learning predictions.

## Features

- Upload resume files (PDF, DOCX)
- Paste job descriptions into a text field
- Real-time match scoring using the FastAPI backend
- Clean, responsive UI
- Match feedback with confidence score and keyword analysis

## Tech Stack

- HTML
- CSS
- JavaScript (Vanilla)
- Hosted on Vercel

## API Integration

The frontend communicates with the backend API:

POST http://<your-api-url>/api/predict_resume_file

Make sure the backend is deployed and CORS is enabled.

## Running Locally

Clone the repository:

```bash
git clone https://github.com/yourusername/ats-match-frontend.git
```
cd ats-match-frontend
Open index.html in your browser to run it locally.

Deployment
This project is designed for seamless deployment with Vercel. To deploy:

Install the Vercel CLI (if not already):

bash
Copy
Edit
npm install -g vercel
Deploy the project:

bash
Copy
Edit
vercel deploy
Make sure to set the correct API URL in your JavaScript code for production.

Project Structure
css
Copy
Edit
ats-match-frontend/
├── index.html
├── style.css
├── main.js
└── README.md
Contact
Created by [Juliana Holder]
Backend and Machine Learning: https://github.com/julianacholder/ATS-Match-ML-Powered-Resume-Job-Matching-System
