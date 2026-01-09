# Testing & Smoke Checks — Candle Backend

Use these quick checks to verify the backend and realtime integration locally. Replace `localhost:8001` if running on a different host/port and set `TOKEN` to a valid JWT (obtain via `/api/auth/login`).

Prerequisites

- Backend running: `uvicorn server:app --host 0.0.0.0 --port 8001 --reload`
- Frontend running for UI checks (optional)
- `FIREBASE_DATABASE_URL` set and Realtime Database configured for your project
- Optional: Cloudinary env vars configured to test `/api/upload/photo`

Common variables (PowerShell example):

```powershell
$API=http://localhost:8001/api
$TOKEN=<paste_jwt_here>
$HEAD="Authorization: Bearer $TOKEN"
```

1. Get my profile (verify auth):

```bash
curl -H "Authorization: Bearer $TOKEN" $API/auth/me
```

2. Send a love note

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"message":"Hello from test","emoji":"💌"}' $API/notes
```

- Check other paired user (or refresh `/notes`) to confirm it appears.

3. Get unread count

```bash
curl -H "Authorization: Bearer $TOKEN" $API/notes/unread-count
```

4. Create a coupon

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title":"Test Treat","description":"Test","emoji":"🎟️"}' $API/coupons
```

5. List coupons

```bash
curl -H "Authorization: Bearer $TOKEN" $API/coupons
```

6. Redeem a coupon

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" $API/coupons/<coupon_id>/redeem
```

7. Add bucket list item

```bash
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"title":"Visit Test City","category":"travel"}' $API/bucket-list
```

8. Toggle bucket list item complete

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" $API/bucket-list/<item_id>/complete
```

9. Spin date wheel

```bash
curl -H "Authorization: Bearer $TOKEN" "$API/date-spinner/spin"
# or with category
curl -H "Authorization: Bearer $TOKEN" "$API/date-spinner/spin?category=movies"
```

10. Upload a photo to Cloudinary (if configured)

```bash
curl -X POST -H "Authorization: Bearer $TOKEN" -F "file=@/path/to/photo.jpg" $API/upload/photo
```

Notes

- If RTDB is configured, server will attempt to write to Realtime Database for real-time updates. Check your Firebase Console RTDB viewer under `pairs/{pairKey}/...` and `users/{userId}/notes`.
- If you see "query requires an index" errors when calling Firestore queries, deploy `firestore.indexes.json` using the Firebase CLI (see `SETUP.md`).

If you want, I can run through these steps locally (start the backend and exercise these) or add a small Postman collection file. Let me know which you prefer.
