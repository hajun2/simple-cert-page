# 내용증명 전자서명 시스템

GitHub Pages + Firebase Firestore 기반 온라인 전자서명 시스템입니다.

---

## 파일 구조

```
esign/
├── index.html        ← 서명 페이지 (공유할 URL)
├── admin.html        ← 관리자 대시보드
├── css/
│   └── style.css
└── js/
    ├── config.js     ← ✏️ Firebase 설정 (반드시 수정)
    ├── app.js        ← 서명 페이지 로직
    └── admin.js      ← 관리자 페이지 로직
```

---

## 설치 방법

### 1단계: Firebase 프로젝트 생성

1. https://console.firebase.google.com 접속
2. **새 프로젝트 만들기**
3. 프로젝트 이름 입력 → 만들기
4. 좌측 메뉴 **Firestore Database** → **데이터베이스 만들기**
   - 프로덕션 모드로 시작
5. 좌측 상단 **프로젝트 설정** (⚙️) → **내 앱** → **웹 앱 추가** (`</>`)
6. 앱 닉네임 입력 후 **앱 등록**
7. 아래 `firebaseConfig` 값 복사

### 2단계: js/config.js 수정

```js
const firebaseConfig = {
  apiKey:            "복사한 값",
  authDomain:        "복사한 값",
  projectId:         "복사한 값",
  storageBucket:     "복사한 값",
  messagingSenderId: "복사한 값",
  appId:             "복사한 값"
};

const ADMIN_PASSWORD = "원하는_비밀번호";  // 꼭 변경!
const TARGET_COUNT = 100;                  // 목표 서명 인원
```

### 3단계: Firestore 보안 규칙 설정

Firebase 콘솔 → Firestore → **규칙** 탭에 아래를 붙여넣기:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /signatures/{doc} {
      // 누구나 읽기 가능 (서명 수 표시용)
      allow read: if true;
      // 누구나 쓰기 가능 (서명 제출용)
      allow create: if true;
      // 삭제는 금지 (관리자도 Firebase 콘솔에서만)
      // ※ 관리자 삭제 기능 허용하려면 아래로 변경:
      // allow delete: if true;
      allow update, delete: if false;
    }
  }
}
```

> ⚠️ `allow delete: if false` 상태에서는 admin.html의 삭제 버튼이 작동하지 않습니다.
> 삭제 기능이 필요하면 `allow delete: if true;`로 변경하되, 주의하세요.

### 4단계: 내용증명 본문 수정

`index.html`에서 `<!-- ✏️ 여기에 실제 내용증명 본문을 입력하세요 -->` 부분을 실제 내용으로 교체합니다.

`js/admin.js`의 `generateCombinedPDF()` 함수 내 `bodyLines` 배열도 동일하게 수정합니다.

### 5단계: GitHub Pages 배포

```bash
# GitHub 저장소 생성 후
git init
git add .
git commit -m "init"
git remote add origin https://github.com/아이디/저장소명.git
git push -u origin main

# GitHub 저장소 → Settings → Pages → Branch: main → Save
```

배포 완료 후 URL: `https://아이디.github.io/저장소명/`

---

## 기능 요약

### 서명 페이지 (index.html)
- 내용증명 문서 본문 열람
- 이름 + 휴대폰 번호 입력
- 서명 패드 (마우스/터치)
- 동의 체크박스
- 중복 서명 방지 (DB + localStorage)
- 제출 시 → Firebase 저장 + PDF 자동 다운로드

### 관리자 페이지 (admin.html)
- 비밀번호 보호
- 서명 통계 (총 수, 오늘 서명, 달성률)
- 실시간 프로그레스 바
- 서명자 목록 (이름, 연락처, 일시, IP, 서명 이미지)
- 이름/번호 검색
- CSV 내보내기 (한글 지원)
- **통합 PDF 생성** (전체 서명자 + 서명 이미지 포함)

---

## 저장 데이터 (Firestore)

| 필드 | 타입 | 설명 |
|------|------|------|
| name | string | 서명자 이름 |
| phone | string | 휴대폰 번호 |
| signatureImage | string | 서명 이미지 (base64 PNG) |
| signedAt | timestamp | 서명 일시 |
| ip | string | 접속 IP |
| userAgent | string | 브라우저 정보 |

---

## 법적 효력 보강 옵션 (선택)

현재 구현은 **일반 전자서명** 수준입니다.  
더 강한 효력이 필요하면 아래를 추가할 수 있습니다:

| 옵션 | 방법 | 비용 |
|------|------|------|
| SMS 본인인증 | 알리고/KakaoTalk API 연동 | 건당 수십원 |
| 타임스탬프 공증 | TSA 서비스 연동 | 유료 |
| 모두싸인 대체 | 모두싸인 API 연동 | 구독형 |
