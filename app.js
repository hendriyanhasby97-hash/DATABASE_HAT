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

window.dbPegawai = [];
let statusEdit = false;
let currentPage = 1;
const rowsPerPage = 20; 
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

document.addEventListener('DOMContentLoaded', async () => {
    const roleSekarang = sessionStorage.getItem('role');
    const btnTambahMaster = document.getElementById('btn-tambah-master-trigger');
    
    if (btnTambahMaster) {
        btnTambahMaster.style.display = (roleSekarang === 'superadmin') ? 'inline-flex' : 'none';
    }

    if (tBody) {
        await muatDataDariCloud();
        refreshDataState();
    }

    if (inputCari) inputCari.oninput = jalankanPencarianDanFilter;
    if (filterStatus) filterStatus.onchange = jalankanPencarianDanFilter;
    if (filterKelompok) filterKelompok.onchange = jalankanPencarianDanFilter;

    if (btnExcel) btnExcel.onclick = unduhExcel;
    if (btnPdf) btnPdf.onclick = unduhPDF;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;

    if (btnPrev) btnPrev.onclick = () => { if(currentPage > 1) { currentPage--; renderTabelDenganHalaman(); } };
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

function refreshDataState() {
    dataFilterAktif = [...window.dbPegawai];
    currentPage = 1;
    renderTabelDenganHalaman();
}

async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses...";

    const nikInput = document.getElementById('nik');
    if (nikInput) nikInput.disabled = false;

    const dataObj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        dataObj[f] = el ? el.value.trim() : '';
    });

    try {
        if (statusEdit) {
            const { error } = await supabaseClient.from('pegawai').update(dataObj).eq('id_pegawai', dataObj.id_pegawai);
            if (error) throw error;
            alert('Sukses! Perubahan data induk karyawan berhasil disimpan.');
        } else {
            dataObj.id_pegawai = 'ID-' + Date.now();
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;
            
            await supabaseClient.from('pegawai_masuk').insert([{
                nik: dataObj.nik, nama: dataObj.nama, jenis_kelamin: dataObj.jenis_kelamin,
                agama: dataObj.agama, bagian: dataObj.ruangan, tmt_masuk: dataObj.masuk_rs, pendidikan: dataObj.jenjang
            }]);
            alert('Sukses! Record data pegawai baru berhasil direkam ke cloud.');
        }

        statusEdit = false;
        await muatDataDariCloud();
        refreshDataState();
        if (mainForm) mainForm.reset();
        toggleFormInputMaster();
    } catch (err) {
        alert("Gagal memproses data ke server cloud.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾 Simpan Perubahan Berkas";
    }
}

function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    const roleSekarang = sessionStorage.getItem('role');

    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;"><i class="fa-solid fa-folder-open"></i> Data Kosong / Tidak Ditemukan.</td></tr>`;
        if (pagInfoText) pagInfoText.textContent = "Menampilkan 0 dari 0 pegawai";
        return;
    }

    const maxPage = Math.ceil(totalData / rowsPerPage);
    if(currentPage > maxPage) currentPage = maxPage;
    const dataHalamanIni = dataFilterAktif.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    dataHalamanIni.forEach(p => {
        const tr = document.createElement('tr');
        let tombolKontrolOtoritas = "";
        
        if (roleSekarang === 'admin') {
            tombolKontrolOtoritas = `
                <button type="button" class="btn-action" style="background:#0284c7;" onclick="window.parent.bukaModalViewDetailSistem('${p.id_pegawai}')"><i class="fa-solid fa-eye"></i> View</button>
            `;
        } else {
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

    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${((currentPage-1)*rowsPerPage)+1}-${Math.min(currentPage*rowsPerPage, totalData)} dari ${totalData} pegawai`;
    
    // 🔥 BEGITU SELESAI RENDER HALAMAN, KIRIM JUGA RE-SYNC DATA KE PARENT WINDOW
    if (window.parent && typeof window.parent.setCacheDataPegawaiSistem === 'function') {
        window.parent.setCacheDataPegawaiSistem(window.dbPegawai);
    }
}

function jalankanPencarianDanFilter() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    const sttVal = filterStatus.value;
    const klpVal = filterKelompok.value;

    dataFilterAktif = window.dbPegawai.filter(p => {
        const matchKeyword = (p.nama?.toLowerCase().includes(kataKunci)) || (p.nik?.includes(kataKunci));
        const matchStatus = sttVal === "" ? true : (p.status === sttVal);
        const matchKelompok = klpVal === "" ? true : (p.kelompok_pegawai === klpVal);
        return matchKeyword && matchStatus && matchKelompok;
    });

    currentPage = 1; 
    renderTabelDenganHalaman();
}

function bukaFormTambahBaru() {
    statusEdit = false;
    if (mainForm) mainForm.reset();
    if (document.getElementById('id_pegawai')) document.getElementById('id_pegawai').value = "";
    if (document.getElementById('nik')) document.getElementById('nik').disabled = false;
    
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
