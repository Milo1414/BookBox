import { useLibrary } from '../context/LibraryContext'
import { friendlyError } from '../lib/errors'

export function OfflineBanner() {
  const { online } = useLibrary()
  if (online) return null
  return (
    <div className="banner banner-offline" role="status">
      Sin conexión. Podés seguir mirando la biblioteca. Los cambios necesitan internet.
    </div>
  )
}

export function MigrationBanner() {
  const { migrationPending, importLocalToSupabase, showToast } = useLibrary()
  if (!migrationPending) return null

  async function onImport() {
    try {
      await importLocalToSupabase()
      showToast('Biblioteca importada a Supabase.')
    } catch (error) {
      showToast(friendlyError(error, 'No pude importar la biblioteca local.'))
    }
  }

  return (
    <div className="banner banner-migrate">
      <div>
        <strong>Encontré tu biblioteca local</strong>
        <p>Podés importarla a Supabase. No se borra el respaldo local.</p>
      </div>
      <button type="button" className="btn btn-primary" onClick={() => void onImport()}>
        Importar a Supabase
      </button>
    </div>
  )
}
