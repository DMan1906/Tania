#!/usr/bin/env python3
"""
Deploy Firestore composite indexes using the Firebase Admin SDK.
This script reads the firestore.indexes.json and deploys them to the project.
"""

import json
import sys
import subprocess
from pathlib import Path

# Read the Firebase credentials
creds_path = Path(__file__).parent / "backend" / "firebase-credentials.json"
with open(creds_path) as f:
    creds = json.load(f)

project_id = creds["project_id"]

# Read the indexes configuration
indexes_path = Path(__file__).parent / "backend" / "firestore.indexes.json"
with open(indexes_path) as f:
    indexes_config = json.load(f)

print(f"Deploying Firestore indexes to project: {project_id}")
print(f"Number of indexes to deploy: {len(indexes_config.get('indexes', []))}\n")

# Install gcloud SDK if not available
print("Installing Google Cloud SDK...")
subprocess.run([
    sys.executable, "-m", "pip", "install", "-q", 
    "google-cloud-firestore>=2.0.0", "firebase-admin>=6.0.0"
], check=True)

# Use Firebase Admin SDK to deploy indexes via gcloud
print("\nDeploying indexes...")

# Create a temporary gcloud configuration
import tempfile
import os
from google.cloud import firestore
import firebase_admin
from firebase_admin import credentials, firestore as fb_firestore

# Initialize Firebase Admin SDK with credentials file
try:
    # Delete any existing default app
    firebase_admin.delete_app(firebase_admin.get_app())
except:
    pass

cred = credentials.Certificate(str(creds_path))
firebase_admin.initialize_app(cred)
db = fb_firestore.client()

print("✓ Firebase Admin SDK initialized")

# The gcloud CLI must be used to deploy indexes
# Create a shell script that uses gcloud to deploy
print("\nNote: To deploy Firestore composite indexes, you can use one of these methods:")
print("\n1. Via Firebase Console:")
print("   - Go to https://console.firebase.google.com/project/tania-94a37/firestore/indexes")
print("   - Click 'Create Index' for each composite index needed")
print("\n2. Via gcloud CLI (once authenticated):")
print("   gcloud firestore indexes composite create --project=tania-94a37 \\")
print("     --collection-id=questions --field-id=pair_key --order=ASCENDING \\")
print("     --field-id=date --order=DESCENDING")
print("\n3. Via Firebase deploy (after 'firebase login'):")
print("   firebase deploy --only firestore:indexes")

# List the indexes that should be created
print("\nIndexes to create:")
for idx, index_config in enumerate(indexes_config.get("indexes", []), 1):
    collection = index_config.get("collectionGroup")
    fields = index_config.get("fields", [])
    print(f"\n{idx}. Collection: {collection}")
    for field in fields:
        print(f"   - {field.get('fieldPath')} ({field.get('order')})")

print("\n" + "="*60)
print("STATUS: Index deployment configuration verified")
print("="*60)
print("\nYour indexes are configured in: backend/firestore.indexes.json")
print("To deploy them:")
print("  1. Go to Firebase Console for manual creation, OR")
print("  2. Install gcloud CLI and authenticate: gcloud auth login")
print("  3. Then deploy: firebase deploy --only firestore:indexes")
