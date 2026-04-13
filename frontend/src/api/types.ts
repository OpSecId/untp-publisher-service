export type PublisherSession = {
  claims: { client_id: string; expires: number }
  environment: {
    project_title: string
    project_version: string
    domain: string
    traction_tenant_id: string
    traction_api_url: string
    registry_url: string
    did_web_server_url: string
    issuer_registry_url: string
  }
}
