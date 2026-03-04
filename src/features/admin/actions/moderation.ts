'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { ReportedShoutout, Spot, AdminStats } from '../types'

export async function getReportedShoutouts(): Promise<ReportedShoutout[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .gt('reports_count', 0)
    .order('reports_count', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ReportedShoutout[]
}

export async function getAllShoutouts(): Promise<ReportedShoutout[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('shoutouts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return (data ?? []) as ReportedShoutout[]
}

export async function deleteShoutout(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shoutouts')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function collapseShoutout(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('shoutouts')
    .update({ is_collapsed: true })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin')
}

export async function getSpots(): Promise<Spot[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('spots')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Spot[]
}

export async function toggleSpotActive(id: string, isActive: boolean) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('spots')
    .update({ is_active: !isActive })
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/spots')
}

export async function deleteSpot(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('spots')
    .delete()
    .eq('id', id)

  if (error) throw new Error(error.message)
  revalidatePath('/admin/spots')
}

export async function getStats(): Promise<AdminStats> {
  const supabase = await createClient()

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
