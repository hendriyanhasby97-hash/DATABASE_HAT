// =========================================================================
// KONFIGURASI KORE FIELD UTAMA TABEL INDUK PEGAWAI (31 BIDANG DATA)
// =========================================================================
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

// Variabel Kontrol Global (Wajib Menggunakan 'var' atau 'window.' Agar Terbaca oleh File Induk Parent)
window.dbPegawai = [];
let statusEdit = false;
let currentPage = 1;
const rowsPerPage = 20; // Tampilan data 20 baris per halaman
const rowsPerPage = 20; 
let dataFilterAktif = [];

// DOM Selector Komponen Utama Form Induk
@@ -32,9 +31,6 @@
const btnNext = document.getElementById('btn-page-next');
const pagInfoText = document.getElementById('pagination-text-info');

// =========================================================================
// INITIALIZATION LISTENER (SAAT HALAMAN DIMUAT)
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    const roleSekarang = sessionStorage.getItem('role');
    const btnTambahMaster = document.getElementById('btn-tambah-master-trigger');
@@ -60,12 +56,19 @@
    if (btnNext) btnNext.onclick = () => { const maxPage = Math.ceil(dataFilterAktif.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTabelDenganHalaman(); } };
});

// 🔥 FIX: BEGITU DATA SELESAI DI-LOAD, LANGSUNG SET KE PARENT WINDOW AGAR TOMBOL VIEW INSTAN BERFUNGSI
async function muatDataDariCloud() {
    try {
        const { data, error } = await supabaseClient.from('pegawai').select('*');
        if (error) throw error;
        window.dbPegawai = data || [];
        
        // Kirim salinan data ke index.html agar modal View selalu siap siaga tanpa delay
        if (window.parent && typeof window.parent.setCacheDataPegawaiSistem === 'function') {
            window.parent.setCacheDataPegawaiSistem(window.dbPegawai);
        }
    } catch (e) {
        console.error(e);
        window.dbPegawai = [];
    }
}
@@ -76,7 +79,6 @@
    renderTabelDenganHalaman();
}

// 💾 PROSES SIMPAN / DAFTARKAN PEGAWAI BARU (31 FIELD)
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
@@ -102,7 +104,6 @@
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;

            // Kirim log otomatis ke tabel pegawai_masuk
            await supabaseClient.from('pegawai_masuk').insert([{
                nik: dataObj.nik, nama: dataObj.nama, jenis_kelamin: dataObj.jenis_kelamin,
                agama: dataObj.agama, bagian: dataObj.ruangan, tmt_masuk: dataObj.masuk_rs, pendidikan: dataObj.jenjang
@@ -123,9 +124,6 @@
    }
}

// =========================================================================
// VIEW RENDERER KONTROL OTORITAS TOMBOL KONTROL TABEL INDUK
// =========================================================================
function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
@@ -171,6 +169,11 @@
    });

    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${((currentPage-1)*rowsPerPage)+1}-${Math.min(currentPage*rowsPerPage, totalData)} dari ${totalData} pegawai`;
    
    // 🔥 BEGITU SELESAI RENDER HALAMAN, KIRIM JUGA RE-SYNC DATA KE PARENT WINDOW
    if (window.parent && typeof window.parent.setCacheDataPegawaiSistem === 'function') {
        window.parent.setCacheDataPegawaiSistem(window.dbPegawai);
    }
}

function jalankanPencarianDanFilter() {
@@ -210,75 +213,74 @@
    if (wrapper) wrapper.classList.add('hide-element');
}

// 🔥 FIX MUTLAK: EMULATOR KONTROL EDIT YANG SINKRON DENGAN INTEGRATED ENGINE AUTOMATION
function pemicuEditPegawai(id) {
    const dataPeg = window.dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return alert("Gagal memuat rekam berkas.");

    if(document.getElementById('nik')) document.getElementById('nik').disabled = true;
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = dataPeg[f] || ''; });
    statusEdit = true;

    if (typeof jalankanSemuaOtomatisasiSistem === 'function') jalankanSemuaOtomatisasiSistem();

    document.getElementById('main-form-title').innerHTML = `<i class="fa-solid fa-user-pen"></i> Modifikasi Berkas Karyawan: ${dataPeg.nama}`;
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.remove('hide-element');
}

async function mutasiKeluarAksi(id) {
    const p = window.dbPegawai.find(x => x.id_pegawai === id);
    if (!p) return;
    const jenis = prompt(`Masukkan Jenis Keluar:\n(MUTASI / PENSIUN / RESIGN / LAINNYA)`);
    if(!jenis) return;
    const jenisUpper = jenis.toUpperCase();
    if (!['MUTASI', 'PENSIUN', 'RESIGN', 'LAINNYA'].includes(jenisUpper)) return alert('Tidak valid!');
    const ket = prompt("Masukkan Alasan Keluar:");
    try {
        await supabaseClient.from('pegawai_keluar').insert([{ nik: p.nik, nama: p.nama, bagian: p.kelompok_jabatan, unit_tugas: p.ruangan, tmt_keluar: new Date().toISOString().split('T')[0], jenis_keluar: jenisUpper, keterangan: ket }]);
        await supabaseClient.from('pegawai').delete().eq('id_pegawai', id);
        alert(`Sukses mutasi!`); await muatDataDariCloud(); refreshDataState();
    } catch (e) {}
}

window.jalankanSemuaOtomatisasiSistem = function() {
    const inputMasukRS = document.getElementById('masuk_rs');
    const inputTglLahir = document.getElementById('tanggal_lahir');
    const inputBUP = document.getElementById('rentang_bup');
    const inputNIP = document.getElementById('nip');

    if (inputMasukRS && inputMasukRS.value) {
        const masuk = new Date(inputMasukRS.value); const hariIni = new Date();
        let tahun = hariIni.getFullYear() - masuk.getFullYear(); let bulan = hariIni.getMonth() - masuk.getMonth(); let hari = hariIni.getDate() - masuk.getDate();
        if (hari < 0) { hari += new Date(hariIni.getFullYear(), hariIni.getMonth(), 0).getDate(); bulan--; }
        if (bulan < 0) { tahun--; bulan += 12; }
        if (document.getElementById('masa_kerja_rs')) document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan ${hari} Hari`;
    }
    if (inputTglLahir && inputTglLahir.value && inputBUP && inputBUP.value) {
        const bupVal = parseInt(inputBUP.value);
        if (!isNaN(bupVal)) {
            const tglLahir = new Date(inputTglLahir.value);
            const tmtPensiunDate = new Date(tglLahir.getFullYear() + bupVal, tglLahir.getMonth() + 1, 1);
            if (document.getElementById('tmt_pensiun')) document.getElementById('tmt_pensiun').value = `${tmtPensiunDate.getFullYear()}-${String(tmtPensiunDate.getMonth() + 1).padStart(2, '0')}-${String(tmtPensiunDate.getDate()).padStart(2, '0')}`;
        }
    }
    if (inputNIP && inputNIP.value.trim().length >= 8) {
        const nipVal = inputNIP.value.trim();
        if (document.getElementById('tmt_cpns')) document.getElementById('tmt_cpns').value = `${nipVal.substring(0, 4)}-${nipVal.substring(4, 6)}-${nipVal.substring(6, 8)}`;
    }
}
window.hitungMasaKerjaOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTPensiunOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTCPNSOtomatis = () => window.jalankanSemuaOtomatisasiSistem();

function unduhExcel() {
    if (window.dbPegawai.length === 0) return alert('Data kosong.');
    const dataFormatted = window.dbPegawai.map((p, i) => { const row = { "NO": i + 1 }; fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; }); return row; });
    const ws = XLSX.utils.json_to_sheet(dataFormatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pegawai"); XLSX.writeFile(wb, "Data_Karyawan.xlsx");
}
function unduhPDF() {
    if (window.dbPegawai.length === 0) return alert('Data kosong.');
    const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14); doc.text("LAPORAN INDUK KEPEGAWAIAN INSTANSI", 24, 30);
    doc.autoTable({ head: [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'UNIT RUANGAN']], body: window.dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.jabatan||'-', p.ruangan||'-']), startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } }); doc.save("Laporan_Karyawan.pdf");
}
