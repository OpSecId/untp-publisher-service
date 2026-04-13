export type PublisherSession = {
  claims: { client_id: string; expires: number }
  environment: {
    project_title: string
    project_version: string
    domain: string
    traction_tenant_id: string
    traction_api_url: string
    /** GET paths tried in order (with Bearer) until HTTP 200; full URLs use traction_api_url. */
    traction_wallet_introspection_paths: string[]
    registry_url: string
    did_web_server_url: string
    issuer_registry_url: string
  }
}

/** GET /publisher/traction-wallet-probes */
export type TractionWalletProbeRow = {
  path: string
  url: string
  status_code: number | null
  error: string | null
  content_type: string | null
  body: unknown
}

export type TractionWalletProbeResponse = {
  traction_api_url: string
  probes: TractionWalletProbeRow[]
  detail?: string
}
