/* ============================================================
   Firebase — הגדרות החיבור (ממלאים פעם אחת)
   ------------------------------------------------------------
   1. https://console.firebase.google.com → Add project → שם (למשל poodicraft)
   2. בפרויקט: Project settings (גלגל השיניים) → Your apps → </> (Web) → Register app
      → מעתיקים את הבלוק firebaseConfig ומדביקים את הערכים כאן למטה.
   3. Build → Authentication → Get started → Sign-in method:
      מפעילים "Email/Password" ו-"Google".
   4. Build → Firestore Database → Create database:
      שלב 1: Standard edition → Next.  שלב 2: Database ID משאירים (default), בוחרים
      מיקום (למשל europe-west1) → Next.  שלב 3: בוחרים את אפשרות הכללים המאובטחת
      (secure / production) → Create.
      אחר כך בלשונית Rules מוחקים הכל, מדביקים את התוכן של firestore.rules ולוחצים Publish.
   5. Authentication → Settings → Authorized domains: מוסיפים את הדומיין של האתר
      (localhost כבר מאושר). בלי זה כניסה עם Google לא תעבוד מהאתר.
   ============================================================ */
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAY9y6OqxJ5x7i-S-xzXqEl8ZNnIId-pDc",
  authDomain: "poodicraft.firebaseapp.com",
  projectId: "poodicraft",
  storageBucket: "poodicraft.firebasestorage.app",
  messagingSenderId: "91315167059",
  appId: "1:91315167059:web:2edeb5d945ce93aa780ba6"
};

// החשבון של בעל האתר — יכול למחוק כל המלצה. חייב להיות בדיוק המייל שאיתו נכנסים.
const OWNER_EMAIL = "poodicraftmc@gmail.com";
