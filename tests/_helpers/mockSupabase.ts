// A tiny Supabase mock. Covers the small slice of the postgrest-js
// surface our API routes use: chainable .from().select().eq()…select()
// .single() / .maybeSingle() / .upsert() / .update() / .insert(), plus
// .auth.getUser(). Each .from() returns its own table handle so tests
// can wire different shapes per table.

type TableState = Record<string, any[]>

export type SupabaseMockOptions = {
  user?: { id: string; email?: string } | null
  tables?: Record<string, TableState>
  // Optional override for specific table queries. The key is the
  // table name; the value is a function that receives the chain
  // arguments and returns the data (or throws). This lets a test
  // say "when the route queries 'profiles' with eq('id', x), return
  // this row."
  overrides?: Record<string, (op: string, args: any[]) => any>
}

export function makeSupabaseMock(opts: SupabaseMockOptions = {}) {
  const user = opts.user === undefined ? { id: 'user-1', email: 'a@b.co' } : opts.user
  const tables: Record<string, TableState> = opts.tables || {}
  const overrides = opts.overrides || {}

  function from(table: string) {
    // We track the most recent chain (the most recent op + args) so
    // .single() / .maybeSingle() can return the last filtered row.
    const chain: { op: string; args: any[] }[] = []
    const rows: any[] = ((tables[table] as unknown as any[] | undefined) || []).slice()

    function applyFilters(): any[] {
      let out = rows
      for (const step of chain) {
        if (step.op === 'eq') {
          const [col, val] = step.args
          out = out.filter(r => r[col] === val)
        }
        // 'select' doesn't filter; it just declares the shape.
      }
      return out
    }

    const handle: any = {
      select(_cols?: string) {
        chain.push({ op: 'select', args: [_cols] })
        return handle
      },
      eq(col: string, val: any) {
        chain.push({ op: 'eq', args: [col, val] })
        return handle
      },
      in(col: string, vals: any[]) {
        chain.push({ op: 'in', args: [col, vals] })
        return handle
      },
      order(_col: string, _opts?: any) {
        chain.push({ op: 'order', args: [_col, _opts] })
        return handle
      },
      limit(n: number) {
        chain.push({ op: 'limit', args: [n] })
        return handle
      },
      single() {
        const filterOverride = overrides[table]
        if (filterOverride) return filterOverride('single', chain)
        const rows = applyFilters()
        return Promise.resolve({ data: rows[0] ?? null, error: rows.length === 0 ? { code: 'PGRST116', message: 'not found' } : null })
      },
      maybeSingle() {
        const filterOverride = overrides[table]
        if (filterOverride) return filterOverride('maybeSingle', chain)
        const rows = applyFilters()
        return Promise.resolve({ data: rows[0] ?? null, error: null })
      },
      // Terminal ops that resolve to { data, error }.
      then(resolve: any, reject?: any) {
        const filterOverride = overrides[table]
        const result = filterOverride
          ? filterOverride('then', chain)
          : { data: applyFilters(), error: null }
        return Promise.resolve(result).then(resolve, reject)
      },
      upsert(payload: any, _opts?: any) {
        chain.push({ op: 'upsert', args: [payload, _opts] })
        return handle
      },
      insert(payload: any) {
        chain.push({ op: 'insert', args: [payload] })
        return handle
      },
      update(patch: any) {
        chain.push({ op: 'update', args: [patch] })
        return handle
      },
      delete() {
        chain.push({ op: 'delete', args: [] })
        return handle
      }
    }
    return handle
  }

  return {
    auth: {
      getUser: async () => ({ data: { user }, error: null })
    },
    from
  }
}
