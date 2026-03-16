import { createClient, SupabaseClient } from '@supabase/supabase-js'

export interface ScoreEntry {
  name: string
  score: number
  kills: number
  best_combo: number
}

export class LeaderboardService {
  private client: SupabaseClient | null = null

  constructor() {
    const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
    if (url && key && url.startsWith('https://')) {
      this.client = createClient(url, key)
    }
  }

  get isConfigured() {
    return this.client !== null
  }

  async submit(name: string, score: number, kills: number, bestCombo: number): Promise<void> {
    if (!this.client) return
    await this.client.from('scores').insert({ name, score, kills, best_combo: bestCombo })
  }

  async getTop(limit = 10): Promise<ScoreEntry[]> {
    if (!this.client) return []
    // Fetch a large batch so we can deduplicate — keeps only each player's best score
    const { data } = await this.client
      .from('scores')
      .select('name, score, kills, best_combo')
      .order('score', { ascending: false })
      .limit(limit * 20)
    if (!data) return []

    const seen = new Set<string>()
    const deduped: ScoreEntry[] = []
    for (const row of data as ScoreEntry[]) {
      const key = row.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      deduped.push(row)
      if (deduped.length === limit) break
    }
    return deduped
  }
}
