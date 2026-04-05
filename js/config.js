// import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";

// ✏️ Firebase 콘솔에서 복사한 설정값을 여기에 붙여넣으세요.
// 설정 방법: README.md 참고
const firebaseConfig = {
  apiKey: "AIzaSyCY5BZvaURnmkT2Fj-2Hhq-5k7pXMLxl-s",
  authDomain: "simple-cert-page.firebaseapp.com",
  projectId: "simple-cert-page",
  storageBucket: "simple-cert-page.firebasestorage.app",
  messagingSenderId: "435463275502",
  appId: "1:435463275502:web:ad7d535475ea8e1a18c4ff",
  measurementId: "G-5QYHTXLGZG"
};

// 관리자 비밀번호 (admin.html 접근용)
const ADMIN_PASSWORD = "dhemglf1234";  // ✏️ 반드시 변경하세요!

// 목표 서명 인원
const TARGET_COUNT = 100;

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);