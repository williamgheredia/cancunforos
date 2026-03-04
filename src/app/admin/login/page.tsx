import { AdminLoginForm } from '@/features/admin/components'

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#F5F5F0] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="card-brutal p-8">
          <div className="text-center mb-8">
            <span className="bg-black text-white px-4 py-2 font-bold text-xl inline-block mb-4">
              CANCUNFOROS
            </span>
            <h1 className="font-bold text-2xl">Panel de Administracion</h1>
            <p className="text-foreground-secondary mt-1">Solo acceso autorizado</p>
          </div>

          <AdminLoginForm />
        </div>
      </div>
    </div>
  )
}
