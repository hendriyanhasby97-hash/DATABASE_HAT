// Master Array Fields (29 Parameter Data Komplit)
const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'gol', 'tmt_pangkat', 'tmt_berikutnya',
    'jabatan', 'jenis_kelamin', 'agama', 'rentang_bup', 'tmt_pensiun', 'tmt_cpns',
    'masuk_rs', 'masa_kerja_rs', 'tempat_lahir', 'tanggal_lahir', 'status_keluarga',
    'alamat', 'jenjang', 'fakultas', 'jurusan', 'ruangan', 'no_bpjsn',
    'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

let dbPegawai = JSON.parse(localStorage.getItem('pegawai_storage_db')) || [];
let statusEdit = false;

// DOM Elements
const wrapperForm = document.getElementById('form-master-wrapper');
const btnToggle = document.getElementById('btn-toggle-form');
const btnTutupForm = document.getElementById('btn-tutup-form');
const mainForm = document.getElementById('main-crud-form');
const tBody = document.getElementById('body-tabel-pegawai');
const inputCari = document.getElementById('input-cari');
const panelDetail = document.getElementById('detail-panel');
const wadahDetail = document.getElementById('wadah-detail-item');
const btnTutupDetail = document.getElementById('btn-tutup-detail');
const inputMasukRS = document.getElementById('masuk_rs');
const btnExcel = document.getElementById('btn-excel');
const btnPdf = document.getElementById('btn-pdf');

// Jalankan Event Listener saat DOM siap
document.addEventListener('DOMContentLoaded', () => {
    renderTabel();

    btnToggle.onclick = toggleFormAksi;
    btnTutupForm.onclick = toggleFormAksi;
    btnTutupDetail.onclick = tutupPanelDetail;
    inputCari.oninput = jalankanPencarian;
    inputMasukRS.onchange = hitungMasaKerjaOtomatis;
    btnExcel.onclick = unduhExcel;
    btnPdf.onclick = unduhPDF;
    mainForm.onsubmit = simpanFormPegawai;
});

// Fungsi Buka/Tutup Form Input Utama
function toggleFormAksi() {
    wrapperForm.classList.toggle('hide-element');
    if (wrapperForm.classList.contains('hide-element')) {
        btnToggle.textContent = "📝 Buka Form Input";
        resetStrukturForm();
    } else {
        btnToggle.textContent = "❌ Sembunyikan Form";
        window.scrollTo({ top: wrapperForm.offsetTop - 20, behavior: 'smooth' });
    }
}

// Aksi Submit Form (Create & Update)
function simpanFormPegawai(e) {
    e.preventDefault();
    const data = {};
    fields.forEach(f => data[f] = document.getElementById(f).value);

    if (statusEdit) {
        const index = dbPegawai.findIndex(x => x.id_pegawai === data.id_pegawai);
        if (index !== -1) dbPegawai[index] = data;
        alert('Data pegawai berhasil diperbarui!');
    } else {
        data.id_pegawai = 'ID-' + Date.now();
        dbPegawai.push(data);
        alert('Data pegawai baru berhasil disimpan!');
    }

    localStorage.setItem('pegawai_storage_db', JSON.stringify(dbPegawai));
    renderTabel();
    toggleFormAksi();
}

// Render Data ke Baris Tabel HTML Ringkas
function renderTabel(dataData = dbPegawai) {
    tBody.innerHTML = '';
    if (dataData.length === 0) {
        tBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px;">Tidak ada database pegawai terdaftar.</td></tr>`;
        return;
    }

    dataData.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nik || '-'}</td>
            <td style="font-weight:700; color:#1e3a8a;">${p.nama || '-'}</td>
            <td><span style="background:#f1f5f9; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${p.status || '-'}</span></td>
            <td>${p.jabatan || '-'}</td>
            <td>${p.masuk_rs || '-'}</td>
            <td>${p.jenjang || ''} - ${p.jurusan || ''}</td>
            <td>${p.ruangan || '-'}</td>
            <td style="text-align: center; white-space:nowrap;">
                <button type="button" class="btn-row" style="background:#2563eb;" onclick="tampilkanDetailPanel('${p.id_pegawai}')">👁️ Detail</button>
                <button type="button" class="btn-row" style="background:#d97706;" onclick="pemicuEditPegawai('${p.id_pegawai}')">✏️ Edit</button>
                <button type="button" class="btn-row" style="background:#dc2626;" onclick="eksekusiHapusPegawai('${p.id_pegawai}')">🗑️ Hapus</button>
            </td>
        `;
        tBody.appendChild(tr);
    });
}

// Tampilkan Panel Rincian 29 Parameter Lengkap di bawah tabel
function tampilkanDetailPanel(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;

    wadahDetail.innerHTML = '';
    fields.forEach(f => {
        const labelBersih = f.replace(/_/g, ' ');
        wadahDetail.innerHTML += `
            <div class="detail-card-item">
                <div class="detail-card-label">${labelBersih}</div>
                <div class="detail-card-value">${dataPeg[f] || '-'}</div>
            </div>
        `;
    });
    panelDetail.classList.add('active');
    window.scrollTo({ top: panelDetail.offsetTop - 20, behavior: 'smooth' });
}

function tutupPanelDetail() {
    panelDetail.classList.remove('active');
}

// Isi Ulang Form untuk diedit
function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;

    fields.forEach(f => document.getElementById(f).value = dataPeg[f] || '');
    statusEdit = true;
    
    if (wrapperForm.classList.contains('hide-element')) {
        wrapperForm.classList.remove('hide-element');
        btnToggle.textContent = "❌ Sembunyikan Form";
    }
    window.scrollTo({ top: wrapperForm.offsetTop - 20, behavior: 'smooth' });
}

// Jalankan Aksi Hapus Data Pegawai
function eksekusiHapusPegawai(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data pegawai ini secara permanen?')) {
        dbPegawai = dbPegawai.filter(x => x.id_pegawai !== id);
        localStorage.setItem('pegawai_storage_db', JSON.stringify(dbPegawai));
        renderTabel();
        tutupPanelDetail();
    }
}

// Penyaringan Pencarian Instan
function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase();
    const hasilFilter = dbPegawai.filter(p => 
        (p.nama && p.nama.toLowerCase().includes(kataKunci)) || 
        (p.nik && p.nik.includes(kataKunci))
    );
    renderTabel(hasilFilter);
}

// Hitung Masa Kerja Otomatis
function hitungMasaKerjaOtomatis() {
    if (!this.value) return;
    const masuk = new Date(this.value);
    const hariIni = new Date();
    let tahun = hariIni.getFullYear() - masuk.getFullYear();
    let bulan = hariIni.getMonth() - masuk.getMonth();
    if (bulan < 0) { tahun--; bulan += 12; }
    document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan`;
}

// Reset data Form
function resetStrukturForm() {
    mainForm.reset();
    document.getElementById('id_pegawai').value = '';
    statusEdit = false;
}

// Ekspor ke format Excel (.xlsx)
function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data masih kosong.');
    const ws = XLSX.utils.json_to_sheet(dbPegawai);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai_Lengkap.xlsx");
}

// Ekspor ke format PDF (.pdf)
function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data masih kosong.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text("LAPORAN RINGKASAN DATA PEGAWAI", 24, 30);
    
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'JABATAN', 'MASUK RS', 'RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik || '-', p.nama || '-', p.status || '-', p.jabatan || '-', p.masuk_rs || '-', p.ruangan || '-']);
    
    doc.autoTable({
        head: headerPDF,
        body: isiPDF,
        startY: 50,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save("Laporan_Ringkas_Pegawai.pdf");
}
