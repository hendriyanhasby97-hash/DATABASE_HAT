// Konfigurasi Kredensial Supabase
const SUPABASE_URL = "URL_SUPABASE_ANDA";
const SUPABASE_KEY = "KEY_SUPABASE_ANDA";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Global
let currentData = [];
let currentPage = 1;
const rowsPerPage = 15; // Setelan 15 Baris per Halaman

// Fungsi Otomatisasi 31 Field
window.hitungOtomatis = () => {
    const lahir = document.getElementById('tanggal_lahir')?.value;
    const bup = parseInt(document.getElementById('rentang_bup')?.value);
    const nip = document.getElementById('nip')?.value;

    if (lahir && bup) {
        const d = new Date(lahir);
        d.setFullYear(d.getFullYear() + bup);
        document.getElementById('tmt_pensiun').value = d.toISOString().split('T')[0];
    }
    if (nip && nip.length >= 8) {
        document.getElementById('tmt_cpns').value = `${nip.substring(0,4)}-${nip.substring(4,6)}-${nip.substring(6,8)}`;
    }
};

// Fungsi Universal Save (Gunakan untuk Master & Riwayat)
async function saveToDatabase(tableName, payload, idField) {
    const { error } = await supabaseClient.from(tableName).upsert([payload]);
    if (error) alert("Gagal: " + error.message);
    else { alert("Data Tersimpan!"); location.reload(); }
}

// Render Paginasi 15 Baris
function renderTable(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    const start = (currentPage - 1) * rowsPerPage;
    const paginated = data.slice(start, start + rowsPerPage);
    
    // Logika render tabel tergantung pada isi data
    // (Contoh untuk daftar pegawai)
    tbody.innerHTML = paginated.map(p => `
        <tr>
            <td>${p.nik || '-'}</td>
            <td>${p.nama || '-'}</td>
            <td>${p.status || '-'}</td>
            <td><button onclick="editData('${p.id_pegawai}')">Edit</button></td>
        </tr>
    `).join('');
}

// Pemicu Update otomatis jika ada perubahan
document.addEventListener('DOMContentLoaded', async () => {
    // Tambahkan cek sesi login sederhana
    if (!sessionStorage.getItem('role') && !location.href.includes('login.html')) {
        location.href = 'login.html';
    }
});
