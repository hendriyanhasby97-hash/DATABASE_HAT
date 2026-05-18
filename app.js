const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

// ⚠️ KREDENSIAL UTAMA SUPABASE CLOUD (TETAP SINKRON)
const SUPABASE_URL = "https://trxakqvaxleslwmngsvr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fKDMGUajM2z2CbLVk2DuGg_8mSdHQoC";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dbPegawai = [];
let statusEdit = false;

let currentPage = 1;
const rowsPerPage = 10; // Diubah ke 10 baris agar pas dengan desain web modern yang ringkas
let dataFilterAktif = [];

const userRole = sessionStorage.getItem('role');
const userKey = sessionStorage.getItem('user_key');

// DOM Selector Elemen Utama
const mainForm = document.getElementById('main-crud-form');
const tBody = document.getElementById('body-tabel-pegawai');
const inputCari = document.getElementById('input-cari');
const inputMasukRS = document.getElementById('masuk_rs');
const btnExcel = document.getElementById('btn-excel');
const btnPdf = document.getElementById('btn-pdf');
const btnPrev = document.getElementById('btn-page-prev');
const btnNext = document.getElementById('btn-page-next');
const pagInfoText = document.getElementById('pagination-text-info');

document.addEventListener('DOMContentLoaded', async () => {
    if (pagInfoText) pagInfoText.textContent = "Menghubungkan ke server cloud...";

    // 1. Ambil seluruh data teranyar dari Supabase
    await muatDataDariCloud();

    // 2. Kalkulasi Angka Statistik untuk Komponen Dashboard Utama
    hitungStatistikDashboard();

    // 3. Siapkan Status Tabel Utama
    refreshDataState();

    // 4. Pasang Event Listener Aksi
    if (inputCari) inputCari.oninput = jalankanPencarian;
    if (btnExcel) btnExcel.onclick = unduhExcel;
    if (btnPdf) btnPdf.onclick = unduhPDF;
    
    if (btnPrev) btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; renderTabelDenganHalaman(); } };
    if (btnNext) btnNext.onclick = () => { const maxPage = Math.ceil(dataFilterAktif.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTabelDenganHalaman(); } };

    if (inputMasukRS) inputMasukRS.onchange = hitungMasaKerjaOtomatis;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;
});

// Ambil Data Terpusat dari Supabase
async function muatDataDariCloud() {
    try {
        const { data, error } = await supabaseClient.from('pegawai').select('*');
        if (error) throw error;
        dbPegawai = data || [];
    } catch (e) {
        console.error("Gagal memuat database Supabase:", e);
        dbPegawai = [];
    }
}

// Menghitung Angka Rekapitulasi Secara Otomatis di Halaman Depan Overview
function hitungStatistikDashboard() {
    // Total Seluruh Data Pegawai
    const totalPegawai = dbPegawai.length;
    const elTotal = document.getElementById('stat-total-pegawai');
    if (elTotal) elTotal.textContent = totalPegawai;

    // Total Pegawai Aktif (Filter Status == 'aktif')
    const pegawaiAktif = dbPegawai.filter(p => p.status && p.status.trim().toLowerCase() === 'aktif').length;
    const elAktif = document.getElementById('stat-pegawai-aktif');
    if (elAktif) elAktif.textContent = pegawaiAktif;

    // Parameter Cuti & Surat Masuk (Placeholder Data Simpanan Sementara)
    const elCuti = document.getElementById('stat-total-cuti');
    if (elCuti) elCuti.textContent = dbPegawai.filter(p => p.status && p.status.trim().toLowerCase() === 'cuti').length;

    const elSurat = document.getElementById('stat-surat-masuk');
    if (elSurat) elSurat.textContent = "0"; // Default sistem kearsipan administrasi awal
}

function refreshDataState() {
    dataFilterAktif = [...dbPegawai];
    currentPage = 1;
    renderTabelDenganHalaman();
}

// SIMPAN & UPDATE DATA KE SUPABASE
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
    const textAwal = saveBtn.innerHTML;
    
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses...";

    const dataObj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        dataObj[f] = el ? el.value.trim() : '';
    });

    try {
        if (statusEdit) {
            // Aksi Update
            const { error } = await supabaseClient.from('pegawai').update(dataObj).eq('id_pegawai', dataObj.id_pegawai);
            if (error) throw error;
            alert('Data pegawai sukses diperbarui!');
        } else {
            // Aksi Insert Baru
            dataObj.id_pegawai = 'ID-' + Date.now();
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;
            alert('Data pegawai baru berhasil ditambahkan!');
        }

        // Segarkan data
        await muatDataDariCloud();
        hitungStatistikDashboard();
        refreshDataState();
        toggleFormInput(); // Otomatis sembunyikan form input kembali

    } catch (err) {
        console.error(err);
        alert("Gagal memproses data ke server cloud Supabase.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = textAwal;
    }
}

// RENDERING TABEL DINAMIS DENGAN PAGINATION SYSTEM
function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    
    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:30px;"><i class="fa-solid fa-folder-open"></i> Tidak ada data pegawai terdaftar.</td></tr>`;
        if (pagInfoText) pagInfoText.textContent = "Menampilkan 0 data";
        if (btnPrev) btnPrev.disabled = true;
        if (btnNext) btnNext.disabled = true;
        return;
    }

    const maxPage = Math.ceil(totalData / rowsPerPage);
    if(currentPage > maxPage) currentPage = maxPage;
    const indexMulai = (currentPage - 1) * rowsPerPage;
    const indexSelesai = Math.min(indexMulai + rowsPerPage, totalData);
    const dataHalamanIni = dataFilterAktif.slice(indexMulai, indexSelesai);

    dataHalamanIni.forEach(p => {
        const tr = document.createElement('tr');
        
        // Desain Badge Warna Status Modern
        let badgeStyle = "background:#f1f5f9; color:#475569;";
        if (p.status && p.status.toLowerCase() === 'aktif') badgeStyle = "background:#dcfce7; color:#15803d; font-weight:700;";
        if (p.status && p.status.toLowerCase() === 'mutasi') badgeStyle = "background:#fef3c7; color:#b45309;";
        if (p.status && p.status.toLowerCase() === 'pensiun') badgeStyle = "background:#fee2e2; color:#b91c1c;";

        tr.innerHTML = `
            <td style="font-weight:600; color:#475569;">${p.nik || '-'}</td>
            <td style="font-weight:700; color:#1e3a8a;">${p.nama || '-'}</td>
            <td><span style="padding:4px 10px; border-radius:6px; font-size:12px; ${badgeStyle}">${p.status || '-'}</span></td>
            <td><span style="background:#f1f5f9; padding:4px 8px; border-radius:6px; font-size:12px; font-weight:600;">${p.kelompok_pegawai || '-'}</span></td>
            <td>${p.jabatan || '-'}</td>
            <td><i class="fa-solid fa-door-open" style="color:#94a3b8; margin-right:4px;"></i> ${p.ruangan || '-'}</td>
            <td style="text-align: center; white-space:nowrap;">
                <button type="button" class="btn-action" style="background:#d97706;" onclick="pemicuEditPegawai('${p.id_pegawai}')"><i class="fa-solid fa-user-pen"></i> Edit</button>
                <button type="button" class="btn-action" style="background:#dc2626;" onclick="eksekusiHapusPegawai('${p.id_pegawai}')"><i class="fa-solid fa-trash-can"></i> Hapus</button>
            </td>
        `;
        tBody.appendChild(tr);
    });

    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${indexMulai + 1}-${indexSelesai} dari ${totalData} pegawai`;
    if (btnPrev) btnPrev.disabled = (currentPage === 1);
    if (btnNext) btnNext.disabled = (currentPage === maxPage);
}

// BUKA PEMICU DATA EDIT KE FORM UTAMA
function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;

    fields.forEach(f => {
        const element = document.getElementById(f);
        if (element) element.value = dataPeg[f] || '';
    });
    statusEdit = true;
    
    // Pastikan form input ditampilkan jika tersembunyi
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.remove('hide-element');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// HAPUS DATA DARI SUPABASE CLOUD
async function eksekusiHapusPegawai(id) {
    if (confirm('Apakah Anda yakin ingin menghapus permanen berkas data karyawan ini dari Supabase Cloud?')) {
        try {
            const { error } = await supabaseClient.from('pegawai').delete().eq('id_pegawai', id);
            if (error) throw error;
            
            alert("Berkas data karyawan berhasil terhapus.");
            await muatDataDariCloud();
            hitungStatistikDashboard();
            refreshDataState();
        } catch (e) {
            alert("Gagal menghapus berkas data.");
        }
    }
}

function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    dataFilterAktif = dbPegawai.filter(p => 
        (p.nama && p.nama.toLowerCase().includes(kataKunci)) || 
        (p.nik && p.nik.includes(kataKunci))
    );
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
    const targetEl = document.getElementById('masa_kerja_rs');
    if (targetEl) targetEl.value = `${tahun} Tahun ${bulan} Bulan`;
}

// PROSES EKSPOR FILE (EXCEL & PDF)
function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data database kosong.');
    const dataFormatted = dbPegawai.map((p, i) => {
        const row = { "NO": i + 1 };
        fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; });
        return row;
    });
    const ws = XLSX.utils.json_to_sheet(dataFormatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, "Laporan_Master_Data_Pegawai.xlsx");
}

function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data database kosong.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16); doc.text("LAPORAN DAFTAR INDUK KEPEGAWAIAN INSTANSI", 24, 30);
    const headerPDF = [['NIK', 'NAMA LENGKAP PEGAWAI', 'STATUS', 'KELOMPOK', 'NAMA JABATAN', 'UNIT RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.jabatan||'-', p.ruangan||'-']);
    doc.autoTable({ head: headerPDF, body: isiPDF, startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } });
    doc.save("Laporan_Induk_Pegawai.pdf");
}
