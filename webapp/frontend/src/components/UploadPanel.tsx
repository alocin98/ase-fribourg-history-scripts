// Import du type ChangeEvent de React pour gérer les événements de fichier.
import type { ChangeEvent } from 'react'

// Définition des propriétés envoyées au composant de téléchargement.
type UploadPanelProps = {
  language: 'fr' | 'en'
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
    <div className="panel upload-panel">
      <div className="panel-header">
        <h2>{isFrench ? 'Téléchargement' : 'Upload'}</h2>
      </div>

      <label className="upload-box">
        <input type="file" accept="image/*" onChange={onFileChange} />
        <span>{selectedFile ? (isFrench ? 'Changer l’image' : 'Change image') : (isFrench ? 'Choisir une image' : 'Choose an image')}</span>
      </label>

      {previewUrl && (
        <div className="preview-box">
          <img src={previewUrl} alt={isFrench ? 'Aperçu du document sélectionné' : 'Preview of the selected document'} />
        </div>
      )}

      <button
        type="button"
        className="primary-button full-width"
        onClick={onDownload}
        disabled={!selectedFile}
      >
        {isFrench ? 'Télécharger le document' : 'Download document'}
      </button>
    </div>
  )
}
