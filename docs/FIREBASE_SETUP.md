# Firebase Configuration Guide

This project uses Firebase for Authentication, Firestore, and GenAI (via Genkit). To ensure all features like Phone Authentication work correctly, you need to configure your certificate fingerprints in the Firebase Console.

## 1. Generating SHA Fingerprints

To enable Phone Auth or Google Sign-In, you must add your SHA-1 or SHA-256 fingerprints to your Firebase Project settings.

### For Development (Debug Keystore)

Run the following command in your terminal to get the fingerprints from the default debug keystore:

**On macOS / Linux:**
```bash
keytool -list -v -alias androiddebugkey -keystore ~/.android/debug.keystore
```

**On Windows:**
```bash
keytool -list -v -alias androiddebugkey -keystore %USERPROFILE%\.android\debug.keystore
```

*Note: The default password for the debug keystore is `android`.*

### For Production (Release Keystore)

Use the command you provided with the path to your specific production keystore:
```bash
keytool -keystore <path-to-production-keystore> -list -v
```

## 2. Configuring Firebase Console

1. Go to the [Firebase Console](https://console.firebase.google.com/).
2. Select your project: `studio-7963814679-8df6c`.
3. Click the **Settings (gear icon)** > **Project settings**.
4. In the **General** tab, scroll down to **Your apps**.
5. Select your Android app (if you have created one) and click **Add fingerprint**.
6. Paste the SHA-1 and SHA-256 values generated from the commands above.

## 3. Security Checklist

- **Firestore Rules**: Ensure your `firestore.rules` are deployed.
- **Environment Variables**: Check that `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `GEMINI_API_KEY` are set in your deployment environment.
- **Authentication**: Ensure "Phone" and "Anonymous" providers are enabled in the Firebase Auth console.
