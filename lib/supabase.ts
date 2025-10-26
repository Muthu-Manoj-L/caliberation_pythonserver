import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// If environment variables are not available, provide a safe shim so web builds
// or CI environments don't break at build time.
const makeShim = () => ({
  auth: {
    getSession: async () => ({ data: { session: null } }),
    onAuthStateChange: (_cb: any) => ({ data: { subscription: { unsubscribe: () => {} } } }),
    signInWithPassword: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signUp: async () => ({ data: null, error: new Error('Supabase not configured') }),
    signOut: async () => ({ data: null, error: null }),
  },
  from: (_: string) => {
    const chain: any = {};

    // chainable methods return the builder itself so callers can chain .select().eq().order() etc.
    const noopChain = () => chain;
    chain.select = function () { return chain; };
    chain.eq = function () { return chain; };
    chain.order = function () { return chain; };
    chain.limit = function () { return chain; };
    chain.maybeSingle = function () { return chain; };
    chain.insert = function () { return chain; };
    chain.update = function () { return chain; };

    // Make the chain awaitable (thenable). Awaiting the builder resolves to a no-op result.
    chain.then = function (resolve: any) {
      return Promise.resolve({ data: null, error: null, count: 0 }).then(resolve);
    };

    return chain;
  },
});

let supabase: any;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn('[supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is not set. Using shim client.');
  supabase = makeShim();
} else {
  // Dynamically require to avoid web bundlers pulling in node-only deps at build-time.
  // eslint-disable-next-line global-require
  const { createClient } = require('@supabase/supabase-js');
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  });
}

export { supabase };
