// Import du type ChangeEvent de React pour gérer les événements de fichier.
import type { ChangeEvent } from 'react'
import type { Language } from '../i18n'

// Définition des propriétés envoyées au composant de téléchargement.
type UploadPanelProps = {
  language: Language
  selectedFile: File | null
  previewUrl: string | null
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void
  onDownload: () => void
}

// Composant visuel permettant de choisir et d'apercevoir un fichier image.
export default function UploadPanel({
  language,
  selectedFile,
  previewUrl,
  onFileChange,
  onDownload,
}: UploadPanelProps) {
  // Choisit les libellés du composant selon la langue active du dashboard.
  const isFrench = language === 'fr'

  return (
    <div className="card-surface p-4 text-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold">{isFrench ? 'Téléchargement' : 'Upload'}</h2>
      </div>

      <label className="mb-4 flex min-h-[120px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-indigo-200 bg-[#f8faff] p-4 text-center font-semibold text-gray-700">
        <input className="hidden" type="file" accept="image/*" onChange={onFileChange} />
        <span>{selectedFile ? (isFrench ? 'Changer l’image' : 'Change image') : (isFrench ? 'Choisir une image' : 'Choose an image')}</span>
      </label>

      {previewUrl && (
        <div className="mb-4 overflow-hidden rounded-2xl border border-gray-200 bg-gray-100">
          <img className="max-h-[260px] w-full object-cover" src={previewUrl} alt={isFrench ? 'Aperçu du document sélectionné' : 'Preview of the selected document'} />
        </div>
      )}

      <button
        type="button"
        className="btn-primary w-full"
        onClick={onDownload}
        disabled={!selectedFile}
      >
        {isFrench ? 'Télécharger le document' : 'Download document'}
      </button>
    </div>
  )
}
