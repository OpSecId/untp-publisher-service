# Administrative role

A publisher software admin has 3 key functions:
- Register issuers
- Register credential types
- Generate/Provide secrets to issuers


## Issuer Registrations
An issuer registration will begin with a request, in the form of a gh issue on the [digital trust toolkit](https://github.com/bcgov/digital-trust-toolkit/issues).

Once that issue has been approved by the respective governance team, the admin is responsible for conducting the issuer registration through an api call. He will need to gather the name, scope and description of the issuer from the issue and send the following request:
```
POST
https://publisher.example.com/registrations/issuer
{
    "name": $ISSUER_NAME,
    "scope": $ISSUER_SCOPE,
    "description": $ISSUER_DESCRIPTION
}
```

The request must contain an `X-API-KEY` header corresponding to the Publisher's Traction Tenant `api_key` value.

A successful response will return a 201 with a did document. The admin can confirm the did web's availablility be resolving it through the traction did resolver endpoint. Alternatively, the uniresolver may be used.

At this point, a [PR should be opened](https://github.com/bcgov/digital-trust-toolkit/pulls) to address the issue and add this issuer to the [corresponding registry](https://github.com/bcgov/digital-trust-toolkit/tree/main/related_resources/registrations/issuers).

## Credential Type Registration
The credential type registration is the most complex and critical component: it defines how issuers issue Verifiable Credentials through this publisher. The configured **entity registry** is used only for **entity lookup** during publication; credential type definitions and issued VCs are not automatically pushed to any public search index unless you integrate that separately.

This will also begin with a gh issue, describing the credential to be issued, the data points contained in the credential and other associated metadata. 
```
POST
https://publisher.example.com/registrations/credentials
{
    "type": "BCExampleDocumentCredential",
    "version": "1.0",
    "issuer": "did:web:example.gov.bc.ca",
    "mappings": {
        "entityId": "documentOwner",
        "cardinalityId": "documentNumber"
    },
    "subjectType": "ExampleDocument",
    "subjectPaths": {
        "documentOwner": "$.credentialSubject.documentOwner",
        "documentNumber": "$.credentialSubject.documentNumber",
    },
    "relatedResources": {
        "context": "https://bcgov.github.io/digital-trust-toolkit/contexts/ExampleDocument/v1.jsonld"
    }
}
```