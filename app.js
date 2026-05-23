// Konfigurasi Fields Utama Tabel Induk Pegawai (31 Kolom)
const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

const SUPABASE_URL = "https://trxakqvaxleslwmngsvr.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_fKDMGUajM2z2CbLVk2DuGg_8mSdHQoC";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let dbPegawai = [];
let statusEdit = false;
let currentPage = 1;
const rowsPerPage = 10;
let dataFilterAktif = [];

// DOM Selector Komponen Utama Admin
const mainForm = document.getElementById('main-crud-form');
const tBody = document.getElementById('body-tabel-pegawai');
const inputCari = document.getElementById('input-cari');
const btnExcel = document.getElementById('btn-excel');
const btnPdf = document.getElementById('btn-pdf');
const btnPrev = document.getElementById('btn-page-prev');
const btnNext = document.getElementById('btn-page-next');
const pagInfoText = document.getElementById('pagination-text-info');

document.addEventListener('DOMContentLoaded', async () => {
    if (pagInfoText) pagInfoText.textContent = "Menghubungkan ke server cloud...";

    await muatDataDariCloud();
    hitungStatistikDashboard();
    refreshDataState();

    if (inputCari) inputCari.oninput = jalankanPencarian;
    if (btnExcel) btnExcel.onclick = unduhExcel;
    if (btnPdf) btnPdf.onclick = unduhPDF;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;

    if (btnPrev) btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; renderTabelDenganHalaman(); } };
    if (btnNext) btnNext.onclick = () => { const maxPage = Math.ceil(dataFilterAktif.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTabelDenganHalaman(); } };
});

async function muatDataDariCloud() {
    try {
        const { data, error } = await supabaseClient.from('pegawai').select('*');
        if (error) throw error;
        dbPegawai = data || [];
    } catch (e) {
        console.error(e);
        dbPegawai = [];
    }
}

function refreshDataState() {
    dataFilterAktif = [...dbPegawai];
    currentPage = 1;
    renderTabelDenganHalaman();
}

// 📊 HITUNG METRIK DASHBOARD UTAMA SISI ADMIN
async function hitungStatistikDashboard() {
    if (document.getElementById('stat-total-pegawai')) {
        document.getElementById('stat-total-pegawai').textContent = dbPegawai.length;
@@ -74,14 +73,12 @@
    }
}

// 📝 ACTION SAVE & UPDATE DATA INDUK PEGAWAI
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses...";

    // Sebelum menyimpan, pastikan input NIK di-enable agar datanya ikut terkirim ke Supabase
    const nikInput = document.getElementById('nik');
    if (nikInput) nikInput.disabled = false;

@@ -122,7 +119,6 @@
    }
}

// 👥 RENDERING DAFTAR PEGAWAI INDUK DENGAN PROTEKSI ROLE
function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
@@ -174,7 +170,6 @@
    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${((currentPage-1)*rowsPerPage)+1}-${Math.min(currentPage*rowsPerPage, totalData)} dari ${totalData} pegawai`;
}

// 🚪 PROSES PEGAWAI KELUAR
async function mutasiKeluarAksi(id) {
    const p = dbPegawai.find(x => x.id_pegawai === id);
    if (!p) return;
@@ -201,7 +196,6 @@
    }
}

// 🟢 LOGIKA PENANGGUNG JAWAB MENU ROUTER ARSIP SEKUNDER
async function muatTabelSpesifik(namaTabel, idTbodyTarget, headersArray, rowBuilderFunc) {
    const tbody = document.getElementById(idTbodyTarget);
    if (!tbody) return;
@@ -227,7 +221,6 @@
    }
}

// 🕒 UTILITY HITUNG SISA WAKTU SIK (ANTI-CRASH)
function hitungSisaWaktuSIK(tglBerakhirStr, elementTr) {
    if (!tglBerakhirStr) return "-";
    const akhir = new Date(tglBerakhirStr);
@@ -252,83 +245,63 @@
    return `${tahun} Thn ${bulan} Bln ${hari} Hari`;
}

// 📅 1. REKAP MAJU: HITUNG MASA KERJA LENGKAP (TAHUN, BULAN, HARI)
window.hitungMasaKerjaOtomatis = function() {
// 📅 CORE ENGINE: JALANKAN SEMUA AUTOMATION PENANGGALAN SEKALIGUS
window.jalankanSemuaOtomatisasiSistem = function() {
    const inputMasukRS = document.getElementById('masuk_rs');
    if (!inputMasukRS || !inputMasukRS.value) return;
    
    const masuk = new Date(inputMasukRS.value); 
    const hariIni = new Date();
    
    let tahun = hariIni.getFullYear() - masuk.getFullYear(); 
    let bulan = hariIni.getMonth() - masuk.getMonth();
    let hari = hariIni.getDate() - masuk.getDate();
    
    if (hari < 0) {
        const bulanLalu = new Date(hariIni.getFullYear(), hariIni.getMonth(), 0).getDate();
        hari += bulanLalu;
        bulan--;
    }
    if (bulan < 0) { 
        tahun--; 
        bulan += 12; 
    }
    
    if (document.getElementById('masa_kerja_rs')) {
        document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan ${hari} Hari`;
    const inputTglLahir = document.getElementById('tanggal_lahir');
    const inputBUP = document.getElementById('rentang_bup');
    const inputNIP = document.getElementById('nip');

    // 1. Hitung Masa Kerja
    if (inputMasukRS && inputMasukRS.value) {
        const masuk = new Date(inputMasukRS.value); 
        const hariIni = new Date();
        let tahun = hariIni.getFullYear() - masuk.getFullYear(); 
        let bulan = hariIni.getMonth() - masuk.getMonth();
        let hari = hariIni.getDate() - masuk.getDate();
        if (hari < 0) { hari += new Date(hariIni.getFullYear(), hariIni.getMonth(), 0).getDate(); bulan--; }
        if (bulan < 0) { tahun--; bulan += 12; }
        if (document.getElementById('masa_kerja_rs')) {
            document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan ${hari} Hari`;
        }
    }
}

// 📅 2. REKAP MAJU: TMT PENSIUN (TGL 1 BULAN BERIKUTNYA DARI TGL LAHIR + BUP)
window.hitungTMTPensiunOtomatis = function() {
    const tglLahirVal = document.getElementById('tanggal_lahir').value;
    const bupInput = document.getElementById('rentang_bup');
    if (!bupInput) return;
    const bupVal = parseInt(bupInput.value);
    
    if (!tglLahirVal || !bupVal || isNaN(bupVal)) return;
    
    const tglLahir = new Date(tglLahirVal);
    const tahunPensiun = tglLahir.getFullYear() + bupVal;
    const bulanPensiun = tglLahir.getMonth(); 
    
    // Setel otomatis ke tanggal 1 pada bulan berikutnya
    const tmtPensiunDate = new Date(tahunPensiun, bulanPensiun + 1, 1);
    
    const yyyy = tmtPensiunDate.getFullYear();
    const mm = String(tmtPensiunDate.getMonth() + 1).padStart(2, '0');
    const dd = String(tmtPensiunDate.getDate()).padStart(2, '0');
    
    if (document.getElementById('tmt_pensiun')) {
        document.getElementById('tmt_pensiun').value = `${yyyy}-${mm}-${dd}`;
    // 2. Hitung TMT Pensiun
    if (inputTglLahir && inputTglLahir.value && inputBUP && inputBUP.value) {
        const bupVal = parseInt(inputBUP.value);
        if (!isNaN(bupVal)) {
            const tglLahir = new Date(inputTglLahir.value);
            const tmtPensiunDate = new Date(tglLahir.getFullYear() + bupVal, tglLahir.getMonth() + 1, 1);
            const yyyy = tmtPensiunDate.getFullYear();
            const mm = String(tmtPensiunDate.getMonth() + 1).padStart(2, '0');
            const dd = String(tmtPensiunDate.getDate()).padStart(2, '0');
            if (document.getElementById('tmt_pensiun')) {
                document.getElementById('tmt_pensiun').value = `${yyyy}-${mm}-${dd}`;
            }
        }
    }
}

// 📅 3. REKAP MAJU: TMT CPNS DARI 8 DIGIT AWAL STRUKTUR NIP
window.hitungTMTCPNSOtomatis = function() {
    const nipInput = document.getElementById('nip');
    if (!nipInput) return;
    
    const nipVal = nipInput.value.trim();
    if (nipVal.length < 8) return; 
    
    const tahunStr = nipVal.substring(0, 4);
    const bulanStr = nipVal.substring(4, 6);
    const hariStr = nipVal.substring(6, 8);
    
    const tahun = parseInt(tahunStr);
    const bulan = parseInt(bulanStr);
    const hari = parseInt(hariStr);
    
    if (isNaN(tahun) || isNaN(bulan) || isNaN(hari)) return;
    if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return;
    
    if (document.getElementById('tmt_cpns')) {
        document.getElementById('tmt_cpns').value = `${tahunStr}-${bulanStr}-${hariStr}`;
    // 3. Hitung TMT CPNS dari NIP
    if (inputNIP && inputNIP.value.trim().length >= 8) {
        const nipVal = inputNIP.value.trim();
        const tahunStr = nipVal.substring(0, 4);
        const bulanStr = nipVal.substring(4, 6);
        const hariStr = nipVal.substring(6, 8);
        if (!isNaN(parseInt(tahunStr)) && !isNaN(parseInt(bulanStr)) && !isNaN(parseInt(hariStr))) {
            if (parseInt(bulanStr) >= 1 && parseInt(bulanStr) <= 12 && parseInt(hariStr) >= 1 && parseInt(hariStr) <= 31) {
                if (document.getElementById('tmt_cpns')) {
                    document.getElementById('tmt_cpns').value = `${tahunStr}-${bulanStr}-${hariStr}`;
                }
            }
        }
    }
}

// 📝 RE-HOOK ROUTER UNTUK MONITOR LIVE OPERASIONAL TABEL ARSIP
// Re-hook pemicu manual saat admin mengetik di form
window.hitungMasaKerjaOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTPensiunOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTCPNSOtomatis = () => window.jalankanSemuaOtomatisasiSistem();

window.switchViewHook = function(viewId) {
    const roleSekarang = sessionStorage.getItem('role');
    const triggerIds = ['btn-tambah-masuk-trigger', 'btn-tambah-keluar-trigger', 'btn-tambah-str-trigger', 'btn-tambah-sik-trigger', 'btn-tambah-surat-masuk-trigger', 'btn-tambah-surat-keluar-trigger'];
@@ -391,29 +364,32 @@
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = dataPeg[f] || ''; });
    statusEdit = true;

    // 🔥 BARU: Paksa hitung penanggalan otomatis begitu tombol edit diklik
    window.jalankanSemuaOtomatisasiSistem();
    
    document.getElementById('main-form-title').innerHTML = `<i class="fa-solid fa-user-pen"></i> Modifikasi / Ubah Berkas Pegawai: ${dataPeg.nama}`;
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.remove('hide-element');
    window.scrollTo({ top: wrapper.offsetTop - 20, behavior: 'smooth' });
}

function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    dataFilterAktif = dbPegawai.filter(p => (p.nama?.toLowerCase().includes(kataKunci)) || (p.nik?.includes(kataKunci)));
    currentPage = 1; renderTabelDenganHalaman();
}

function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data kosong.');
    const dataFormatted = dbPegawai.map((p, i) => { const row = { "NO": i + 1 }; fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; }); return row; });
    const ws = XLSX.utils.json_to_sheet(dataFormatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pegawai"); XLSX.writeFile(wb, "Data_Karyawan.xlsx");
}

function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data kosong.');
    const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14); doc.text("LAPORAN INDUK KEPEGAWAIAN", 24, 30);
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'UNIT RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.jabatan||'-', p.ruangan||'-']);
    doc.autoTable({ head: headerPDF, body: isiPDF, startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } }); doc.save("Laporan_Karyawan.pdf");
}
