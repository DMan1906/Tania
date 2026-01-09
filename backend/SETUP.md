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

Recommended (reproducible) method: deploy the provided `firestore.indexes.json` using the Firebase CLI.

1. Install the Firebase CLI (if you don't have it):

```bash
npm install -g firebase-tools
```

2. Login and select the project you use for this app:

```bash
firebase login
firebase projects:list   # verify your project id, e.g. tania-94a37
firebase use --add <your-project-id>
```

3. From the `/backend` folder initialize or confirm Firestore settings (if you haven't already):

```bash
cd backend
firebase init firestore
# When prompted, choose: Use an existing project -> <your-project-id>
# When prompted about rules/indexes files, you may accept the existing firestore.indexes.json
```

4. Deploy only the indexes (this reads `firestore.indexes.json`):

```bash
firebase deploy --only firestore:indexes
```

Notes:

- Index build can take a few minutes. Check Firebase Console > Firestore > Indexes for status.
- If you still get an index error in logs, click the error link in the console — it will open the exact index configuration required.

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

## Cloudinary (Image Uploads)

This project uses Cloudinary for image storage. Below are quick setup steps and an example upload snippet you can run from the backend.

1. Create a Cloudinary account: https://cloudinary.com/ and note your **Cloud name**, **API Key**, and **API Secret** (Settings → API keys).

2. Add these environment variables to `/backend/.env` (they are listed above but confirm values):

```
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

3. Install the Python Cloudinary SDK (add to `requirements.txt` or install directly):

```bash
pip install cloudinary
# Optionally add `cloudinary>=1.0.0` to backend/requirements.txt and run pip install -r requirements.txt
```

4. Example upload helper (Python) — add this to a helper module in the backend and call it when saving photos:

```python
import os
import cloudinary
import cloudinary.uploader

cloudinary.config(
  cloud_name=os.environ.get('CLOUDINARY_CLOUD_NAME'),
  api_key=os.environ.get('CLOUDINARY_API_KEY'),
  api_secret=os.environ.get('CLOUDINARY_API_SECRET')
)

def upload_image_file(file_path: str, folder: str = 'candle_app') -> str:
  """Upload a local file to Cloudinary and return the secure URL."""
  result = cloudinary.uploader.upload(file_path, folder=folder, use_filename=True, unique_filename=False)
  return result.get('secure_url')
```

5. Example: accepting an upload from the frontend (Flask/FastAPI style):

```python
from fastapi import File, UploadFile

@api_router.post('/upload/photo')
async def upload_photo(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
  # Save temporarily and upload to Cloudinary
  tmp_path = f"/tmp/{file.filename}"
  with open(tmp_path, 'wb') as f:
    f.write(await file.read())

  url = upload_image_file(tmp_path, folder=f"candle/{current_user['id']}")
  # Clean up tmp file as needed
  return {"url": url}
```

Security notes:

- Make sure only authenticated users can call any upload endpoints.
- For production scale, prefer signed uploads or direct uploads from the client to Cloudinary with an upload preset and limited, signed parameters.

If you want, I can also add `cloudinary` to `backend/requirements.txt` and implement a simple `/upload/photo` endpoint now.
