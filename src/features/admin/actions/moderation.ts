'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReportedShoutout, Spot, AdminStats, Banner } from '../types'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autorizado')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (!profile || profile.role !== 'admin') throw new Error('No autorizado')
  return supabase
}

export async function getReportedShoutouts(): Promise<ReportedShoutout[]> {
  const supabase = await requireAdmin()

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .gt('reports_count', 0)
    .order('reports_count', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ReportedShoutout[]
}

export async function getAllShoutouts(): Promise<ReportedShoutout[]> {
  const supabase = await requireAdmin()

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as ReportedShoutout[]
}

export async function deleteShoutout(id: string) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('shoutouts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function collapseShoutout(id: string) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('shoutouts')
    .update({ is_collapsed: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function getSpots(): Promise<Spot[]> {
  const supabase = await requireAdmin()

  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Spot[]
}

export async function toggleSpotActive(id: string, isActive: boolean) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('spots')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/spots')
}

export async function deleteSpot(id: string) {
  const supabase = await requireAdmin()

  const { error } = await supabase
    .from('spots')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/spots')
}

// --- Banner CRUD ---

export async function getBanners(): Promise<Banner[]> {
  const supabase = await requireAdmin()
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('priority', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as Banner[]
}

export async function createBanner(input: { title: string; image_url: string; link_url?: string; position?: string }) {
  const supabase = await requireAdmin()
  // Validate URLs to prevent javascript: XSS
  if (input.link_url && !input.link_url.startsWith('https://')) {
    throw new Error('URL debe empezar con https://')
  }
  if (!input.image_url.startsWith('https://')) {
    throw new Error('URL de imagen debe empezar con https://')
  }
  const { error } = await supabase.from('banners').insert({
    title: input.title,
    image_url: input.image_url,
    link_url: input.link_url || null,
    position: input.position || 'sidebar',
  })
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
}

export async function toggleBanner(id: string, isActive: boolean) {
  const supabase = await requireAdmin()
  const { error } = await supabase
    .from('banners')
    .update({ is_active: !isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
}

export async function deleteBanner(id: string) {
  const supabase = await requireAdmin()
  const { error } = await supabase.from('banners').delete().eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/admin/banners')
}

export async function getActiveBanners(position: string = 'sidebar'): Promise<Banner[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .eq('position', position)
    .order('priority', { ascending: false })
    .limit(5)
  if (error) return []
  return (data ?? []) as Banner[]
}

export async function getStats(): Promise<AdminStats> {
  const supabase = await requireAdmin()

  const [shoutouts, spots] = await Promise.all([
    supabase.from('shoutouts').select('id, reports_count, is_collapsed', { count: 'exact' }),
    supabase.from('spots').select('id, is_active', { count: 'exact' }),
  ])

  const shoutoutData = shoutouts.data ?? []
  const spotData = spots.data ?? []

  return {
    totalShoutouts: shoutouts.count ?? 0,
    reportedShoutouts: shoutoutData.filter(s => s.reports_count > 0).length,
    collapsedShoutouts: shoutoutData.filter(s => s.is_collapsed).length,
    activeSpots: spotData.filter(s => s.is_active).length,
    inactiveSpots: spotData.filter(s => !s.is_active).length,
  }
}
