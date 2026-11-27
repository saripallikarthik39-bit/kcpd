\# Person 3 — End-to-End Demo Script \& Android Notification Notes



> Note: All payment events in the browser demo are simulated demo data.



\## End-to-End Demo Script (4 Steps)

1\. \*\*Quick Bill:\*\* Add a fractional/multi-item order (e.g., `250g jeera at ₹400/kg and 3 Maggi`) and settle the bill to confirm total calculation and local stock/receipt handling\[cite: 11, 12].

2\. \*\*Khata Entry:\*\* Log or inspect a customer Khata balance (e.g., `Sharma ji`) and verify the updated local balance\[cite: 11, 12].

3\. \*\*Stock / Margin / Expiry Check:\*\* Run a stock/expiry check or wholesale rate lookup to confirm low-stock/expiry visibility and wholesale floor pricing\[cite: 11, 12].

4\. \*\*Payment Check + Fraud-to-Verified Flip:\*\*

&#x20;  - First check whether `₹340` came from `Suresh` while no verified payment is in the feed -> verify \*\*Fraud Alert\*\* triggers\[cite: 10, 11].

&#x20;  - Open the \*\*UPI Payment Simulator\*\*, select \*\*Suresh Kumar / ₹340 / PhonePe\*\*, and click \*\*Send REAL UPI Payment\*\*\[cite: 10, 12].

&#x20;  - Re-check `Suresh` for `₹340` -> verify \*\*VERIFIED\*\* match appears with UTR/time and use \*\*1-Tap Deduct from Khata\*\* if applicable\[cite: 11, 12].



\## Later Android `NotificationListenerService` Prototype Notes

\- \*\*Permissions \& Setup:\*\* Requires subclassing Android's `NotificationListenerService`, declaring it in `AndroidManifest.xml`, and having the user manually grant Notification Access in Android Settings\[cite: 8]. Test with `Android Studio` and `ADB`\[cite: 8].

\- \*\*Practical Limits:\*\* Budget Android devices can restrict background/notification listeners under battery optimization, and notification text formats vary across UPI apps and bank SMS alerts\[cite: 4, 8]. Keep the simulator as a repeatable fallback for demos\[cite: 8, 10].

