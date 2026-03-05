# INDIA X E-SPORT | Ultimate Arena

This is a high-performance NextJS application built for elite Free Fire tournament management.

## Getting Started

1. **Authentication**: The app uses Firebase Auth (Phone/Anonymous).
2. **Admin Access**: To access the Command Center at `/admin`, ensure your user document in the `users` collection has `role: "admin"`.
3. **Payments**: Integrated with Razorpay for secure deposits and withdrawals.

## Documentation

- [Admin Management Guide](docs/ADMIN_GUIDE.md) - Learn how to run tournaments and manage warriors.
- [Firebase Setup Guide](docs/FIREBASE_SETUP.md) - How to configure certificate fingerprints for Auth.
- [Backend Schema](docs/backend.json) - Detailed data structures for the platform.

## Key Features

- **Automated Slot Filling**: Real-time participant tracking and registration locking.
- **Secure Room Dispatch**: Automatic credential distribution to registered players.
- **Leaderboard Engine**: Automated point calculation based on kills and placement.
- **Audit Logging**: Comprehensive tracking of all administrative actions.
