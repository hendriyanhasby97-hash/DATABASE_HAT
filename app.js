// Konfigurasi Supabase
const SUPABASE_URL = "URL_SUPABASE_ANDA";
const SUPABASE_KEY = "KEY_SUPABASE_ANDA";
const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State Global
let currentData = [];
let currentPage = 1;
const rowsPerPage = 15;

// 1. Fungsi Utama Ambil Data (Universal)
async function fetchData(tableName, renderCallback) {
    const { data, error } = await supabase.from(tableName).select('*');
    if (error) {
        console.error("Gagal ambil data:", error);
        alert("Gagal koneksi ke Cloud. Cek Policy RLS di Supabase!");
        return [];
    }
    return data || [];
}

// 2. Render Paginasi
function renderTable(data, tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;
    
    // Hitung posisi data
    const start = (currentPage - 1) * rowsPerPage;
    const end = start + rowsPerPage;
    const paginated = data.slice(start, end);
    
    // Render baris
    tbody.innerHTML = paginated.map(p => `
        <tr>
            <td>${p.nik || '-'}</td>
            <td>${p.nama || '-'}</td>
            <td>${p.status || '-'}</td>
            <td>
                <button onclick="viewDRH('${p.id_pegawai}')">View DRH</button>
            </td>
        </tr>
    `).join('');

    document.getElementById('page-info').innerText = `Halaman ${currentPage} dari ${Math.ceil(data.length / rowsPerPage)}`;
}

// 3. View DRH (Lengkap)
async function viewDRH(id) {
    const modal = document.getElementById('modal-drh');
    modal.style.display = 'block';
    
    // Ambil semua data riwayat
    const [p, edu, jab, pkt] = await Promise.all([
        supabase.from('pegawai').select('*').eq('id_pegawai', id).single(),
        supabase.from('riwayat_pendidikan').select('*').eq('id_pegawai', id),
        supabase.from('riwayat_jabatan').select('*').eq('id_pegawai', id),
        supabase.from('riwayat_pangkat').select('*').eq('id_pegawai', id)
    ]);
    
    // Isi Modal
    document.getElementById('drh-nama').innerText = p.data.nama;
    document.getElementById('drh-pendidikan').innerHTML = edu.data.map(e => `<li>${e.jenjang_pendidikan} - ${e.nama_institusi}</li>`).join('');
    document.getElementById('drh-jabatan').innerHTML = jab.data.map(j => `<li>${j.nama_jabatan}</li>`).join('');
}
