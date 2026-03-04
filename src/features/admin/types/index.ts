export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface ReportedShoutout {
  id: string
  session_id: string
  alias: string
  text: string
  summary: string
  category: string
  emoji: string
  source: 'voice' | 'text'
  lat: number
  lng: number
  reactions_confirm: number
  reactions_doubt: number
  reports_count: number
  is_collapsed: boolean
  created_at: string
  expires_at: string
}

export interface Spot {
  id: string
  session_id: string
  name: string
  description: string | null
  category: string
  emoji: string
  lat: number
  lng: number
  last_activity: string
  is_active: boolean
  created_at: string
}

export interface AdminStats {
  totalShoutouts: number
  reportedShoutouts: number
  collapsedShoutouts: number
  activeSpots: number
  inactiveSpots: number
}
