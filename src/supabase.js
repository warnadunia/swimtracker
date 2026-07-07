// src/supabase.js
// SINKRONISASI STRUKTUR DATA NESTED SUPABASE AUTH SDK bray

console.warn("⚠️ Menyinkronkan sesi lama dengan session TiDB...");

const getLocalSession = () => {
  const swimUser = localStorage.getItem('swim_user');
  if (swimUser) {
    const user = JSON.parse(swimUser);
    // Kita bungkus di dalam properti data murni biar destructuring { data: { session } } tidak crash!
    return {
      data: {
        session: {
          user: {
            id: user.id,
            email: user.email,
            user_metadata: {
              full_name: user.full_name
            }
          }
        }
      },
      error: null
    };
  }
  return { data: { session: null }, error: null };
};

export const supabase = {
  auth: {
    getSession: async () => getLocalSession(),
    signUp: async () => ({ data: {}, error: new Error("Gunakan API TiDB bray!") }),
    signInWithPassword: async () => ({ data: {}, error: new Error("Gunakan API TiDB bray!") }),
    signOut: async () => {
      localStorage.removeItem('swim_user');
      window.location.href = '/index.html';
    }
  },
  from: () => ({
    select: () => ({
      eq: () => ({
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