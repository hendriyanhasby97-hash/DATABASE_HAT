// Master Array Fields Lengkap Terkini (31 Parameter)
const fields = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

let dbPegawai = JSON.parse(localStorage.getItem('pegawai_storage_db')) || [];
let statusEdit = false;

// DOM Elemen Selector
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

// Jalankan sistem utama saat halaman siap
document.addEventListener('DOMContentLoaded', () => {
    renderTabel();

    if (btnToggle) btnToggle.onclick = toggleFormAksi;
    if (btnTutupForm) btnTutupForm.onclick = toggleFormAksi;
    if (btnTutupDetail) btnTutupDetail.onclick = tutupPanelDetail;
    if (inputCari) inputCari.oninput = jalankanPencarian;
    if (inputMasukRS) inputMasukRS.onchange = hitungMasaKerjaOtomatis;
    if (btnExcel) btnExcel.onclick = unduhExcel;
    if (btnPdf) btnPdf.onclick = unduhPDF;
    if (mainForm) mainForm.onsubmit = simpanFormPegawai;
    if (btnImportExcel) btnImportExcel.onclick = jalankanProsesImportExcel;
});

// Kontrol Buka/Tutup Form Input
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

// Simpan Data (Aksi Tambah / Perbarui)
function simpanFormPegawai(e) {
    e.preventDefault();
    const data = {};
    fields.forEach(f => {
        const el = document.getElementById(f);
        data[f] = el ? el.value.trim() : '';
    });

    if (statusEdit) {
        const index = dbPegawai.findIndex(x => x.id_pegawai === data.id_pegawai);
        if (index !== -1) dbPegawai[index] = data;
        alert('Data pegawai sukses diperbarui!');
    } else {
        data.id_pegawai = 'ID-' + Date.now();
        dbPegawai.push(data);
        alert('Data pegawai baru sukses disimpan!');
    }

    simpanDatabase();
    renderTabel();
    toggleFormAksi();
}

// Render data array ke tabel ringkas di halaman depan
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
}

// Tampilkan semua detail rincian data (31 parameter) di bawah tabel
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

// Pemicu Tombol Edit Data Pegawai
function pemicuEditPegawai(id) {
    const dataPeg = dbPegawai.find(x => x.id_pegawai === id);
    if (!dataPeg) return;

    fields.forEach(f => {
        const element = document.getElementById(f);
        if (element) element.value = dataPeg[f] || '';
    });
    statusEdit = true;
    
    if (wrapperForm.classList.contains('hide-element')) {
        wrapperForm.classList.remove('hide-element');
        btnToggle.textContent = "❌ Sembunyikan Form";
    }
    window.scrollTo({ top: wrapperForm.offsetTop - 20, behavior: 'smooth' });
}

// Eksekusi Hapus Permanen
function eksekusiHapusPegawai(id) {
    if (confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        dbPegawai = dbPegawai.filter(x => x.id_pegawai !== id);
        simpanDatabase();
        renderTabel();
        tutupPanelDetail();
    }
}

// Fungsi Pencarian Filter nama / NIK
function jalankanPencarian() {
    const kataKunci = inputCari.value.toLowerCase();
    const hasilFilter = dbPegawai.filter(p => 
        (p.nama && p.nama.toLowerCase().includes(kataKunci)) || 
        (p.nik && p.nik.includes(kataKunci))
    );
    renderTabel(hasilFilter);
}

// Auto Hitung Masa Kerja
function hitungMasaKerjaOtomatis() {
    if (!this.value) return;
    const masuk = new Date(this.value);
    const hariIni = new Date();
    let tahun = hariIni.getFullYear() - masuk.getFullYear();
    let bulan = hariIni.getMonth() - masuk.getMonth();
    if (bulan < 0) { tahun--; bulan += 12; }
    document.getElementById('masa_kerja_rs').value = `${tahun} Tahun ${bulan} Bulan`;
}

function resetStrukturForm() {
    mainForm.reset();
    document.getElementById('id_pegawai').value = '';
    statusEdit = false;
}

function simpanDatabase() { 
    localStorage.setItem('pegawai_storage_db', JSON.stringify(dbPegawai)); 
}

// Unduh berkas format Excel (.xlsx)
function unduhExcel() {
    if (dbPegawai.length === 0) return alert('Data kosong, tidak bisa ekspor Excel.');
    
    const dataFormatted = dbPegawai.map((p, i) => {
        const row = { "NO": i + 1 };
        fields.forEach(f => {
            const labelClean = f.replace(/_/g, ' ').toUpperCase();
            row[labelClean] = p[f] || '-';
        });
        return row;
    });

    const ws = XLSX.utils.json_to_sheet(dataFormatted);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Database Pegawai");
    XLSX.writeFile(wb, "Data_Pegawai_Lengkap.xlsx");
}

// Cetak berkas format PDF (.pdf)
function unduhPDF() {
    if (dbPegawai.length === 0) return alert('Data kosong, tidak bisa cetak PDF.');
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('l', 'pt', 'a4');
    doc.setFontSize(16);
    doc.text("LAPORAN RINGKASAN DATA PEGAWAI", 24, 30);
    
    const headerPDF = [['NIK', 'NAMA PEGAWAI', 'STATUS', 'KELOMPOK', 'JABATAN', 'MASUK RS', 'RUANGAN']];
    const isiPDF = dbPegawai.map(p => [
        p.nik || '-', 
        p.nama || '-', 
        p.status || '-', 
        p.kelompok_pegawai || '-',
        p.kelompok_jabatan || '-', 
        p.masuk_rs || '-', 
        p.ruangan || '-'
    ]);
    
    doc.autoTable({
        head: headerPDF,
        body: isiPDF,
        startY: 50,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [30, 41, 59] }
    });
    doc.save("Laporan_Ringkas_Pegawai.pdf");
}

// Logika Unggah & Pemrosesan File Excel (Import Data)
function jalankanProsesImportExcel() {
    const file = inputFileExcel.files[0];
    if (!file) {
        alert('Silakan tentukan berkas Excel (.xlsx / .xls) yang ingin diunggah!');
        return;
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetPertama = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetPertama];
        const excelRows = XLSX.utils.sheet_to_json(worksheet, { raw: false });

        if (excelRows.length === 0) {
            alert('Proses dibatalkan, file Excel tidak memuat baris data.');
            return;
        }

        let totalBarisSukses = 0;

        excelRows.forEach(row => {
            const dataBaru = {};
            fields.forEach(f => {
                const labelAlternatif = f.replace(/_/g, ' ').toLowerCase();
                const keyTerdeteksi = Object.keys(row).find(k => 
                    k.toLowerCase().trim() === f.toLowerCase() || 
                    k.toLowerCase().trim() === labelAlternatif
                );
                dataBaru[f] = keyTerdeteksi ? row[keyTerdeteksi].toString().trim() : '';
            });

            if (!dataBaru.id_pegawai) {
                dataBaru.id_pegawai = 'ID-' + Date.now() + Math.floor(Math.random() * 100);
            }

            // Aturan Minimal: Wajib punya NIK dan Nama agar valid masuk database
            if (dataBaru.nik && dataBaru.nama) {
                const indexDuplikat = dbPegawai.findIndex(x => x.nik === dataBaru.nik);
                if (indexDuplikat !== -1) {
                    dbPegawai[indexDuplikat] = dataBaru; // Timpa data lama jika NIK sama
                } else {
                    dbPegawai.push(dataBaru); // Tambah baru jika NIK belum ada
                }
                totalBarisSukses++;
            }
        });

        simpanDatabase();
        renderTabel();
        inputFileExcel.value = ''; // bersihkan input file
        alert(`Sukses memproses file Excel!\nSebanyak ${totalBarisSukses} data pegawai berhasil dimasukkan/diperbarui.`);
    };
    reader.readAsArrayBuffer(file);
}
