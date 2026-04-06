// ===== admin.js - 관리자 대시보드 로직 =====

let allSigners = [];

// ── 로그인 ────────────────────────────────────────────────────
document.getElementById('btn-login').addEventListener('click', tryLogin);
document.getElementById('admin-pw').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') tryLogin();
});

function tryLogin() {
  const pw = document.getElementById('admin-pw').value;
  if (pw === ADMIN_PASSWORD) {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'block';
    loadSigners();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

// ── 서명자 불러오기 ───────────────────────────────────────────
async function loadSigners() {
  try {
    const snap = await db.collection('signatures')
      .orderBy('signedAt', 'desc')
      .get();

    allSigners = snap.docs.map((doc, i) => ({
      id: doc.id,
      seq: snap.size - i,
      ...doc.data(),
      signedAt: doc.data().signedAt?.toDate() || new Date(),
    }));

    updateStats();
    renderTable(allSigners);
  } catch (err) {
    console.error(err);
    document.getElementById('signer-tbody').innerHTML =
      '<tr><td colspan="7" class="loading-row">데이터를 불러오지 못했습니다. Firestore 설정을 확인하세요.</td></tr>';
  }
}

// ── 통계 업데이트 ─────────────────────────────────────────────
function updateStats() {
  const total = allSigners.length;
  const today = allSigners.filter(s => {
    const d = s.signedAt;
    const now = new Date();
    return d.getFullYear() === now.getFullYear() &&
           d.getMonth() === now.getMonth() &&
           d.getDate() === now.getDate();
  }).length;

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-remain').textContent = Math.max(TARGET_COUNT - total, 0);
  document.getElementById('stat-today').textContent = today;
  document.getElementById('stat-pct').textContent = Math.round((total / TARGET_COUNT) * 100) + '%';

  const pct = Math.min((total / TARGET_COUNT) * 100, 100);
  document.getElementById('admin-progress-fill').style.width = pct + '%';
}

// ── 테이블 렌더링 ─────────────────────────────────────────────
function renderTable(list) {
  const tbody = document.getElementById('signer-tbody');
  if (!list.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="loading-row">서명자가 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = list.map((s, i) => `
    <tr data-id="${s.id}">
      <td>${s.seq ?? (list.length - i)}</td>
      <td>${escHtml(s.name)}</td>
      <td>${escHtml(s.phone)}</td>
      <td style="white-space:nowrap">${formatDateTime(s.signedAt)}</td>
      <td style="font-size:0.75rem;color:#888">${escHtml(s.ip || '-')}</td>
      <td>
        ${s.signatureImage
          ? `<img src="${s.signatureImage}" class="sig-thumb" alt="서명" />`
          : '-'}
      </td>
      <td>
        <button class="btn-del" onclick="deleteSigner('${s.id}', '${escHtml(s.name)}')">삭제</button>
      </td>
    </tr>
  `).join('');
}

// ── 검색 ─────────────────────────────────────────────────────
document.getElementById('search-input').addEventListener('input', (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) { renderTable(allSigners); return; }
  const filtered = allSigners.filter(s =>
    s.name.toLowerCase().includes(q) || s.phone.includes(q)
  );
  renderTable(filtered);
});

// ── 삭제 ─────────────────────────────────────────────────────
async function deleteSigner(id, name) {
  if (!confirm(`"${name}" 님의 서명을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
  try {
    await db.collection('signatures').doc(id).delete();
    allSigners = allSigners.filter(s => s.id !== id);
    updateStats();
    renderTable(allSigners);
  } catch (err) {
    alert('삭제에 실패했습니다.');
    console.error(err);
  }
}

// ── CSV 내보내기 ──────────────────────────────────────────────
document.getElementById('btn-export-csv').addEventListener('click', () => {
  if (!allSigners.length) return alert('서명자가 없습니다.');

  const rows = [
    ['#', '이름', '휴대폰', '서명일시', 'IP', '문서ID'],
    ...allSigners.map((s, i) => [
      s.seq ?? (allSigners.length - i),
      s.name,
      s.phone,
      formatDateTime(s.signedAt),
      s.ip || '',
      s.id,
    ])
  ];

  const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
  const bom = '\uFEFF'; // 한글 깨짐 방지
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `서명자목록_${formatDateSimple(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

// ── 통합 PDF 내보내기 ──────────────────────────────────────────
document.getElementById('btn-export-pdf').addEventListener('click', () => {
  if (!allSigners.length) return alert('서명자가 없습니다.');
  generateCombinedPDF(allSigners);
});

function generateCombinedPDF(signers) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, PL = 20, PR = 20;

  // ── 1페이지: 내용증명 문서 본문 ──────────────────────────────
  let y = 20;
  doc.setFontSize(18);
  doc.setFont('NanumGothic', 'normal');
  doc.text('내용증명', W / 2, y, { align: 'center' });
  y += 10;
  doc.setLineWidth(0.8);
  doc.line(PL, y, W - PR, y);
  y += 8;

  const metaLines = [
    ['수신', '○○○ 귀하'],
    ['발신', `연서인 일동 (총 ${signers.length}명 서명 완료)`],
    ['제목', '○○○에 관한 내용증명'],
    ['작성일', formatDate(new Date())],
  ];
  doc.setFontSize(9);
  metaLines.forEach(([k, v]) => {
    doc.setFont('NanumGothic', 'normal'); doc.text(`${k}:`, PL, y);
    doc.setFont('NanumGothic', 'normal'); doc.text(v, PL + 18, y);
    y += 6;
  });
  y += 4;
  doc.setLineWidth(0.3);
  doc.line(PL, y, W - PR, y);
  y += 8;

  const bodyLines = [
    '귀하의 발전을 기원합니다.',
    '',
    '본 내용증명은 아래와 같은 사실을 통지하고자 작성되었습니다.',
    '',
    '1. 우리는 오드힐 하우스에 대한 요구를 다음과 같이 주장합니다.',
    '',
    '2. [구체적 요구사항 기재란]',
    '',
    '3. 본 통지서를 수령하신 날로부터 ○일 이내에 위 사항에 대하여',
    '   서면으로 회신하여 주시기 바랍니다.',
    '',
    '만약 위 기한까지 적절한 조치가 이루어지지 않을 경우, 법적 조치를',
    '포함한 가능한 모든 수단을 강구할 것임을 통보합니다.',
    '',
    '위와 같이 통지합니다.',
  ];
  doc.setFontSize(9);
  bodyLines.forEach(line => { doc.text(line, PL, y); y += 5.5; });

  // ── 2페이지~: 서명자 목록 ─────────────────────────────────────
  doc.addPage();
  y = 20;
  doc.setFontSize(13);
  doc.setFont('NanumGothic', 'normal');
  doc.text('연서인 명단', W / 2, y, { align: 'center' });
  y += 4;
  doc.setFontSize(8);
  doc.setFont('NanumGothic', 'normal');
  doc.setTextColor(100);
  doc.text(`총 ${signers.length}명 | 출력일시: ${formatDateTime(new Date())}`, W / 2, y + 4, { align: 'center' });
  doc.setTextColor(0);
  y += 12;
  doc.setLineWidth(0.5);
  doc.line(PL, y, W - PR, y);
  y += 6;

  // 4열 그리드로 서명 배치
  const colW = (W - PL - PR) / 2;
  let col = 0;

  for (let i = 0; i < signers.length; i++) {
    const s = signers[i];
    const x = PL + col * colW;

    if (y + 40 > 280) {
      doc.addPage();
      y = 20;
      col = 0;
    }

    doc.setFontSize(8);
    doc.setFont('NanumGothic', 'normal');
    doc.text(`${i + 1}. ${s.name}`, x, y);
    doc.setFont('NanumGothic', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text(s.phone, x, y + 4);
    doc.text(formatDateTime(s.signedAt), x, y + 8);
    doc.setTextColor(0);

    // 서명 이미지
    if (s.signatureImage) {
      try {
        doc.addImage(s.signatureImage, 'PNG', x, y + 10, 48, 20);
      } catch { /* 이미지 오류 무시 */ }
    }

    doc.setLineWidth(0.2);
    doc.rect(x, y - 2, colW - 4, 34);

    col++;
    if (col >= 2) { col = 0; y += 36; }
  }

  doc.save(`내용증명_통합서명_${formatDateSimple(new Date())}.pdf`);
}

// ── 유틸 ─────────────────────────────────────────────────────
function formatDate(d) {
  return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일`;
}
function formatDateSimple(d) {
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}
function formatDateTime(d) {
  if (!(d instanceof Date)) return '-';
  return `${formatDate(d)} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}
function escHtml(str) {
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
