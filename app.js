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

let dbPegawai = [];
let statusEdit = false;
let currentPage = 1;
const rowsPerPage = 20; // 🔥 SETUP: TAMPILAN DATA DIUBAH MENJADI 20 BARIS PER HALAMAN
let dataFilterAktif = [];

// DOM Selector Komponen Utama Form Induk
const mainForm = document.getElementById('main-crud-form');
const tBody = document.getElementById('body-tabel-pegawai');
const inputCari = document.getElementById('input-cari');
const filterStatus = document.getElementById('filter-status');
const filterKelompok = document.getElementById('filter-kelompok');
const btnExcel = document.getElementById('btn-excel');
const btnPdf = document.getElementById('btn-pdf');
const btnPrev = document.getElementById('btn-page-prev');
const btnNext = document.getElementById('btn-page-next');
const pagInfoText = document.getElementById('pagination-text-info');

// =========================================================================
// INITIALIZATION LISTENER (SAAT HALAMAN DIMUAT)
// =========================================================================
document.addEventListener('DOMContentLoaded', async () => {
    // 🛡️ AMBIL ROLE USER DARI WINDOW SESSION PORTAL UTAMA
    const roleSekarang = sessionStorage.getItem('role');
    const btnTambahMaster = document.getElementById('btn-tambah-master-trigger');
    
    // Tampilkan tombol tambah data baru hanya jika masuk sebagai superadmin
    if (btnTambahMaster) {
        btnTambahMaster.style.display = (roleSekarang === 'superadmin') ? 'inline-flex' : 'none';
    }

    // Tarik data awal dari cloud Supabase
    if (tBody) {
        await muatDataDariCloud();
        refreshDataState();
    }

    // Event Listener untuk Fitur Live Pencarian Kata Kunci & Filter Dropdown Baru
    if (inputCari) inputCari.oninput = jalankanPencarianDanFilter;
    if (filterStatus) filterStatus.onchange = jalankanPencarianDanFilter;
    if (filterKelompok) filterKelompok.onchange = jalankanPencarianDanFilter;

    // Listener Aksi Ekspor Berkas & Submit Form
    if (btnExcel) btnExcel.onclick = unduhExcel;
    if (btnPdf) btnPdf.onclick = unduhPDF;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;

    // Listener Kontrol Navigasi Halaman (Pagination)
    if (btnPrev) btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; renderTabelDenganHalaman(); } };
    if (btnNext) btnNext.onclick = () => { const maxPage = Math.ceil(dataFilterAktif.length / rowsPerPage); if(currentPage < maxPage) { currentPage++; renderTabelDenganHalaman(); } };
});

// =========================================================================
// ENGINE KONTROL DATA & REKAP CLOUD SUPABASE
// =========================================================================
async function muatDataDariCloud() {
    try {
        const { data, error } = await supabaseClient.from('pegawai').select('*');
        if (error) throw error;
        dbPegawai = data || [];
    } catch (e) {
        console.error("Gagal sinkronisasi data dari Supabase:", e);
        dbPegawai = [];
    }
}

function refreshDataState() {
    dataFilterAktif = [...dbPegawai];
    currentPage = 1;
    renderTabelDenganHalaman();
}

// 💾 PROSES SIMPAN (INSERT) ATAU PERBARUI (UPDATE) DATA INDUK PEGAWAI
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses...";

    const nikInput = document.getElementById('nik');
    if (nikInput) nikInput.disabled = false; // Buka proteksi lock NIK agar datanya terbaca saat disubmit

    const dataObj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        dataObj[f] = el ? el.value.trim() : '';
    });

    try {
        if (statusEdit) {
            // Mode Perbarui Data Lama
            const { error } = await supabaseClient.from('pegawai').update(dataObj).eq('id_pegawai', dataObj.id_pegawai);
            if (error) throw error;
            alert('Sukses! Perubahan data induk pegawai berhasil disimpan.');
        } else {
            // Mode Daftarkan Pegawai Baru
            dataObj.id_pegawai = 'ID-' + Date.now();
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;
            
            // Masukkan otomatis log ke arsip sekunder (Tabel pegawai_masuk)
            await supabaseClient.from('pegawai_masuk').insert([{
                nik: dataObj.nik, 
                nama: dataObj.nama, 
                jenis_kelamin: dataObj.jenis_kelamin,
                agama: dataObj.agama, 
                bagian: dataObj.ruangan, 
                tmt_masuk: dataObj.masuk_rs, 
                pendidikan: dataObj.jenjang
            }]);
            alert('Sukses! Data pegawai baru berhasil direkam ke pangkalan data cloud.');
        }

        statusEdit = false;
        await muatDataDariCloud();
        refreshDataState();
        if (mainForm) mainForm.reset();
        toggleFormInputMaster();
    } catch (err) {
        console.error(err);
        alert("Gagal memproses data ke server cloud.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾 Simpan Perubahan Berkas";
    }
}

// =========================================================================
// VIEW RENDERER & LOGIKA OTORITAS TOMBOL KONTROL TABEL
// =========================================================================
function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    const roleSekarang = sessionStorage.getItem('role');

    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;"><i class="fa-solid fa-folder-open"></i> Data tidak ditemukan atau kosong.</td></tr>`;
        if (pagInfoText) pagInfoText.textContent = "Menampilkan 0 dari 0 pegawai";
        return;
    }

    const maxPage = Math.ceil(totalData / rowsPerPage);
    if(currentPage > maxPage) currentPage = maxPage;
    
    // Pecah data array berdasarkan chunk 20 baris per halaman
    const dataHalamanIni = dataFilterAktif.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    dataHalamanIni.forEach(p => {
        const tr = document.createElement('tr');
        let tombolKontrolOtoritas = "";
        
        if (roleSekarang === 'admin') {
            // JIKA LOGIN SEBAGAI ADMIN BIASA -> HANYA MUNCUL TOMBOL VIEW (READ-ONLY)
            tombolKontrolOtoritas = `
                <button type="button" class="btn-action" style="background:#0284c7;" onclick="window.parent.bukaModalViewDetailSistem('${p.id_pegawai}')"><i class="fa-solid fa-eye"></i> View</button>
            `;
        } else {
            // JIKA LOGIN SEBAGAI SUPERADMIN -> MUNCUL AKSES KONTROL PENUH MUTLAK
            tombolKontrolOtoritas = `
                <button type="button" class="btn-action" style="background:#0284c7;" onclick="window.parent.bukaModalViewDetailSistem('${p.id_pegawai}')"><i class="fa-solid fa-eye"></i> View</button>
                <button type="button" class="btn-action" style="background:#d97706;" onclick="pemicuEditPegawai('${p.id_pegawai}')"><i class="fa-solid fa-user-pen"></i> Edit</button>
                <button type="button" class="btn-action" style="background:#dc2626;" onclick="mutasiKeluarAksi('${p.id_pegawai}')"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar</button>
            `;
        }

        tr.innerHTML = `
            <td style="font-weight:600;">${p.nik || '-'}</td>
            <td style="font-weight:700; color:#1e3a8a;">${p.nama || '-'}</td>
            <td><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:#dcfce7; color:#15803d; font-weight:600;">${p.status || '-'}</span></td>
            <td>${p.kelompok_pegawai || '-'}</td>
            <td>${p.jabatan || '-'}</td>
            <td>${p.ruangan || '-'}</td>
            <td style="text-align: center; white-space: nowrap;">${tombolKontrolOtoritas}</td>
        `;
        tBody.appendChild(tr);
    });

    if (pagInfoText) {
        pagInfoText.textContent = `Menampilkan ${((currentPage-1)*rowsPerPage)+1}-${Math.min(currentPage*rowsPerPage, totalData)} dari ${totalData} pegawai`;
    }
}

// =========================================================================
// FITUR ENGINE BARU: LIVE COMBINATION FILTER DROPDOWN + SEARCH BAR
// =========================================================================
function jalankanPencarianDanFilter() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    const sttVal = filterStatus.value;
    const klpVal = filterKelompok.value;

    dataFilterAktif = dbPegawai.filter(p => {
        const matchKeyword = (p.nama?.toLowerCase().includes(kataKunci)) || (p.nik?.includes(kataKunci));
        const matchStatus = sttVal === "" ? true : (p.status === sttVal);
        const matchKelompok = klpVal === "" ? true : (p.kelompok_pegawai === klpVal);

        return matchKeyword && matchStatus && matchKelompok;
    });

    currentPage = 1; 
    renderTabelDenganHalaman();
}

// =========================================================================
// ACTION TRIGGER HANDLER (PEMICU TAMPILAN FORM)
// =========================================================================
function bukaFormTambahBaru() {
    statusEdit = false;
    if (mainForm) mainForm.reset();
    
    const idInput = document.getElementById('id_pegawai');
    if (idInput) idInput.value = "";
    
    const nikInput = document.getElementById('nik');
    if (nikInput) nikInput.disabled = false; // Pastikan kolom NIK bisa diketik ulang
    
    const formTitle = document.getElementById('main-form-title');
    if (formTitle) formTitle.innerHTML = `<i class="fa-solid fa-user-plus"></i> Registrasi Record Karyawan Baru (31 Bidang)`;
    
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) {
        wrapper.classList.remove('hide-element');
        window.scrollTo({ top: wrapper.offsetTop - 20, behavior: 'smooth' });
    }
}

function toggleFormInputMaster() {
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.add('hide-element');
}

function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;
    
    // Kunci kolom NIK agar tidak diubah sembarangan saat mengedit data
    if(document.getElementById('nik')) document.getElementById('nik').disabled = true;
    
    fields.forEach(f => {
        const el = document.getElementById(f);
        if (el) el.value = dataPeg[f] || '';
    });
    statusEdit = true;
    
    // Picu kalkulasi otomatisasi penanggalan data yang ditarik
    window.jalankanSemuaOtomatisasiSistem();
    
    document.getElementById('main-form-title').innerHTML = `<i class="fa-solid fa-user-pen"></i> Modifikasi Berkas Karyawan: ${dataPeg.nama}`;
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.remove('hide-element');
}

// MUTASI KELUAR OTOMATIS KE TABEL ARSIP PEGAWAI_KELUAR
async function mutasiKeluarAksi(id) {
    const p = dbPegawai.find(x => x.id_pegawai === id);
    if (!p) return;

    const jenis = prompt(`Masukkan Jenis Keluar untuk Karyawan [${p.nama}]:\n(MUTASI / PENSIUN / RESIGN / LAINNYA)`);
    if (!jenis) return;
    const jenisUpper = jenis.toUpperCase();
    if (!['MUTASI', 'PENSIUN', 'RESIGN', 'LAINNYA'].includes(jenisUpper)) return alert('Jenis keluar tidak valid!');

    const ket = prompt("Masukkan Keterangan Tambahan Alasan Keluar:");
    const tglKeluar = new Date().toISOString().split('T')[0];

    try {
        // 1. Kirim log ke tabel pegawai_keluar
        await supabaseClient.from('pegawai_keluar').insert([{
            nik: p.nik, nama: p.nama, bagian: p.kelompok_jabatan, unit_tugas: p.ruangan, tmt_keluar: tglKeluar, jenis_keluar: jenisUpper, keterangan: ket
        }]);
        // 2. Hapus data dari tabel induk utama kepegawaian
        await supabaseClient.from('pegawai').delete().eq('id_pegawai', id);
        
        alert(`Sukses! Rekaman data ${p.nama} telah resmi dipindahkan ke berkas Karyawan Keluar.`);
        await muatDataDariCloud();
        refreshDataState();
    } catch (err) {
        alert("Gagal memproses mutasi keluar ke database cloud.");
    }
}

// =========================================================================
// CORE ENGINE: OTOMATISASI PENANGGALAN & KALKULASI KEPEGAWAIAN
// =========================================================================
window.jalankanSemuaOtomatisasiSistem = function() {
    const inputMasukRS = document.getElementById('masuk_rs');
    const inputTglLahir = document.getElementById('tanggal_lahir');
    const inputBUP = document.getElementById('rentang_bup');
    const inputNIP = document.getElementById('nip');

    // 1. Otomatisasi Perhitungan Masa Kerja Presisi (Tahun, Bulan, Hari)
    if (inputMasukRS && inputMasukRS.value) {
        const masuk = new Date(inputMasukRS.value); const hariIni = new Date();
        let tahun = hariIni.getFullYear() - masuk.getFullYear(); let bulan = hariIni.getMonth() - masuk.getMonth(); let hari = hariIni.getDate() - masuk.getDate();
        if (hari < 0) { hari += new Date(hariIni.getFullYear(), hariIni.getMonth(), 0).getDate(); bulan--; }
        if (bulan < 0) { tahun--; bulan += 12; }
        if (document.getElementById('masa_kerja_rs')) {
            document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan ${hari} Hari`;
        }
    }

    // 2. Otomatisasi Perhitungan TMT Pensiun (Bulatan Tanggal 1 Bulan Berikutnya)
    if (inputTglLahir && inputTglLahir.value && inputBUP && inputBUP.value) {
        const bupVal = parseInt(inputBUP.value);
        if (!isNaN(bupVal)) {
            const tglLahir = new Date(inputTglLahir.value);
            const tmtPensiunDate = new Date(tglLahir.getFullYear() + bupVal, tglLahir.getMonth() + 1, 1);
            const yyyy = tmtPensiunDate.getFullYear(); const mm = String(tmtPensiunDate.getMonth() + 1).padStart(2, '0'); const dd = String(tmtPensiunDate.getDate()).padStart(2, '0');
            if (document.getElementById('tmt_pensiun')) {
                document.getElementById('tmt_pensiun').value = `${yyyy}-${mm}-${dd}`;
            }
        }
    }

    // 3. Otomatisasi Penarikan Data TMT CPNS Langsung Dari Struktur Digit NIP Karyawan
    if (inputNIP && inputNIP.value.trim().length >= 8) {
        const nipVal = inputNIP.value.trim();
        const tahunStr = nipVal.substring(0, 4); const bulanStr = nipVal.substring(4, 6); const hariStr = nipVal.substring(6, 8);
        if (!isNaN(parseInt(tahunStr)) && !isNaN(parseInt(bulanStr)) && !isNaN(parseInt(hariStr))) {
            if (parseInt(bulanStr) >= 1 && parseInt(bulanStr) <= 12 && parseInt(hariStr) >= 1 && parseInt(hariStr) <= 31) {
                if (document.getElementById('tmt_cpns')) {
                    document.getElementById('tmt_cpns').value = `${tahunStr}-${bulanStr}-${hariStr}`;
                }
            }
        }
    }
}

window.hitungMasaKerjaOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTPensiunOtomatis = () => window.jalankanSemuaOtomatisasiSistem();
window.hitungTMTCPNSOtomatis = () => window.jalankanSemuaOtomatisasiSistem();

// =========================================================================
// EKSPOR LAPORAN UTILITY (EXCEL & PDF)
// =========================================================================
function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data kosong, ekspor dibatalkan.');
    const dataFormatted = dbPegawai.map((p, i) => { const row = { "NO": i + 1 }; fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; }); return row; });
    const ws = XLSX.utils.json_to_sheet(dataFormatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pegawai"); XLSX.writeFile(wb, "Data_Karyawan.xlsx");
}

function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data kosong, ekspor dibatalkan.');
    const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14); doc.text("LAPORAN INDUK KEPEGAWAIAN INSTANSI", 24, 30);
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'UNIT RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.jabatan||'-', p.ruangan||'-']);
    doc.autoTable({ head: headerPDF, body: isiPDF, startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } }); doc.save("Laporan_Karyawan.pdf");
}
