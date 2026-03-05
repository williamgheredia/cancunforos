import Link from 'next/link'
import { adminLogout } from '../actions/auth'

interface AdminNavProps {
  currentPath: string
}

export function AdminNav({ currentPath }: AdminNavProps) {
  const links = [
    { href: '/admin', label: 'Shoutouts', emoji: '📢' },
    { href: '/admin/spots', label: 'Spots', emoji: '📍' },
    { href: '/admin/banners', label: 'Banners', emoji: '📣' },
  ]

  return (
    <nav className="navbar-brutal flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/admin" className="bg-black text-white px-4 py-2 font-bold">
          ADMIN
        </Link>

        {links.map(link => (
          <Link
            key={link.href}
            href={link.href}
            className={`font-bold text-sm uppercase ${
              currentPath === link.href
                ? 'underline decoration-4 underline-offset-4 decoration-brutal-yellow'
                : 'hover:underline decoration-2 underline-offset-4'
            }`}
          >
            {link.emoji} {link.label}
          </Link>
        ))}
      </div>

      <form action={adminLogout}>
        <button
          type="submit"
          className="btn-brutal bg-white text-sm px-4 py-2"
        >
          Salir
        </button>
      </form>
    </nav>
  )
}
