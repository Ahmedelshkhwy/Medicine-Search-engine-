// استيراد مكتبات Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, push, onValue, remove, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// إعدادات Firebase الخاصة بمشروعك
const firebaseConfig = {
  apiKey: "AIzaSyAhmO4lLPZsuLbFSd8STo6Apx5H--s0exg",
  authDomain: "real-time-need.firebaseapp.com",
  databaseURL: "https://real-time-need-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "real-time-need",
  storageBucket: "real-time-need.firebasestorage.app",
  messagingSenderId: "1053549438782",
  appId: "1:1053549438782:web:873ccca943aaa4dbe66e6f"
};

// تهيئة Firebase
let app, database;

try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
  
  console.log('🔗 Firebase تم تهيئته بنجاح');
  console.log('📊 Database URL:', firebaseConfig.databaseURL);
  console.log('🌍 المنطقة: asia-southeast1');
  
  // اختبار الاتصال المباشر
  const testRef = ref(database, '.info/connected');
  onValue(testRef, (snapshot) => {
    if (snapshot.val() === true) {
      console.log('✅ متصل بـ Firebase Realtime Database');
    } else {
      console.log('❌ غير متصل بـ Firebase');
    }
  });
  
} catch (error) {
  console.error('❌ خطأ في تهيئة Firebase:', error);
  // إنشاء database وهمي للعمل في حالة عدم الاتصال
  database = null;
}

// تصدير الوظائف لاستخدامها في التطبيق
export { database, ref, push, onValue, remove };