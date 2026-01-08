# Candle App - Setup Guide

## Environment Variables

Add these to your `/backend/.env` file:

### Firebase (Required)
```
# Option 1: Path to credentials file
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json

# Option 2: JSON string (for cloud deployments)
# FIREBASE_CREDENTIALS_JSON={"type":"service_account","project_id":"your-project-id",...}
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

## Firestore Composite Indexes

This app requires composite indexes for queries. See `FIRESTORE_INDEXES_SETUP.md` for details.

Quick method: When you get a "query requires an index" error, click the link in the error message to create the index.

## Frontend Environment Variables

Add to `/frontend/.env`:
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

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
