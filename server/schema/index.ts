// Barrel ré-export du schéma Drizzle.
// Une entité = un fichier dans server/schema/ (AGENTS.md §2).
// Importé via `#server/schema` dans les routes, ou passé au client `db` pour
// activer les relational queries.
export * from './users'
