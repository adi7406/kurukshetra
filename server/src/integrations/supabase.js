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

  // Check if live Supabase is explicitly forced or if placeholder/local development values are present
  const isPlaceholder =
    !env.SUPABASE_URL ||
    env.SUPABASE_URL.includes('placeholder') ||
    env.SUPABASE_URL.includes('example.com') ||
    env.SUPABASE_URL.includes('mock') ||
    process.env.USE_MOCK_SUPABASE === 'true';

  const isUnitTest =
    (env.NODE_ENV === 'test' || process.env.NODE_ENV === 'test') &&
    process.env.USE_LIVE_SUPABASE !== 'true';

  const shouldFallbackToMock = isPlaceholder || isUnitTest;

  if (!shouldFallbackToMock && env.SUPABASE_URL && (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY)) {
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

  // Seed default demo profiles
  const demoTeacherProfile = {
    id: 'usr_demo_teacher',
    display_name: 'Dr. Priya Nair',
    email: 'priya.nair@college.edu',
    role: 'trainer',
    metadata: {
      courseTaught: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
      className: 'Year 2 B.Tech CSE',
      rollNo: 'FAC-CS-101',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const demoStudentProfile = {
    id: 'usr_demo_student',
    display_name: 'Aditya Sharma',
    email: 'aditya.sharma@college.edu',
    role: 'student',
    metadata: {
      enrolledCourse: 'CS201 Data Structures & Algorithmic Problem Solving (DSA)',
      className: 'B.Tech CSE II-A',
      rollNo: 'CS22B042',
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  getTable('profiles').set(demoTeacherProfile.id, demoTeacherProfile);
  getTable('profiles').set(demoStudentProfile.id, demoStudentProfile);

  // Seed initial demo course & student enrollment
  const demoCourse = {
    id: 'course_dsa_201',
    code: 'CS201',
    title: 'Data Structures & Algorithmic Problem Solving (DSA)',
    description: 'Foundations of arrays, strings, stacks, queues, trees, and algorithmic design.',
    created_by: demoTeacherProfile.id,
    created_at: new Date().toISOString(),
    status: 'published',
  };
  getTable('courses').set(demoCourse.id, demoCourse);

  const demoEnrollment = {
    id: 'enroll_demo_student',
    course_id: demoCourse.id,
    student_id: demoStudentProfile.id,
    status: 'active',
    created_at: new Date().toISOString(),
  };
  getTable('enrollments').set(demoEnrollment.id, demoEnrollment);

  const demoModule = {
    id: 'mod_1',
    course_id: demoCourse.id,
    title: 'Module 1: Linear Sequence Structures & Buffers',
    order_index: 1,
    created_at: new Date().toISOString(),
  };
  getTable('modules').set(demoModule.id, demoModule);

  const demoConcept1 = {
    id: 'concept_arrays',
    course_id: demoCourse.id,
    name: 'Arrays & Dynamic Contiguous Buffers',
    title: 'Arrays & Dynamic Contiguous Buffers',
    module_id: demoModule.id,
    created_at: new Date().toISOString(),
  };
  const demoConcept2 = {
    id: 'concept_strings',
    course_id: demoCourse.id,
    name: 'String Manipulation & Pattern Searching',
    title: 'String Manipulation & Pattern Searching',
    module_id: demoModule.id,
    created_at: new Date().toISOString(),
  };
  const demoConcept3 = {
    id: 'concept_stacks',
    course_id: demoCourse.id,
    name: 'Stack Data Structures & LIFO Protocols',
    title: 'Stack Data Structures & LIFO Protocols',
    module_id: demoModule.id,
    created_at: new Date().toISOString(),
  };
  getTable('concepts').set(demoConcept1.id, demoConcept1);
  getTable('concepts').set(demoConcept2.id, demoConcept2);
  getTable('concepts').set(demoConcept3.id, demoConcept3);

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
        if (!token) {
          return { data: { user: null }, error: { message: 'Invalid access token', status: 401 } };
        }
        if (tokens.has(token)) {
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
        }
        if (token.includes('demo_teacher')) {
          const teacher = {
            id: 'usr_demo_teacher',
            email: 'priya.nair@college.edu',
            user_metadata: { role: 'trainer', display_name: 'Dr. Priya Nair' },
          };
          return { data: { user: teacher }, error: null };
        }
        if (token.includes('demo_student')) {
          const student = {
            id: 'usr_demo_student',
            email: 'aditya.sharma@college.edu',
            user_metadata: { role: 'student', display_name: 'Aditya Sharma' },
          };
          return { data: { user: student }, error: null };
        }
        return { data: { user: null }, error: { message: 'Invalid access token', status: 401 } };
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
              return Promise.resolve({ data: matches, error: null, status: 200 }).then(resolve, reject);
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
