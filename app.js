const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

// ⚠️ ISI DENGAN KUNCI PROYEK SUPABASE ANDA SENDIRI (HARUS SAMA DENGAN DI FILE LOGIN)
const SUPABASE_URL = "https://trxakqvaxleslwmngsvr.supabase.co";
const SUPABASE_ANON_KEY = "process.env.SUPABASE_KEY";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

    if (pagInfoText) pagInfoText.textContent = "Menghubungkan ke database Supabase PostgreSQL...";

    await muatDataDariCloud();

    if (userRole === 'admin') {
        const welcomeEl = document.getElementById('welcome-text');
        if (welcomeEl) welcomeEl.textContent = "Super Admin (Terhubung Ke Supabase Database)";
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
        const welcomeEl = document.getElementById('welcome-text');
        if (welcomeEl) welcomeEl.textContent = `Pegawai: ${dataSaya ? dataSaya.nama : 'User'} (Akses Sinkron Terbatas)`;
        
        const areaAdmin = document.getElementById('area-tabel-admin');
        if (areaAdmin) areaAdmin.classList.add('hide-element');
        
        btnToggle.textContent = "✏️ Perbarui Data Saya";
        btnToggle.onclick = () => pemicuEditPegawai(userKey);
        btnTutupForm.onclick = () => wrapperForm.classList.add('hide-element');
    }

    if (inputMasukRS) inputMasukRS.onchange = hitungMasaKerjaOtomatis;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;
});

async function muatDataDariCloud() {
    try {
        // Ambil data instan dari Supabase
        const { data, error } = await supabaseClient.from('pegawai').select('*');
        if (error) throw error;
        dbPegawai = data || [];
    } catch (e) {
        console.error("Gagal memuat database Supabase:", e);
        dbPegawai = [];
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

async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('.btn-save');
    saveBtn.disabled = true;
    saveBtn.textContent = "⏳ Menyimpan Ke Supabase...";

    const dataObj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        dataObj[f] = el ? el.value.trim() : '';
    });

    try {
        if (statusEdit) {
            // Perbarui Data (Update)
            const { error } = await supabaseClient.from('pegawai').update(dataObj).eq('id_pegawai', dataObj.id_pegawai);
            if (error) throw error;
            alert('Data pegawai berhasil diperbarui!');
        } else {
            // Tambah Baru (Create)
            dataObj.id_pegawai = 'ID-' + Date.now();
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;
            alert('Data pegawai baru sukses ditambahkan!');
        }

        await muatDataDariCloud();
        if (userRole === 'admin') {
            refreshDataState();
            toggleFormAksi();
        } else {
            wrapperForm.classList.add('hide-element');
            btnToggle.textContent = "✏️ Perbarui Data Saya";
            statusEdit = false;
        }
    } catch (err) {
        console.error(err);
        alert("Eror saat menyimpan data ke database cloud Supabase.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "💾 Simpan Data";
    }
}

function renderTabelDenganHalaman() {
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    
    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:#94a3b8; padding:30px;">Tidak ada database pegawai terdaftar.</td></tr>`;
        if (pagInfoText) pagInfoText.textContent = "Menampilkan 0 data";
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

    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${indexMulai + 1}-${indexSelesai} dari ${totalData} pegawai`;
    if (btnPrev) btnPrev.disabled = (currentPage === 1);
    if (btnNext) btnNext.disabled = (currentPage === maxPage);
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

async function eksekusiHapusPegawai(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini dari cloud Supabase?')) {
        try {
            const { error } = await supabaseClient.from('pegawai').delete().eq('id_pegawai', id);
            if (error) throw error;
            alert("Data sukses terhapus!");
            await muatDataDariCloud();
            refreshDataState();
            tutupPanelDetail();
        } catch (e) {
            alert("Gagal menghapus data.");
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

// Unggah Excel Massal Cepat via Supabase Upsert
function jalankanProsesImportExcel() {
    const file = inputFileExcel.files[0];
    if (!file) return alert('Silakan pilih berkas Excel!');
    const reader = new FileReader();
    reader.onload = async function(e) {
        const dataBytes = new Uint8Array(e.target.result);
        const workbook = XLSX.read(dataBytes, { type: 'array' });
        const excelRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { raw: false });
        
        let batchData = [];
        excelRows.forEach(row => {
            const dataBaru = {};
            fields.forEach(f => {
                const alt = f.replace(/_/g, ' ').toLowerCase();
                const key = Object.keys(row).find(k => k.toLowerCase().trim() === f.toLowerCase() || k.toLowerCase().trim() === alt);
                dataBaru[f] = key ? row[key].toString().trim() : '';
            });
            if (!dataBaru.id_pegawai || dataBaru.id_pegawai === '') {
                dataBaru.id_pegawai = 'ID-' + Date.now() + Math.floor(Math.random() * 100);
            }
            if (dataBaru.nik && dataBaru.nama) {
                batchData.push(dataBaru);
            }
        });

        if (batchData.length > 0) {
            // Gunakan metode upsert milik Supabase untuk pemrosesan super cepat sekaligus
            const { error } = await supabaseClient.from('pegawai').upsert(batchData, { onConflict: 'nik' });
            if (error) {
                console.error(error);
                alert("Gagal mengunggah data massal.");
            } else {
                alert(`Sukses! ${batchData.length} data berhasil tersinkronisasi ke Supabase Cloud.`);
            }
        }
        await muatDataDariCloud();
        refreshDataState();
        inputFileExcel.value = '';
    };
    reader.readAsArrayBuffer(file);
}
