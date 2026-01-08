# Candle App - Setup Guide

## Environment Variables

Add these to your `/backend/.env` file:

### Firebase (Required)
```
# Option 1: Path to credentials file
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Option 2: JSON string (for cloud deployments)
# FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}

# Firebase Realtime Database URL (Required for real-time sync)
# Get from: Firebase Console > Realtime Database > Copy the URL
FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
```

### Google Gemini AI (Required for AI features)
```
# Get from: https://aistudio.google.com/
GEMINI_API_KEY=your-gemini-api-key
```

### JWT Configuration
```
# Change this to a secure random string in production!
JWT_SECRET=your-secure-secret-key-here
```

### CORS Origins
```
CORS_ORIGINS=*
```

### Cloudinary (Required for image uploads)
```
# Get from: https://console.cloudinary.com/settings/api-keys
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

## Frontend Environment Variables

Add to `/frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001

# Firebase Config for Real-time Features
# Get these from Firebase Console > Project Settings > General > Your apps > Web app
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_DATABASE_URL=https://your-project-id.firebaseio.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

## Setting up Firebase Realtime Database

1. Go to Firebase Console: https://console.firebase.google.com
2. Select your project (tania-94a37)
3. In the left menu, click "Realtime Database"
4. Click "Create Database" if not already created
5. Choose your location and security rules (start in test mode for development)
6. Copy the database URL (e.g., `https://tania-94a37.firebaseio.com`)
7. Add to both backend and frontend .env files

### Security Rules for Realtime Database
Set these rules in Firebase Console > Realtime Database > Rules:
```json
{
  "rules": {
    "pairs": {
      "$pairKey": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    },
    "users": {
      "$userId": {
        ".read": "auth != null",
        ".write": "auth != null"
      }
    }
  }
}
```

## Firestore Composite Indexes

This app requires composite indexes for queries. See `FIRESTORE_INDEXES_SETUP.md` for details.

Quick method: When you get a "query requires an index" error, click the link in the error message to create the index.

## Running the App

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install
yarn start
```
