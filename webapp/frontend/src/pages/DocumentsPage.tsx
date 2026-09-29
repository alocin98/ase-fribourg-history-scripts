import { useTranslation } from 'react-i18next'

// Rubrique Documents : encore vide.
export default function DocumentsPage() {
  const { t } = useTranslation()

  return (
    <>
      <h1>{t('documents.title')}</h1>
      <p className="muted">{t('documents.empty')}</p>
    </>
  )
}
