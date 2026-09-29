// Typage des clés de traduction à partir du fichier anglais.
import 'i18next'

import type { resources } from './index'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation'
    resources: (typeof resources)['en']
  }
}
