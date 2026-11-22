interface ImportMetaEnv {
  /** "cliente" (web y mesa), "personal" (todo, arranca en el PIN) o nada (desarrollo: todo). */
  readonly VITE_SITIO?: 'cliente' | 'personal'
}
