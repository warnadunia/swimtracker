// src/supabase.js
// MOCKING SUPABASE CLIENT UNTUK TRANSISI V3 -> TiDB

console.warn("⚠️ File lain masih memanggil Supabase SDK yang sudah dinonaktifkan di V3.");

// Mengembalikan object tiruan agar script lama tidak langsung pecah saat loading awal
export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: null }, error: null }),
    signUp: async () => ({ data: {}, error: new Error("Gunakan API TiDB /api/auth/register bray!") }),
    signInWithPassword: async () => ({ data: {}, error: new Error("Gunakan API TiDB /api/auth/login bray!") }),
    signOut: async () => {
      localStorage.removeItem('swim_user');
      window.location.href = '/index.html';
    }
  },
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data: null, error: new Error("Supabase RLS Nonaktif") }),
        order: async () => ({ data: [], error: null })
      }),
      order: async () => ({ data: [], error: null })
    })
  })
};