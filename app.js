// Konfigurasi Fields Utama Tabel Induk Pegawai
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
const inputMasukRS = document.getElementById('masuk_rs');
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
    if (inputMasukRS) inputMasukRS.onchange = hitungMasaKerjaOtomatis;
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

// 📊 HITUNG METRIK DASHBOARD UTAMA
async function hitungStatistikDashboard() {
    if (document.getElementById('stat-total-pegawai')) {
        document.getElementById('stat-total-pegawai').textContent = dbPegawai.length;
        document.getElementById('stat-pegawai-aktif').textContent = dbPegawai.filter(p => p.status?.toLowerCase() === 'aktif').length;
        
        // Ambil data sekunder untuk counter dashboard
        const { count: totalCuti } = await supabaseClient.from('pegawai').select('*', { count: 'exact', head: true }).eq('status', 'Cuti');
        const { count: totalMasuk } = await supabaseClient.from('pegawai_masuk').select('*', { count: 'exact', head: true });
        
        document.getElementById('stat-total-cuti').textContent = totalCuti || 0;
        document.getElementById('stat-surat-masuk').textContent = totalMasuk || 0;
    }
}

// 📝 ACTION SAVE & UPDATE DATA INDUK PEGAWAI
async function simpanFormPegawai(e) {
    e.preventDefault();
    const saveBtn = mainForm.querySelector('button[type="submit"]');
    saveBtn.disabled = true;
    saveBtn.innerHTML = "<i class='fa-solid fa-spinner fa-spin'></i> Memproses...";

    const dataObj = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        dataObj[f] = el ? el.value.trim() : '';
    });

    try {
        if (statusEdit) {
            const { error } = await supabaseClient.from('pegawai').update(dataObj).eq('id_pegawai', dataObj.id_pegawai);
            if (error) throw error;
            alert('Data pegawai sukses diperbarui!');
        } else {
            dataObj.id_pegawai = 'ID-' + Date.now();
            const { error } = await supabaseClient.from('pegawai').insert([dataObj]);
            if (error) throw error;
            
            // Otomatis masukkan ke tabel histori pegawai_masuk jika data baru ditambah
            await supabaseClient.from('pegawai_masuk').insert([{
                nik: dataObj.nik, nama: dataObj.nama, jenis_kelamin: dataObj.jenis_kelamin,
                agama: dataObj.agama, bagian: dataObj.ruangan, tmt_masuk: dataObj.masuk_rs, pendidikan: dataObj.jenjang
            }]);
            alert('Data pegawai baru & histori masuk berhasil direkam!');
        }

        await muatDataDariCloud();
        hitungStatistikDashboard();
        refreshDataState();
        toggleFormInput();
    } catch (err) {
        console.error(err);
        alert("Gagal memproses data ke server cloud.");
    } finally {
        saveBtn.disabled = false;
        saveBtn.innerHTML = "💾 Simpan Berkas";
    }
}

// 👥 RENDERING UTAMA DAFTAR PEGAWAI INDUK
function renderTabelDenganHalaman() {
    if (!tBody) return;
    tBody.innerHTML = '';
    const totalData = dataFilterAktif.length;
    
    if (totalData === 0) {
        tBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#94a3b8;"><i class="fa-solid fa-folder-open"></i> Data Kosong.</td></tr>`;
        return;
    }

    const maxPage = Math.ceil(totalData / rowsPerPage);
    if(currentPage > maxPage) currentPage = maxPage;
    const dataHalamanIni = dataFilterAktif.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);

    dataHalamanIni.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="font-weight:600;">${p.nik || '-'}</td>
            <td style="font-weight:700; color:#1e3a8a;">${p.nama || '-'}</td>
            <td><span style="padding:4px 8px; border-radius:4px; font-size:12px; background:#dcfce7; color:#15803d;">${p.status || '-'}</span></td>
            <td>${p.kelompok_pegawai || '-'}</td>
            <td>${p.jabatan || '-'}</td>
            <td>${p.ruangan || '-'}</td>
            <td style="text-align: center;">
                <button type="button" class="btn-action" style="background:#d97706;" onclick="pemicuEditPegawai('${p.id_pegawai}')"><i class="fa-solid fa-user-pen"></i> Edit</button>
                <button type="button" class="btn-action" style="background:#dc2626;" onclick="mutasiKeluarAksi('${p.id_pegawai}')"><i class="fa-solid fa-arrow-right-from-bracket"></i> Keluar</button>
            </td>
        `;
        tBody.appendChild(tr);
    });

    if (pagInfoText) pagInfoText.textContent = `Menampilkan ${((currentPage-1)*rowsPerPage)+1}-${Math.min(currentPage*rowsPerPage, totalData)} dari ${totalData} pegawai`;
}

// 🚪 PROSES PEGAWAI KELUAR (OTOMATIS PINDAH TABEL HISTORI)
async function mutasiKeluarAksi(id) {
    const p = dbPegawai.find(x => x.id_pegawai === id);
    if (!p) return;

    const jenis = prompt(`Masukkan Jenis Keluar untuk ${p.nama}:\n(MUTASI / PENSIUN / RESIGN / LAINNYA)`).toUpperCase();
    if (!['MUTASI', 'PENSIUN', 'RESIGN', 'LAINNYA'].includes(jenis)) return alert('Jenis keluar tidak valid! Pembatalan sistem.');

    const ket = prompt("Masukkan Keterangan Tambahan Alasan Keluar:");
    const tglKeluar = new Date().toISOString().split('T')[0];

    try {
        // 1. Rekam ke database pegawai_keluar
        await supabaseClient.from('pegawai_keluar').insert([{
            nik: p.nik, nama: p.nama, bagian: p.kelompok_jabatan, unit_tugas: p.ruangan, tmt_keluar: tglKeluar, jenis_keluar: jenis, keterangan: ket
        }]);

        // 2. Hapus data dari database pegawai utama
        await supabaseClient.from('pegawai').delete().eq('id_pegawai', id);

        alert(`Sukses! ${p.nama} telah dipindahkan ke daftar Pegawai Keluar.`);
        await muatDataDariCloud();
        hitungStatistikDashboard();
        refreshDataState();
    } catch (err) {
        alert("Gagal memproses mutasi keluar.");
    }
}

// 🟢 LOGIKA PENANGGUNG JAWAB MENU ROUTER ARSIP LAIN (STR, SIK, PEGAWAI MASUK/KELUAR)
async function muatTabelSpesifik(namaTabel, idTbodyTarget, headersArray, rowBuilderFunc) {
    const tbody = document.getElementById(idTbodyTarget);
    if (!tbody) return;
    tbody.innerHTML = `<tr><td colspan="${headersArray.length}" style="text-align:center; padding:20px;">Mengunduh arsip...</td></tr>`;
    
    try {
        const { data, error } = await supabaseClient.from(namaTabel).select('*');
        if (error) throw error;
        
        tbody.innerHTML = '';
        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="${headersArray.length}" style="text-align:center; padding:20px; color:#94a3b8;">Arsip Berkas Kosong.</td></tr>`;
            return;
        }

        data.forEach((row, index) => {
            const tr = document.createElement('tr');
            rowBuilderFunc(tr, row, index);
            tbody.appendChild(tr);
        });
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan="${headersArray.length}" style="text-align:center; color:red; padding:20px;">Gagal memuat berkas arsip cloud.</td></tr>`;
    }
}

// 🕒 UTILITY HITUNG SISA WAKTU SIK (WARNA ALARM WARNING KUNING/MERAH)
function hitungSisaWaktuSIK(tglBerakhirStr, elementTr) {
    if (!tglBerakhirStr) return "-";
    const akhir = new Date(tglBerakhirStr);
    const sekarang = new Date();
    
    const selisihWaktu = akhir - sekarang;
    const totalHari = Math.floor(selisihWaktu / (1000 * 60 * 60 * 24));
    
    if (totalHari <= 0) {
        elementTr.style.backgroundColor = "#fee2e2"; // Merah pekat - Mati/Expired
        return "EXPIRED";
    }

    // Hitung konversi Tahun, Bulan, Hari
    const tahun = Math.floor(totalHari / 365);
    const sisaHariDariTahun = totalHari % 365;
    const bulan = Math.floor(sisaHariDariTahun / 30);
    const hari = sisaHariDariTahun % 30;

    // Logika Alarm Warna Warning sesuai request prompt user
    if (totalHari <= 90) {
        elementTr.style.backgroundColor = "#fee2e2"; // Merah (Kurang dari 3 bulan)
        elementTr.style.color = "#b91c1c";
    } else if (totalHari <= 180) {
        elementTr.style.backgroundColor = "#fef3c7"; // Kuning (Kurang dari 6 bulan)
        elementTr.style.color = "#b45309";
    }

    return `${tahun} Thn ${bulan} Bln ${hari} Hari`;
}

// 📝 HOOKS ROUTER GLOBAL UNTUK MENANGKAP KLIK SIDEBAR DI INDEX.HTML MENGISI CONTAINER ARSIP
window.switchViewOriginal = window.switchView; 
window.switchView = function(viewId, element) {
    if (typeof window.switchViewOriginal === 'function') {
        window.switchViewOriginal(viewId, element);
    }
    
    // Intersepsi Pengisian Data otomatis saat menu diklik admin
    if (viewId === 'view-pegawai-masuk') {
        muatTabelSpesifik('pegawai_masuk', 'body-tabel-masuk', [1,2,3,4,5,6,7], (tr, r) => {
            tr.innerHTML = `<td>${r.nik}</td><td><strong>${r.nama}</strong></td><td>${r.jenis_kelamin}</td><td>${r.agama}</td><td>${r.bagian}</td><td>${r.tmt_masuk}</td><td>${r.pendidikan}</td>`;
        });
    }
    else if (viewId === 'view-pegawai-keluar') {
        muatTabelSpesifik('pegawai_keluar', 'body-tabel-keluar', [1,2,3,4,5,6,7], (tr, r) => {
            tr.innerHTML = `<td>${r.nik}</td><td><strong>${r.nama}</strong></td><td>${r.bagian}</td><td>${r.unit_tugas}</td><td>${r.tmt_keluar}</td><td><span style="color:red; font-weight:700;">${r.jenis_keluar}</span></td><td>${r.keterangan || '-'}</td>`;
        });
    }
    else if (viewId === 'view-str') {
        muatTabelSpesifik('berkas_str', 'body-tabel-str', [1,2,3,4,5,6,7], (tr, r) => {
            tr.innerHTML = `<td>${r.nik}</td><td><strong>${r.nama}</strong></td><td>${r.bidang}</td><td>${r.no_str}</td><td>${r.tgl_terbit}</td><td>${r.tgl_berakhir}</td><td><a href="${r.lampiran_url || '#'}" target="_blank" class="btn" style="padding:4px 8px; font-size:12px; background:#475569; color:white;"><i class="fa-solid fa-file-pdf"></i> Lihat</a></td>`;
        });
    }
    else if (viewId === 'view-sik') {
        muatTabelSpesifik('berkas_sik', 'body-tabel-sik', [1,2,3,4,5,6,7,8], (tr, r) => {
            const masaAktifTeks = hitungSisaWaktuSIK(r.tgl_berakhir, tr);
            tr.innerHTML = `<td>${r.nik}</td><td><strong>${r.nama}</strong></td><td>${r.bidang}</td><td>${r.no_sip}</td><td>${r.tgl_terbit}</td><td>${r.tgl_berakhir}</td><td style="font-weight:700;">${masaAktifTeks}</td><td><a href="${r.lampiran_url || '#'}" target="_blank" class="btn" style="padding:4px 8px; font-size:12px; background:#475569; color:white;"><i class="fa-solid fa-file-pdf"></i> Lihat</a></td>`;
        });
    }
};

// Fungsi General Komponen Sampingan 
function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;
    fields.forEach(f => { const el = document.getElementById(f); if (el) el.value = dataPeg[f] || ''; });
    statusEdit = true;
    const wrapper = document.getElementById('form-master-wrapper');
    if (wrapper) wrapper.classList.remove('hide-element');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}
function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase().trim();
    dataFilterAktif = dbPegawai.filter(p => (p.nama?.toLowerCase().includes(kataKunci)) || (p.nik?.includes(kataKunci)));
    currentPage = 1; renderTabelDenganHalaman();
}
function hitungMasaKerjaOtomatis() {
    if (!this.value) return;
    const masuk = new Date(this.value); const hariIni = new Date();
    let tahun = hariIni.getFullYear() - masuk.getFullYear(); let bulan = hariIni.getMonth() - masuk.getMonth();
    if (bulan < 0) { tahun--; bulan += 12; }
    if (document.getElementById('masa_kerja_rs')) document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan`;
}
function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Kosong.');
    const dataFormatted = dbPegawai.map((p, i) => { const row = { "NO": i + 1 }; fields.forEach(f => { row[f.replace(/_/g, ' ').toUpperCase()] = p[f] || '-'; }); return row; });
    const ws = XLSX.utils.json_to_sheet(dataFormatted); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Pegawai"); XLSX.writeFile(wb, "Data_Karyawan.xlsx");
}
function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Kosong.');
    const { jsPDF } = window.jspdf; const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(14); doc.text("LAPORAN INDUK KEPEGAWAIAN", 24, 30);
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'UNIT RUANGAN']];
    const isiPDF = dbPegawai.map(p => [p.nik||'-', p.nama||'-', p.status||'-', p.kelompok_pegawai||'-', p.jabatan||'-', p.ruangan||'-']);
    doc.autoTable({ head: headerPDF, body: isiPDF, startY: 50, styles: { fontSize: 10 }, headStyles: { fillColor: [30, 41, 59] } }); doc.save("Laporan_Karyawan.pdf");
}
