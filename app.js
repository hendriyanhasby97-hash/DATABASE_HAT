/**
 * SISTEM SINERGI ADMIN - APP.JS MASTER
 * Fungsi: Penanganan Supabase, CRUD, dan Otomatisasi Penanggalan
 */

// 1. KONFIGURASI
const SUPABASE_URL = "URL_SUPABASE_ANDA"; // Ganti dengan URL Anda
const SUPABASE_KEY = "KEY_SUPABASE_ANDA"; // Ganti dengan KEY Anda
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const MASTER_FIELDS = [
    'id_pegawai', 'nik', 'nama', 'nip', 'status', 'kelompok_pegawai', 'kelompok_jabatan',
    'gol', 'tmt_pangkat', 'tmt_berikutnya', 'jabatan', 'jenis_kelamin', 'agama', 
    'rentang_bup', 'tmt_pensiun', 'tmt_cpns', 'masuk_rs', 'masa_kerja_rs', 
    'tempat_lahir', 'tanggal_lahir', 'status_keluarga', 'alamat', 'jenjang', 
    'fakultas', 'jurusan', 'ruangan', 'no_bpjsn', 'no_bpjsket_taspen', 'npwp', 'email', 'no_telp'
];

// 2. OTOMATISASI CALCULATOR (Global Helper)
window.jalankanOtomatisasi = () => {
    // Hitung Masa Kerja
    const masuk = document.getElementById('masuk_rs')?.value;
    if (masuk) {
        const d = new Date(masuk); const now = new Date();
        let th = now.getFullYear() - d.getFullYear();
        let bl = now.getMonth() - d.getMonth();
        if (bl < 0) { th--; bl += 12; }
        const el = document.getElementById('masa_kerja_rs');
        if (el) el.value = `${th} Tahun ${bl} Bulan`;
    }
    // Hitung Pensiun
    const lahir = document.getElementById('tanggal_lahir')?.value;
    const bup = document.getElementById('rentang_bup')?.value;
    if (lahir && bup) {
        const d = new Date(lahir);
        d.setFullYear(d.getFullYear() + parseInt(bup));
        const el = document.getElementById('tmt_pensiun');
        if (el) el.value = d.toISOString().split('T')[0];
    }
};

// 3. FUNGSI CRUD UNIVERSAL (Bisa dipakai di semua halaman)
async function fetchData(tableName, tbodyId, renderFunction) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    try {
        const { data, error } = await supabase.from(tableName).select('*');
        if (error) throw error;
        
        if (data.length === 0) {
            tbody.innerHTML = "<tr><td colspan='10' style='text-align:center;'>Data Kosong</td></tr>";
        } else {
            renderFunction(data); // Memanggil fungsi render spesifik halaman
        }
    } catch (e) {
        tbody.innerHTML = `<tr><td colspan='10' style='color:red;'>Error: ${e.message}</td></tr>`;
        console.error(e);
    }
}

async function saveRecord(tableName, payload) {
    try {
        const { error } = await supabase.from(tableName).insert([payload]);
        if (error) throw error;
        alert("Data berhasil disimpan!");
        location.reload();
    } catch (e) {
        alert("Gagal menyimpan: " + e.message);
    }
}

// 4. INITIATION
document.addEventListener('DOMContentLoaded', () => {
    // Tambahkan listener otomatis pada input tanggal jika ada
    document.querySelectorAll('input[type="date"]').forEach(el => {
        el.addEventListener('change', window.jalankanOtomatisasi);
    });
});
