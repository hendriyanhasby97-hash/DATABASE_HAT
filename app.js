const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

// ⚠️ GANTI LINK DI BAWAH INI DENGAN LINK WEB APP USER/EXEC ANDA SENDIRI DARI GOOGLE APPS SCRIPT
const API_URL = "https://script.google.com/macros/s/AKfycbzPdL7Ehg23GzcR2nwhCeiQnGrM2E9mPJJEK39032dS_DUc-ew7RKy78UZI1eeEXFZf/exec";

let dbPegawai = [];
let statusEdit = false;

let currentPage = 1;
const rowsPerPage = 25;
let dataFilterAktif = [];

const userRole = sessionStorage.getItem('role');
const userKey = sessionStorage.getItem('user_key');

// DOM Selector
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
const btnImportExcel = document.getElementById('btn-import-excel');
const inputFileExcel = document.getElementById('input-file-excel');
const btnPrev = document.getElementById('btn-page-prev');
const btnNext = document.getElementById('btn-page-next');
const pagInfoText = document.getElementById('pagination-text-info');

document.addEventListener('DOMContentLoaded', async () => {
    document.getElementById('btn-logout').onclick = () => {
        sessionStorage.clear();
        window.location.href = 'login.html';
    };

    document.getElementById('welcome-text').textContent = "Sinkronisasi dengan Google Sheets Cloud...";

    // Ambil Data dari Database Google Sheets Terpusat
    await muatDataDariCloud();

    if (userRole === 'admin') {
        document.getElementById('welcome-text').textContent = "Masuk sebagai: Super Admin (Cloud Terhubung)";
        refreshDataState();
        
        if (btnToggle) btnToggle.onclick = toggleFormAksi;
        if (btnTutupForm) btnTutupForm.onclick = toggleFormAksi;
        if (btnTutupDetail) btnTutupDetail.onclick = tutupPanelDetail;
        if (inputCari) inputCari.oninput = jalankanPencarian;
        if (btnExcel) btnExcel.onclick = unduhExcel;
        if (btnPdf) btnPdf.onclick = unduhPDF;
        if (btnImportExcel) btnImportExcel.onclick = jalankanProsesImportExcel;
        if (btnPrev) btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; renderTabelDenganHalaman(); } };
        if (btnNext) btnNext.onclick = () => { const maxPage = Math.ceil(dataFilterAktif.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTabelDenganHalaman(); } };

    } else if (userRole === 'pegawai') {
        const dataSaya = dbPegawai.find(x => x.id_pegawai === userKey);
        document.getElementById('welcome-text').textContent = `Pegawai: ${dataSaya ? dataSaya.nama : 'User'} (Akses Sinkron Terbatas)`;
        
        document.getElementById('area-tabel-admin').classList.add('hide-element');
        document.getElementById('nav-dashboard').classList.add('hide-element');
        
        btnToggle.textContent = "✏️ Perbarui Data Saya";
        btnToggle.onclick = () => pemicuEditPegawai(userKey);
        btnTutupForm.onclick = () => wrapperForm.classList.add('hide-element');
    }

    if (inputMasukRS) inputMasukRS.onchange = hitungMasaKerjaOtomatis;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;
});

// Ambil Data Live dari Google Sheets
async function muatDataDariCloud() {
    try {
        const respon = await fetch(API_URL);
        dbPegawai = await respon.json();
    } catch (e) {
        console.error("Gagal memuat database cloud:", e);
        alert("Gagal mengunduh database terbaru dari Google Sheets.");
    }
}

function refreshDataState() {
    dataFilterAktif = [...dbPegawai];
    currentPage = 1;
    renderTabelDenganHalaman();
}

function toggleFormAksi() {
    wrapperForm.classList.toggle('hide-element');
    if (wrapperForm.classList.contains('hide-element')) {
        btnToggle.textContent = userRole === 'admin' ? "📝 Buka Form Input" : "✏️ Perbarui Data Saya";
        resetStrukturForm();
    } else {
        btnToggle.textContent = "❌ Sembunyikan Form";
        window.scrollTo({ top: wrapperForm.offsetTop - 20, behavior: 'smooth' });
    }
}

// SIMPAN & UPDATE KE GOOGLE SHEETS CLOUD VIA POST
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('.btn-save');
    const textAwal = saveBtn.textContent;
    
    saveBtn.disabled = true;
    saveBtn.textContent = "⏳ Menyimpan ke Cloud Sheets...";

    const data = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        data[f] = el ? el.value.trim() : '';
    });

    if (!statusEdit) {
        data.id_pegawai = 'ID-' + Date.now();
    }

    // Siapkan kemasan payload data untuk dikirim ke Google Apps Script
    const payload = {
        action: 'save',
        data: data
    };

    try {
        const respon = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        const hasil = await respon.json();
        
        if (hasil.status === 'success') {
            alert(hasil.message);
            await muatDataDariCloud(); // Unduh ulang data terbaru
            
            if (userRole === 'admin') {
                refreshDataState();
                toggleFormAksi();
            } else {
                wrapperForm.classList.add('hide-element');
                btnToggle.textContent = "✏️ Perbarui Data Saya";
                statusEdit = false;
            }
        } else {
            alert("Gagal menyimpan: " + hasil.message);
        }
    } catch (err) {
        console.error(err);
        alert("Terjadi kendala koneksi internet ke sistem cloud.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = textAwal;
    }
}

function renderTabelDenganHalaman() {
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    
    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px;">Tidak ada database pegawai terdaftar.</td></tr>`;
        pagInfoText.textContent = "Menampilkan 0 data";
        btnPrev.disabled = true;
        btnNext.disabled = true;
        return;
    }

    const maxPage = Math.ceil(totalData / rowsPerPage);
    if(currentPage > maxPage) currentPage = maxPage;
    const indexMulai = (currentPage - 1) * rowsPerPage;
    const indexSelesai = Math.min(indexMulai + rowsPerPage, totalData);
    const dataHalamanIni = dataFilterAktif.slice(indexMulai, indexSelesai);

    dataHalamanIni.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${p.nik || '-'}</td>
            <td style="font-weight:700; color:#1e3a8a;">${p.nama || '-'}</td>
            <td><span style="background:#e0f2fe; color:#0369a1; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${p.status || '-'}</span></td>
            <td><span style="background:#f1f5f9; padding:3px 8px; border-radius:4px; font-weight:600; font-size:12px;">${p.kelompok_pegawai || '-'}</span></td>
            <td>${p.kelompok_jabatan || '-'}</td>
            <td>${p.masuk_rs || '-'}</td>
            <td>${p.ruangan || '-'}</td>
            <td style="text-align: center; white-space:nowrap;">
                <button type="button" class="btn-row" style="background:#2563eb;" onclick="tampilkanDetailPanel('${p.id_pegawai}')">👁️ Detail</button>
                <button type="button" class="btn-row" style="background:#d97706;" onclick="pemicuEditPegawai('${p.id_pegawai}')">✏️ Edit</button>
                <button type="button" class="btn-row" style="background:#dc2626;" onclick="eksekusiHapusPegawai('${p.id_pegawai}')">🗑️ Hapus</button>
            </td>
        `;
        tBody.appendChild(tr);
    });

    pagInfoText.textContent = `Menampilkan ${indexMulai + 1}-${indexSelesai} dari ${totalData} pegawai`;
    btnPrev.disabled = (currentPage === 1);
    btnNext.disabled = (currentPage === maxPage);
}

function tampilkanDetailPanel(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;
    wadahDetail.innerHTML = '';
    fields.forEach(f => {
        wadahDetail.innerHTML += `<div class="detail-card-item"><div class="detail-card-label">${f.replace(/_/g, ' ')}</div><div class="detail-card-value">${dataPeg[f] || '-'}</div></div>`;
    });
    panelDetail.classList.add('active');
    window.scrollTo({ top: panelDetail.offsetTop - 20, behavior: 'smooth' });
}

function tutupPanelDetail() { panelDetail.classList.remove('active'); }

function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;

    fields.forEach(f => {
        const element = document.getElementById(f);
        if (element) element.value = dataPeg[f] || '';
    });
    statusEdit = true;
    
    wrapperForm.classList.remove('hide-element');
    btnToggle.textContent = "❌ Sembunyikan Form";
    window.scrollTo({ top: wrapperForm.offsetTop - 20, behavior: 'smooth' });
}

// HAPUS DATA REALTIME DARI GOOGLE SHEETS
async function eksekusiHapusPegawai(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini dari cloud?')) {
        try {
            const respon = await fetch(API_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', id_pegawai: id })
            });
            const hasil = await respon.json();
            if(hasil.status === 'success') {
                alert(hasil.message);
                await muatDataDariCloud();
                refreshDataState();
                tutupPanelDetail();
            } else {
                alert("Gagal menghapus: " + hasil.message);
            }
        } catch (e) {
            alert("Gagal menghapus data akibat gangguan jaringan.");
        }
    }
}

function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    dataFilterAktif = dbPegawai.filter(p => (p.nama && p.nama.toLowerCase().includes(kataKunci)) || (p.nik && p.nik.includes(kataKunci)));
    currentPage = 1;
    renderTabelDenganHalaman();
}

function hitungMasaKerjaOtomatis() {
    if (!this.value) return;
    const masuk = new Date(this.value);
    const hariIni = new Date();
    let tahun = hariIni.getFullYear() - masuk.getFullYear();
    let bulan = hariIni.getMonth() - masuk.getMonth();
    if (bulan < 0) { tahun--; bulan += 12; }
    document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan`;
}

function resetStrukturForm() { mainForm.reset(); document.getElementById('id_pegawai').value = ''; statusEdit = false; }

function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data kosong.');
    const dataFormatted = dbPegawai.map((p, i) => {
        const row = { "NO": i + 1 };
        fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(dataFormatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai_Lengkap.xlsx");
}

function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data kosong.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16); doc.text("LAPORAN RINGKASAN DATA PEGAWAI", 24, 30);
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'MASUK RS', 'RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.kelompok_jabatan||'-', p.masuk_rs||'-', p.ruangan||'-']);
    doc.autoTable({ head: headerPDF, body: isiPDF, startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } });
    doc.save("Laporan_Ringkas_Pegawai.pdf");
}

async function jalankanProsesImportExcel() {
    const file = inputFileExcel.files[0];
    if (!file) return alert('Silakan pilih berkas Excel!');
    const reader = new FileReader();
    reader.onload = async function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
        
        alert(`Sedang memproses ${excelRows.length} data ke cloud. Mohon tunggu notifikasi sukses...`);
        
        let totalBarisSukses = 0;
        for(let row of excelRows) {
            const dataBaru = {};
            fields.forEach(f => {
                const alt = f.replace(/_/g, ' ').toLowerCase();
                const key = Object.keys(row).find(k => k.toLowerCase().trim() === f.toLowerCase() || k.toLowerCase().trim() === alt);
                dataBaru[f] = key ? row[key].toString().trim() : '';
            });
            
            if (!dataBaru.id_pegawai) dataBaru.id_pegawai = 'ID-' + Date.now() + Math.floor(Math.random() * 100);
            
            if (dataBaru.nik && dataBaru.nama) {
                await fetch(API_URL, {
                    method: 'POST',
                    body: JSON.stringify({ action: 'save', data: dataBaru })
                });
                totalBarisSukses++;
            }
        }
        
        await muatDataDariCloud();
        refreshDataState();
        inputFileExcel.value = '';
        alert(`Sukses sinkronisasi Excel!\nSebanyak ${totalBarisSukses} data dimasukkan/diperbarui di Google Sheets.`);
    };
    reader.readAsArrayBuffer(file);
}
