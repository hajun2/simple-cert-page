// ===== app.js - 서명 페이지 메인 로직 =====

// ── 오늘 날짜 표시 ──────────────────────────────────────────
const docDate = document.getElementById('doc-date');
if (docDate) {
  const now = new Date();
  docDate.textContent = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;
}

// ── 서명 패드 초기화 ──────────────────────────────────────────
const canvas = document.getElementById('signature-canvas');
const signaturePad = new SignaturePad(canvas, {
  backgroundColor: 'rgba(250, 248, 243, 1)',
  penColor: '#1a1a2e',
  minWidth: 1.5,
  maxWidth: 2.8,
});

function resizeCanvas() {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * ratio;
  canvas.height = rect.height * ratio;
  canvas.getContext('2d').scale(ratio, ratio);
  signaturePad.clear();
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

document.getElementById('btn-clear').addEventListener('click', () => signaturePad.clear());

// ── 전화번호 포맷팅 ──────────────────────────────────────────
const phoneInput = document.getElementById('input-phone');
phoneInput.addEventListener('input', (e) => {
  const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) e.target.value = digits;
  else if (digits.length <= 7) e.target.value = `${digits.slice(0,3)}-${digits.slice(3)}`;
  else e.target.value = `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
});

// ── 이미 서명했는지 확인 (localStorage 기반) ────────────────────
const SIGNED_KEY = 'esign_signed';
if (localStorage.getItem(SIGNED_KEY)) {
  document.getElementById('sign-form').style.display = 'none';
  document.getElementById('already-signed-msg').style.display = 'block';
}

// ── 서명 수 실시간 반영 ──────────────────────────────────────
async function updateProgress() {
  try {
    const snap = await db.collection('signatures').get();
    const count = snap.size;
    document.getElementById('sign-count').textContent = count;
    const pct = Math.min((count / TARGET_COUNT) * 100, 100);
    document.getElementById('progress-fill').style.width = pct + '%';
  } catch (e) {
    console.warn('progress fetch error', e);
  }
}
updateProgress();

// ── IP 주소 가져오기 ─────────────────────────────────────────
async function getIP() {
  try {
    const res = await fetch('https://api.ipify.org?format=json');
    const data = await res.json();
    return data.ip;
  } catch {
    return 'unknown';
  }
}

// ── 폼 제출 ──────────────────────────────────────────────────
const form = document.getElementById('sign-form');
const btnSubmit = document.getElementById('btn-submit');
const btnText = document.getElementById('btn-text');
const btnLoading = document.getElementById('btn-loading');

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('input-name').value.trim();
  const phone = document.getElementById('input-phone').value.trim();
  const consent = document.getElementById('consent-check').checked;

  // 유효성 검사
  if (!name) return alert('이름을 입력해 주세요.');
  if (phone.replace(/\D/g, '').length < 10) return alert('올바른 휴대폰 번호를 입력해 주세요.');
  if (signaturePad.isEmpty()) return alert('서명을 입력해 주세요.');
  if (!consent) return alert('동의 체크박스를 확인해 주세요.');

  // 중복 서명 확인 (DB 기준)
  const dup = await db.collection('signatures').where('phone', '==', phone).get();
  if (!dup.empty) {
    alert('이미 서명하셨습니다.');
    localStorage.setItem(SIGNED_KEY, '1');
    return;
  }

  // 로딩 상태
  btnSubmit.disabled = true;
  btnText.style.display = 'none';
  btnLoading.style.display = 'inline';

  const signedAt = new Date();
  const ip = await getIP();
  const signatureImage = signaturePad.toDataURL('image/png');

  const record = {
    name,
    phone,
    signatureImage,
    signedAt: firebase.firestore.Timestamp.fromDate(signedAt),
    ip,
    userAgent: navigator.userAgent,
  };

  try {
    const docRef = await db.collection('signatures').add(record);

    // localStorage에 서명 완료 표시
    localStorage.setItem(SIGNED_KEY, docRef.id);

    // PDF 생성 후 다운로드
    generatePDF({ name, phone, signedAt, ip, signatureImage, docId: docRef.id });

    // UI 전환
    form.style.display = 'none';
    document.getElementById('success-msg').style.display = 'block';
    updateProgress();

    // PDF 다운로드 버튼
    document.getElementById('btn-download-pdf').addEventListener('click', () => {
      generatePDF({ name, phone, signedAt, ip, signatureImage, docId: docRef.id });
    });

  } catch (err) {
    console.error(err);
    alert('저장 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  } finally {
    btnSubmit.disabled = false;
    btnText.style.display = 'inline';
    btnLoading.style.display = 'none';
  }
});

// ── PDF 생성 ──────────────────────────────────────────────────
function generatePDF({ name, phone, signedAt, ip, signatureImage, docId }) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });

  const W = 210, PL = 25, PR = 25, TW = W - PL - PR;
  let y = 20;


  // ─ 제목
  doc.setFontSize(18);
  doc.setFont('NanumGothic', 'normal');
  doc.text('내용증명 (연서 서명본)', W / 2, y, { align: 'center' });
  y += 10;

  doc.setLineWidth(0.8);
  doc.line(PL, y, W - PR, y);
  y += 8;

  // ─ 문서 정보
  doc.setFontSize(9);
  doc.setFont('NanumGothic', 'normal');
  const metaLines = [
    ['수신', '○○○ 귀하'],
    ['발신', '연서인 일동 (총 100명)'],
    ['제목', '○○○에 관한 내용증명'],
    ['작성일', formatDate(new Date())],
  ];
  metaLines.forEach(([k, v]) => {
    doc.setFont('NanumGothic', 'normal');
    doc.text(`${k}:`, PL, y);
    doc.setFont('NanumGothic', 'normal');
    doc.text(v, PL + 18, y);
    y += 6;
  });
  y += 4;

  doc.setLineWidth(0.3);
  doc.line(PL, y, W - PR, y);
  y += 8;

  // ─ 본문
  doc.setFontSize(9);
  const bodyText = [
    '귀하의 발전을 기원합니다.',
    '',
    '본 내용증명은 아래와 같은 사실을 통지하고자 작성되었습니다.',
    '',
    '1. 우리 연서인 일동은 [사실관계 기재란] 에 관하여 다음과 같이 주장합니다.',
    '',
    '2. [구체적 요구사항 기재란]',
    '',
    '3. 본 통지서를 수령하신 날로부터 ○일 이내에 위 사항에 대하여 서면으로 회신하여',
    '   주시기 바랍니다.',
    '',
    '만약 위 기한까지 적절한 조치가 이루어지지 않을 경우, 법적 조치를 포함한',
    '가능한 모든 수단을 강구할 것임을 통보합니다.',
    '',
    '위와 같이 통지합니다.',
  ];
  bodyText.forEach(line => {
    doc.text(line, PL, y);
    y += 5.5;
  });
  y += 6;

  doc.setLineWidth(0.3);
  doc.line(PL, y, W - PR, y);
  y += 10;

  // ─ 서명자 정보
  doc.setFontSize(11);
  doc.setFont('NanumGothic', 'normal');
  doc.text('서명자 정보', PL, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont('NanumGothic', 'normal');
  const signerInfo = [
    ['이름', name],
    ['휴대폰', phone],
    ['서명 일시', formatDateTime(signedAt)],
    ['IP 주소', ip],
    ['문서 ID', docId],
  ];
  signerInfo.forEach(([k, v]) => {
    doc.setFont('NanumGothic', 'normal');
    doc.text(`${k}:`, PL, y);
    doc.setFont('NanumGothic', 'normal');
    doc.text(v, PL + 24, y);
    y += 6;
  });
  y += 8;

  // ─ 서명 이미지
  doc.setFont('NanumGothic', 'normal');
  doc.setFontSize(9);
  doc.text('서명:', PL, y);
  y += 4;
  doc.addImage(signatureImage, 'PNG', PL, y, 60, 24);
  y += 28;

  // ─ 해시 (무결성 표시)
  const hash = simpleHash(docId + name + phone);
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`문서 무결성 코드: ${hash}`, PL, y);
  doc.setTextColor(0);

  // 하단선
  y += 6;
  doc.setLineWidth(0.8);
  doc.line(PL, y, W - PR, y);
  y += 5;
  doc.setFontSize(7);
  doc.setTextColor(120);
  doc.text('본 문서는 전자서명법 제2조에 따른 전자서명이 포함된 법적 효력 문서입니다.', W / 2, y, { align: 'center' });

  doc.save(`내용증명_서명_${name}_${formatDateSimple(signedAt)}.pdf`);
}

// ── 유틸 ─────────────────────────────────────────────────────
function formatDate(d) {
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}
function formatDateSimple(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function formatDateTime(d) {
  return `${formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
}
function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).toUpperCase().padStart(8, '0');
}
