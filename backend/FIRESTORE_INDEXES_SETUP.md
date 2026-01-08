# Firestore Composite Indexes Setup

This app requires composite indexes in Firestore for queries that combine `where()` + `order_by()` on different fields.

## Option 1: Click Error Links (Easiest)

When you get a `FailedPrecondition: 400 The query requires an index` error, just **click the link** provided in the error message. It will take you directly to Firebase Console to create that specific index.

## Option 2: Deploy All Indexes Using Firebase CLI

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize Firebase in this directory (select your project `tania-94a37`):
   ```bash
   firebase init firestore
   ```
   - Select "Use an existing project"
   - Select `tania-94a37`
   - When asked about rules/indexes files, use the existing `firestore.indexes.json`

4. Deploy the indexes:
   ```bash
   firebase deploy --only firestore:indexes
   ```

## Option 3: Create Indexes Manually in Firebase Console

Go to: https://console.firebase.google.com/project/tania-94a37/firestore/indexes

Create these composite indexes:

| Collection   | Field 1 (Ascending) | Field 2 (Descending) |
|--------------|---------------------|----------------------|
| questions    | pair_key            | date                 |
| love_notes   | to_user_id          | created_at           |
| love_notes   | from_user_id        | created_at           |
| date_ideas   | pair_key            | created_at           |
| memories     | pair_key            | date                 |
| moods        | user_id             | date                 |

## Index Build Time

Firestore indexes can take **a few minutes to build**. Check the status in Firebase Console under Firestore > Indexes.

## Troubleshooting

If you still get index errors after deployment, check:
1. The index status in Firebase Console (should be "Enabled")
2. Wait a few minutes for indexes to fully build
3. If the error persists, click the direct link in the error to ensure the exact index is created
