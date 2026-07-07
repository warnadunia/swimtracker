// src/supabase.js
// SINKRONISASI SESI LOCALSTORAGE BIAR GAK INFINITE REDIRECT bray

console.warn("⚠️ Menyinkronkan sesi lama dengan session TiDB...");

// Ambil user dari localStorage yang di-set oleh auth.js baru
const getLocalSession = () => {
  const swimUser = localStorage.getItem('swim_user');
  if (swimUser) {
    const user = JSON.parse(swimUser);
    // Kembalikan struktur object tiruan yang mirip dengan Supabase Auth Session
    return {
      session: {
        user: {
          id: user.id,
          email: user.email,
          user_metadata: {
            full_name: user.full_name
          }
        }
      },
      error: null
    };
  }
  return { session: null, error: null };
};

export const supabase = {
  auth: {
    // SEKARANG DIA BACA LOCALSTORAGE, JADI ENYAHLAH DISOKTIK!
    getSession: async () => getLocalSession(),
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
        // Fallback untuk script lama yang nge-query profile berdasarkan user id setelah login
        single: async () => {
          const swimUser = localStorage.getItem('swim_user');
          return { data: swimUser ? JSON.parse(swimUser) : null, error: null };
        },
        order: async () => ({ data: [], error: null })
      }),
      order: async () => ({ data: [], error: null })
    })
  })
};