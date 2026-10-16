import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let supabaseClient = null;

/**
 * Initializes and returns the Supabase client.
 * If credentials are not configured (e.g. in local development or unit test mode),
 * it returns a safe simulated client that avoids network crashes.
 */
export function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // During automated unit testing (node --test) where isolated mock states are expected,
  // return the in-memory store unless live Supabase is explicitly forced via USE_LIVE_SUPABASE=true
  const isUnitTest =
    (env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') &&
    process.env.USE_LIVE_SUPABASE !== 'true';

  if (!isUnitTest && env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY)) {
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY;
    supabaseClient = createClient(env.SUPABASE_URL, key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return supabaseClient;
  }

  // In-memory simulated client for local testing and offline execution
  supabaseClient = createMockSupabase();
  return supabaseClient;
}

export function setSupabase(client) {
  supabaseClient = client;
}

export function resetSupabase() {
  supabaseClient = null;
}

/**
 * Creates an in-memory mock Supabase client for testing and offline local development.
 */
export function createMockSupabase() {
  const users = new Map();
  const tokens = new Map();
  const tables = new Map();

  function getTable(name) {
    if (!tables.has(name)) {
      tables.set(name, new Map());
    }
    return tables.get(name);
  }

  return {
    isMock: true,
    auth: {
      async signUp({ email, password, options = {} }) {
        const id = options.data?.id || `user_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const user = {
          id,
          email,
          user_metadata: options.data || {},
          created_at: new Date().toISOString(),
        };
        users.set(email.toLowerCase(), { ...user, password });

        const role = options.data?.role || 'student';
        const profile = {
          id,
          display_name: options.data?.display_name || email.split('@')[0],
          role,
          metadata: options.data?.metadata || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        getTable('profiles').set(id, profile);

        const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        tokens.set(token, { user, role });

        return { data: { user, session: { access_token: token } }, error: null };
      },

      async signInWithPassword({ email, password }) {
        const normalized = email.toLowerCase();
        const record = users.get(normalized);
        if (!record || record.password !== password) {
          return { data: null, error: { message: 'Invalid login credentials', status: 400 } };
        }
        const profile = getTable('profiles').get(record.id);
        const role = profile ? profile.role : 'student';
        const token = `mock_token_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        const user = { id: record.id, email: record.email };
        tokens.set(token, { user, role });

        return {
          data: {
            user,
            session: { access_token: token },
          },
          error: null,
        };
      },

      async getUser(token) {
        if (!token || !tokens.has(token)) {
          return { data: { user: null }, error: { message: 'Invalid access token', status: 401 } };
        }
        const session = tokens.get(token);
        return {
          data: {
            user: {
              id: session.user.id,
              email: session.user.email,
              user_metadata: { role: session.role },
            },
          },
          error: null,
        };
      },
    },

    from(tableName) {
      const store = getTable(tableName);

      return {
        select(_cols) {
          let filters = [];
          let sortFn = null;

          const queryBuilder = {
            eq(field, val) {
              filters.push((item) => item[field] === val);
              return queryBuilder;
            },
            in(field, arr) {
              filters.push((item) => arr.includes(item[field]));
              return queryBuilder;
            },
            order(field, opts = {}) {
              sortFn = (a, b) => {
                const ascending = opts.ascending !== false;
                if (a[field] < b[field]) return ascending ? -1 : 1;
                if (a[field] > b[field]) return ascending ? 1 : -1;
                return 0;
              };
              return queryBuilder;
            },
            limit(count) {
              const origThen = queryBuilder.then;
              queryBuilder.then = function (resolve, reject) {
                return origThen((res) => {
                  if (res && Array.isArray(res.data)) {
                    return resolve({ ...res, data: res.data.slice(0, count) });
                  }
                  return resolve(res);
                }, reject);
              };
              return queryBuilder;
            },
            async single() {
              const all = Array.from(store.values());
              const match = all.find((item) => filters.every((fn) => fn(item)));
              if (match) return { data: match, error: null };
              return { data: null, error: { message: 'Row not found', code: 'PGRST116' } };
            },
            async maybeSingle() {
              const all = Array.from(store.values());
              const match = all.find((item) => filters.every((fn) => fn(item)));
              return { data: match || null, error: null };
            },
            then(resolve, reject) {
              const all = Array.from(store.values());
              let matches = filters.length > 0 ? all.filter((item) => filters.every((fn) => fn(item))) : all;
              if (sortFn) {
                matches = [...matches].sort(sortFn);
              }
              return Promise.resolve({ data: matches, error: null }).then(resolve, reject);
            },
          };

          return queryBuilder;
        },

        insert(rows) {
          const arr = Array.isArray(rows) ? rows : [rows];
          const insertedItems = [];
          for (const r of arr) {
            const id = r.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const item = {
              ...r,
              id,
              created_at: r.created_at || new Date().toISOString(),
              updated_at: r.updated_at || new Date().toISOString(),
            };
            store.set(id, item);
            insertedItems.push(item);
          }

          return {
            select() {
              return {
                async single() {
                  return { data: insertedItems[0], error: null };
                },
                async maybeSingle() {
                  return { data: insertedItems[0] || null, error: null };
                },
                then(resolve, reject) {
                  return Promise.resolve({ data: insertedItems, error: null }).then(resolve, reject);
                },
              };
            },
            then(resolve, reject) {
              return Promise.resolve({ data: insertedItems, error: null }).then(resolve, reject);
            },
          };
        },

        update(updates) {
          let filterFn = () => false;

          return {
            eq(field, val) {
              filterFn = (item) => item[field] === val;

              let updatedItem = null;
              for (const [id, item] of store.entries()) {
                if (filterFn(item)) {
                  updatedItem = {
                    ...item,
                    ...updates,
                    updated_at: new Date().toISOString(),
                  };
                  store.set(id, updatedItem);
                }
              }

              return {
                select() {
                  return {
                    async single() {
                      return { data: updatedItem, error: null };
                    },
                    async maybeSingle() {
                      return { data: updatedItem || null, error: null };
                    },
                    then(resolve, reject) {
                      return Promise.resolve({ data: updatedItem, error: null }).then(resolve, reject);
                    },
                  };
                },
                then(resolve, reject) {
                  return Promise.resolve({ data: updatedItem, error: null }).then(resolve, reject);
                },
              };
            },
          };
        },

        delete() {
          return {
            eq(field, val) {
              for (const [id, item] of store.entries()) {
                if (item[field] === val) {
                  store.delete(id);
                }
              }
              return {
                then(resolve, reject) {
                  return Promise.resolve({ data: null, error: null }).then(resolve, reject);
                },
              };
            },
          };
        },
      };
    },
  };
}
