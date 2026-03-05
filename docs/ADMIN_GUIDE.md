# INDIA X E-SPORT: Admin Management Guide

This guide explains how to manage your esports platform using the built-in Admin tools.

## 1. Database Access (Firestore)
The primary collection for player data is **`users`**. 
- **Collection ID**: `users`
- **Manual Admin Promotion**: Find your User UID in the Firebase Console under the `users` collection. Set the `role` field to `admin` to gain access to the Command Center.

## 2. Accessing the Command Center
Navigate to `/admin` in your browser. This area is protected and is where you perform all high-level actions.

## 3. Tournament Lifecycle
### A. Deployment
- Go to the **BATTLES** tab.
- Click **NEW BATTLE** to create a match.
- Set entry fees, prize pools, and map details. Once deployed, it appears instantly on the Home screen.

### B. Going Live (Room Distribution)
- When a match is about to start, click **Go Live** on the tournament card.
- Enter the **Room ID** and **Password**.
- This automatically sends an in-app notification to all participants and reveals the credentials in their "Match Details" view.

### C. Finalizing Results & Prizes
- After the match ends, click **Enter Results**.
- Input the **Kills** and **Placement** for each player.
- Click **Finalize & Distribute**. The system will:
  1. Calculate scores based on your point formula.
  2. Update Global Leaderboards.
  3. Automatically credit the prize money to the winners' wallets.

## 4. Financial Management
### A. Payouts (Withdrawals)
- Go to the **PAYOUTS** tab.
- You will see requests from players wanting to withdraw their winnings.
- Click **Approve & Deduct** after you have manually sent them the money (via UPI/Bank).

### B. Deposits
- Players deposit via Razorpay on their **Wallet** page.
- Successful payments are automatically verified and credited to their balance without your intervention.

## 5. Player Verification
- Players must link their **Battle ID** (Free Fire UID) in their **Profile** before they can join any match.
- This ensures you have their correct game identity for result verification.

## 6. System Auditing
- Every action (creating matches, approving payouts, distribution) is logged in the **AUDIT** tab for your security.
