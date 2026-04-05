# CLAUDE.md

이 파일은 Claude Code(claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 프로젝트 개요

한국어 문서를 위한 **바닐라 HTML/CSS/JavaScript** 전자서명 수집 앱입니다. 빌드 시스템, 패키지 매니저, 트랜스파일 없이 CDN 라이브러리를 사용하는 정적 파일로만 구성됩니다.

## 빌드 및 개발 명령어 없음

npm 스크립트, 빌드 단계, 테스트 명령어가 없습니다. 개발 방법:
- 파일을 직접 수정
- 브라우저에서 `index.html` 또는 `admin.html` 열기
- 전체 기능을 사용하려면 `config.js`에 Firebase 인증 정보를 설정해야 함

## 아키텍처

두 페이지로 구성된 앱:
- **`index.html` + `app.js`** — 공개 서명 폼 (문서 표시, 캔버스 서명, Firestore 저장, PDF 다운로드)
- **`admin.html` + `admin.js`** — 비밀번호 보호 대시보드 (통계, 서명자 목록, CSV/PDF 내보내기)
- **`config.js`** — Firebase 인증 정보, `ADMIN_PASSWORD`, `TARGET_COUNT`
- **`style.css`** — 모든 스타일; CSS 변수 사용 (`--ink`, `--cream`, `--gold`, `--paper`)

## 외부 의존성 (CDN 전용)

- **Firebase v10** (compat 모드) — 유일한 백엔드로 Firestore 사용
- **SignaturePad v4.1.5** — 캔버스 서명 캡처
- **jsPDF v2.5.1** — 개인 및 통합 PDF 생성
- **Google Fonts** — Noto Serif KR / Noto Sans KR

## 주요 제약사항

- **관리자 인증은 클라이언트 사이드 전용** — 비밀번호가 `config.js`에 있어 소스를 읽는 누구에게나 노출됨
- **Firestore 보안 규칙**은 외부에서 별도로 설정해야 함 (이 저장소에 없음)
- **서버 사이드 코드 없음** — IP는 `ipify.org`에서 가져오며 백엔드가 없음
- **한국어 텍스트** — 모든 사용자 노출 문자열과 문서 내용이 한국어; CSV 내보내기 시 `utf-8` / BOM 처리 필요
- 저장소 루트의 `Claude.dmg` 파일은 프로젝트와 무관하므로 수정하지 말 것
