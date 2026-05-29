# Vendored OpenAPI spec

The file `spec.yaml` in this directory is a vendored copy of
`perimeter-api/openapi/spec.yaml` from the sibling `perimeter-api`
repository.

CI generates `src/operations.ts` from this vendored copy. The
`pnpm sync` script in this package copies the upstream spec over
the vendored copy and re-runs codegen — run it when the perimeter-api
schema changes.
