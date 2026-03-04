'use client'

import { useState } from 'react'
import { adminLogin } from '../actions/auth'

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError(null)

    const result = await adminLogin(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="email" className="block font-bold text-sm uppercase mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="admin@cancunforos.com"
          className="input-brutal"
        />
      </div>

      <div>
        <label htmlFor="password" className="block font-bold text-sm uppercase mb-2">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="input-brutal"
        />
      </div>

      {error && (
        <div className="bg-brutal-pink border-2 border-black p-3 font-bold text-sm">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-brutal w-full bg-brutal-yellow text-lg disabled:opacity-50"
      >
        {loading ? 'Entrando...' : 'Entrar al Panel'}
      </button>
    </form>
  )
}
