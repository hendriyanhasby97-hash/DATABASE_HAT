const supabase = supabase.createClient("URL_SUPABASE_ANDA", "KEY_SUPABASE_ANDA");

async function loginUser(email, pass) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, pass });
    if (error) return alert("Login Gagal: " + error.message);
    
    // Simpan data role
    const { data: profile } = await supabase.from('users').select('role').eq('id', data.user.id).single();
    sessionStorage.setItem('role', profile.role);
    window.location.href = 'index.html';
}

function checkAuth() {
    if (!sessionStorage.getItem('role')) window.location.href = 'login.html';
}
