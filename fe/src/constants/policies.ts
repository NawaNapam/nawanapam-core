export interface PolicySection {
  slug: string;
  title: string;
  items: string[];
}

export const privacyPolicy: PolicySection = {
  slug: "privacy-policy",
  title: "Privacy Policy",
  items: [
    "User Data Collection: We collect basic info such as name, email, camera/mic access for video calls, and device data.",
    "Video & Audio Call Privacy: Calls are encrypted and not recorded unless permission is obtained.",
    "Personal Data Storage: Data stored securely and never sold to third parties.",
    "Camera & Mic Permissions: Used during video calls, and gallery access only when you choose to upload a profile picture.",
    "Profile Photos: Photos you upload are stored with our image host (Cloudinary) and removed when you change or delete them.",
    "Call History: We keep a record of who you spoke with and when, and for how long — never the audio or video itself.",
    "Push Notifications: If enabled, your device's push token is stored to deliver match and reminder notifications; you can disable this anytime in Settings.",
    "Activity Data: We track engagement signals such as session counts and streaks to power matchmaking priority and streak features.",
    "Cookies & Tracking: Used for login and analytics.",
    "Third-Party Services: Services like WebRTC, Firebase Cloud Messaging, Cloudinary, and Google Sign-In may process technical data.",
    "Children Safety: Underage protection ensured.",
    "User Rights: Contact support@nawanapam.com to request access to or deletion of your data.",
    "Data Security Measures: HTTPS, encryption, and security audits.",
    "Policy Changes: Users get notified when policy updates.",
    "Contact Information: Support details available for queries.",
  ],
};

export const termsOfService: PolicySection = {
  slug: "terms-of-service",
  title: "Terms of Service",
  items: [
    "Acceptance of Terms: Using the website means agreeing to all terms.",
    "Eligibility: Minimum age requirement and no fake accounts.",
    "User Account Rules: Provide correct info and maintain account security.",
    "Prohibited Activities: No harassment, nudity, threats, fraud, or hacking.",
    "Call Rules: No recording without permission; no abuse.",
    "Privacy & Security: Data handled as per privacy policy.",
    "Account Termination: Violations lead to suspension or ban.",
    "Limitation of Liability: Service disruptions not guaranteed.",
    "Service Changes: Website may update features anytime.",
    "Payment Rules: Secure payments and refund policy if applicable.",
    "Dispute Resolution: Local legal jurisdiction applies.",
  ],
};

export const communityGuidelines: PolicySection = {
  slug: "community-guidelines",
  title: "Community Guidelines",
  items: [
    "Respectful Communication: No abuse, hate speech, or threats.",
    "No Nudity or Sexual Content: Strictly banned.",
    "No Violence: No harmful or violent behavior.",
    "No Illegal Activities: No drugs, scams, weapons, or fraud.",
    "Privacy Protection: No recording or sharing others' data.",
    "No Spam: No unwanted promotions.",
    "Safe Camera Usage: No inappropriate actions.",
    "Underage Safety: No child exploitation.",
    "Follow Laws: User must follow local rules.",
    "Reporting: Users may report violations.",
  ],
};

export const dataSafety: PolicySection = {
  slug: "data-safety",
  title: "Data Safety",
  items: [
    "Data Collection Transparency: Only necessary data is collected.",
    "No Recording Without Permission: Calls are never stored by default.",
    "Call History Data: Call metadata (participants, time, duration) is stored for your history — never the audio or video itself.",
    "Encryption: Video calls are encrypted using WebRTC.",
    "Secure Storage: Passwords encrypted; no data selling.",
    "Permission Safety: Camera/mic used only during calls; gallery access only when you choose to upload a profile photo.",
    "Push Notification Tokens: Device tokens are stored only to deliver notifications, and removed when invalid or when notifications are disabled.",
    "Child Safety: Strict protection for minors.",
    "Data Sharing Rules: Only technical providers or legal requests.",
    "Payment Safety: Secure gateways used.",
    "Account Security: Strong password & optional 2FA.",
    "Data Breach Prevention: Firewalls and monitoring.",
    "User Responsibility: Keep account secure.",
    "Data Retention: Contact support@nawanapam.com to request deletion of your data.",
  ],
};

export const ourFounders: PolicySection = {
  slug: "founders",
  title: "Our Founders",
  items: ["Mangal Hansada", "Sambara Hansda"],
};

export const policySections: PolicySection[] = [
  privacyPolicy,
  termsOfService,
  communityGuidelines,
  dataSafety,
  ourFounders,
];
