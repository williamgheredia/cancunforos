'use client'

import { useState, useTransition } from 'react'
import { createBanner, toggleBanner, deleteBanner } from '@/features/admin/actions/moderation'
import type { Banner } from '@/features/admin/types'

interface BannerManagementProps {
  banners: Banner[]
}

export function BannerManagement({ banners: initialBanners }: BannerManagementProps) {
  const [banners, setBanners] = useState(initialBanners)
  const [isPending, startTransition] = useTransition()
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [linkUrl, setLinkUrl] = useState('')

  function handleCreate() {
    if (!title.trim() || !imageUrl.trim()) return
    startTransition(async () => {
      await createBanner({ title, image_url: imageUrl, link_url: linkUrl || undefined })
      setTitle('')
      setImageUrl('')
      setLinkUrl('')
      setShowCreate(false)
      // Reload page to get fresh data
      window.location.reload()
    })
  }

  function handleToggle(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleBanner(id, isActive)
      setBanners(prev => prev.map(b => b.id === id ? { ...b, is_active: !isActive } : b))
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Eliminar este banner?')) return
    startTransition(async () => {
      await deleteBanner(id)
      setBanners(prev => prev.filter(b => b.id !== id))
    })
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      {!showCreate ? (
        <button
          onClick={() => setShowCreate(true)}
          className="btn-brutal bg-brutal-lime px-6 py-3 font-bold"
        >
          + Nuevo Banner
        </button>
      ) : (
        <div className="card-brutal p-6 space-y-4">
          <h2 className="font-bold text-xl">Nuevo Banner</h2>
          <div>
            <label className="font-bold text-sm block mb-1">Titulo</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ej: Promo verano"
              className="input-brutal w-full"
            />
          </div>
          <div>
            <label className="font-bold text-sm block mb-1">URL de imagen</label>
            <input
              value={imageUrl}
              onChange={e => setImageUrl(e.target.value)}
              placeholder="https://..."
              className="input-brutal w-full"
            />
          </div>
          <div>
            <label className="font-bold text-sm block mb-1">URL de destino (opcional)</label>
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="input-brutal w-full"
            />
          </div>

          {/* Preview */}
          {imageUrl && (
            <div>
              <p className="font-bold text-sm mb-1">Preview:</p>
              <div className="border-2 border-black shadow-[4px_4px_0_#000] overflow-hidden max-w-xs">
                <img src={imageUrl} alt="preview" className="w-full h-auto" />
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleCreate}
              disabled={isPending || !title.trim() || !imageUrl.trim()}
              className="btn-brutal bg-brutal-lime px-6 py-2 font-bold disabled:opacity-50"
            >
              {isPending ? 'Creando...' : 'Crear'}
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="btn-brutal bg-white px-6 py-2 font-bold"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Banner list */}
      {banners.length === 0 ? (
        <div className="card-brutal p-8 text-center">
          <p className="text-4xl mb-2">📣</p>
          <p className="font-bold text-lg">Sin banners</p>
          <p className="text-foreground-muted">Crea tu primer banner publicitario</p>
        </div>
      ) : (
        <div className="space-y-4">
          {banners.map(banner => (
            <div key={banner.id} className="card-brutal p-4">
              <div className="flex items-start gap-4">
                {/* Image preview */}
                <div className="w-32 h-20 border-2 border-black overflow-hidden shrink-0 bg-gray-100">
                  <img
                    src={banner.image_url}
                    alt={banner.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold truncate">{banner.title}</h3>
                    <span className={`text-xs font-bold px-2 py-0.5 border-2 border-black ${
                      banner.is_active ? 'bg-green-200' : 'bg-gray-200'
                    }`}>
                      {banner.is_active ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </div>
                  {banner.link_url && (
                    <p className="text-xs text-foreground-muted truncate mt-1">{banner.link_url}</p>
                  )}
                  <p className="text-xs text-foreground-muted mt-1">
                    Posicion: {banner.position} · Prioridad: {banner.priority}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleToggle(banner.id, banner.is_active)}
                    disabled={isPending}
                    className={`btn-brutal px-3 py-1 text-sm font-bold ${
                      banner.is_active ? 'bg-yellow-200' : 'bg-green-200'
                    }`}
                  >
                    {banner.is_active ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDelete(banner.id)}
                    disabled={isPending}
                    className="btn-brutal bg-red-200 px-3 py-1 text-sm font-bold"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
