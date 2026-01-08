# Candle App - Setup Guide

This guide walks you through setting up the Candle couples connection app with your own **Google Firebase** (Firestore) and **Google Gemini API**.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Firebase Setup](#firebase-setup)
3. [Gemini API Setup](#gemini-api-setup)
4. [Backend Configuration](#backend-configuration)
5. [Frontend Configuration](#frontend-configuration)
6. [Running the Application](#running-the-application)
7. [Firestore Database Structure](#firestore-database-structure)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.11+
- Google account
- Git (optional)

---

## Firebase Setup

### Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter a project name (e.g., "candle-app")
4. Choose whether to enable Google Analytics (optional)
5. Click **"Create project"**

### Step 2: Enable Firestore Database

1. In your Firebase project, click **"Build"** → **"Firestore Database"**
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set rules later)
4. Select your preferred region (choose one close to your users)
5. Click **"Enable"**

### Step 3: Set Firestore Security Rules

1. Go to **Firestore Database** → **"Rules"** tab
2. Replace the rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write for authenticated backend only
    // The backend uses Admin SDK which bypasses these rules
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

> **Note:** Since we're using the Firebase Admin SDK (server-side), these rules don't apply. The Admin SDK has full access.

### Step 4: Generate Service Account Credentials

1. Go to **Project Settings** (gear icon) → **"Service accounts"**
2. Click **"Generate new private key"**
3. Click **"Generate key"** to download the JSON file
4. **IMPORTANT:** Keep this file secure! Never commit it to version control.
5. Rename the file to `firebase-credentials.json`

### Step 5: Create Firestore Indexes

The app requires composite indexes for certain queries. Create these indexes:

1. Go to **Firestore Database** → **"Indexes"** tab
2. Click **"Add index"** and create the following:

**Index 1: Questions by pair and date**
- Collection: `questions`
- Fields:
  - `pair_key` (Ascending)
  - `date` (Descending)

**Index 2: Love Notes by recipient**
- Collection: `love_notes`
- Fields:
  - `to_user_id` (Ascending)
  - `created_at` (Descending)

**Index 3: Love Notes by sender**
- Collection: `love_notes`
- Fields:
  - `from_user_id` (Ascending)
  - `created_at` (Descending)

**Index 4: Date Ideas by pair**
- Collection: `date_ideas`
- Fields:
  - `pair_key` (Ascending)
  - `created_at` (Descending)

**Index 5: Memories by pair**
- Collection: `memories`
- Fields:
  - `pair_key` (Ascending)
  - `date` (Descending)

**Index 6: Moods by user**
- Collection: `moods`
- Fields:
  - `user_id` (Ascending)
  - `date` (Descending)

> **Tip:** If you miss an index, Firebase will show an error with a direct link to create it.

---

## Gemini API Setup

### Step 1: Enable Gemini API

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **"Get API key"**
4. Click **"Create API key"**
5. Select your project or create a new one
6. Copy the generated API key

### Step 2: API Key Usage

The Gemini API is used for:
- Generating daily relationship questions
- Creating trivia questions for the game
- Suggesting date ideas

**Free Tier Limits (as of 2025):**
- 60 requests per minute
- 1 million tokens per month

This is plenty for personal use. For production, consider upgrading to a paid plan.

---

## Backend Configuration

### Step 1: Place Firebase Credentials

Copy your `firebase-credentials.json` file to the backend folder:

```bash
cp /path/to/your/firebase-credentials.json /app/backend/firebase-credentials.json
```

### Step 2: Configure Environment Variables

Edit `/app/backend/.env`:

```env
# Firebase Configuration
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
# OR use JSON string (for cloud deployments):
# FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"..."}

# Gemini API
GEMINI_API_KEY=your-gemini-api-key-here

# JWT Secret (change this to a random secure string!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS (adjust for your frontend URL in production)
CORS_ORIGINS=*
```

### Step 3: Install Dependencies

```bash
cd /app/backend
pip install -r requirements.txt
```

Key dependencies:
- `firebase-admin` - Firebase Admin SDK for Firestore
- `google-generativeai` - Google Gemini API client
- `fastapi` - Web framework
- `pyjwt` - JWT authentication
- `passlib` - Password hashing

---

## Frontend Configuration

### Step 1: Configure Environment Variables

Edit `/app/frontend/.env`:

```env
# Backend API URL (change for production)
REACT_APP_BACKEND_URL=http://localhost:8001
```

For production, use your deployed backend URL:
```env
REACT_APP_BACKEND_URL=https://your-api-domain.com
```

### Step 2: Install Dependencies

```bash
cd /app/frontend
yarn install
```

---

## Running the Application

### Development Mode

**Terminal 1 - Backend:**
```bash
cd /app/backend
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd /app/frontend
yarn start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8001/api

### Production Deployment

For production, consider:
- **Backend:** Deploy to Google Cloud Run, AWS Lambda, or any Python hosting
- **Frontend:** Deploy to Vercel, Netlify, or Firebase Hosting

---

## Firestore Database Structure

The app uses these Firestore collections:

```
firestore/
├── users/
│   └── {user_id}/
│       ├── email: string
│       ├── name: string
│       ├── password: string (hashed)
│       ├── partner_id: string | null
│       ├── partner_name: string | null
│       └── created_at: string (ISO date)
│
├── pairing_codes/
│   └── {code}/
│       ├── user_id: string
│       ├── user_name: string
│       ├── expires_at: string
│       └── created_at: string
│
├── questions/
│   └── {question_id}/
│       ├── text: string
│       ├── category: string
│       ├── date: string (YYYY-MM-DD)
│       ├── pair_key: string
│       ├── answers: { [user_id]: { text, answered_at } }
│       ├── reactions: { [user_id]: string }
│       └── created_at: string
│
├── streaks/
│   └── {user_id}/
│       ├── current_streak: number
│       ├── longest_streak: number
│       ├── last_answered_date: string | null
│       └── milestones_reached: array
│
├── trivia/
│   └── {trivia_id}/
│       ├── question: string
│       ├── options: array
│       ├── category: string
│       ├── about_user_id: string
│       ├── about_user_name: string
│       ├── correct_answer: string | null
│       ├── guesses: { [user_id]: {...} }
│       ├── pair_key: string
│       └── created_at: string
│
├── trivia_scores/
│   └── {user_id}_{pair_key}/
│       ├── score: number
│       ├── total_questions: number
│       └── correct: number
│
├── love_notes/
│   └── {note_id}/
│       ├── from_user_id: string
│       ├── from_user_name: string
│       ├── to_user_id: string
│       ├── message: string
│       ├── emoji: string | null
│       ├── is_read: boolean
│       └── created_at: string
│
├── date_ideas/
│   └── {idea_id}/
│       ├── title: string
│       ├── description: string
│       ├── budget: string
│       ├── mood: string
│       ├── location_type: string
│       ├── tips: array
│       ├── is_favorite: boolean
│       ├── is_completed: boolean
│       ├── pair_key: string
│       └── created_at: string
│
├── memories/
│   └── {memory_id}/
│       ├── title: string
│       ├── description: string | null
│       ├── date: string
│       ├── photo_url: string | null
│       ├── created_by: string
│       ├── created_by_name: string
│       ├── pair_key: string
│       └── created_at: string
│
└── moods/
    └── {user_id}_{date}/
        ├── user_id: string
        ├── user_name: string
        ├── mood: string
        ├── note: string | null
        ├── date: string
        └── created_at: string
```

---

## Troubleshooting

### Firebase Errors

**"Could not load the default credentials"**
- Ensure `firebase-credentials.json` exists in `/app/backend/`
- Check `FIREBASE_CREDENTIALS_PATH` in `.env`

**"Missing or insufficient permissions"**
- You're using client SDK instead of Admin SDK
- The Admin SDK should bypass Firestore rules

**"The query requires an index"**
- Click the link in the error to create the index automatically
- Or manually create it in Firebase Console

### Gemini API Errors

**"API key not valid"**
- Verify your API key in Google AI Studio
- Ensure the API is enabled for your project

**"Quota exceeded"**
- You've hit the free tier limit
- Wait for quota reset or upgrade plan

**Questions not generating**
- Check `GEMINI_API_KEY` in `.env`
- The app will use fallback questions if API fails

### General Issues

**CORS errors**
- Ensure `CORS_ORIGINS` includes your frontend URL
- For development, `*` allows all origins

**JWT token invalid**
- Clear browser localStorage
- Check `JWT_SECRET` matches in `.env`

**Backend not starting**
- Check all dependencies are installed
- View logs: `tail -f /var/log/supervisor/backend.err.log`

---

## Environment Variables Summary

### Backend (`/app/backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `FIREBASE_CREDENTIALS_PATH` | Yes* | Path to Firebase credentials JSON |
| `FIREBASE_CREDENTIALS_JSON` | Yes* | JSON string of Firebase credentials |
| `GEMINI_API_KEY` | Yes | Google Gemini API key |
| `JWT_SECRET` | Yes | Secret key for JWT tokens |
| `CORS_ORIGINS` | No | Allowed CORS origins (default: *) |

*One of `FIREBASE_CREDENTIALS_PATH` or `FIREBASE_CREDENTIALS_JSON` is required.

### Frontend (`/app/frontend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `REACT_APP_BACKEND_URL` | Yes | URL of the backend API |

---

## Security Best Practices

1. **Never commit credentials** - Add `firebase-credentials.json` to `.gitignore`
2. **Use strong JWT secret** - Generate a random 32+ character string
3. **Enable HTTPS** - Use TLS in production
4. **Rotate API keys** - Periodically regenerate Gemini API key
5. **Monitor usage** - Check Firebase and Gemini usage dashboards

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase/Gemini documentation
3. Check application logs for detailed errors

Happy connecting! 💕
