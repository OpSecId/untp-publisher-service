from flask import current_app
from config import Config
import requests
import secrets
from random import randint
from app.models.credential_type import CredentialRegistration


class PublisherControllerError(Exception):
    """Generic PublisherController Error."""


class PublisherController:
    def __init__(self):
        self.endpoint = Config.PUBLISHER_API_URL
        self.api_key = Config.PUBLISHER_API_KEY
        self.headers = None
        
    def admin_login(self):
        self.headers = {
            {'X-API-KEY': self.api_key}
        }
        
    def get_issuers(self):
        registry = self.get_registry()
        r = requests.get(
            f'{self.endpoint}/registrations/issuers',
            headers={'X-API-KEY': self.api_key}
        )
        try:
            issuers = r.json()
            for issuer in issuers:
                issuer['active'] = True if issuer['id'] in [
                    entry['id'] for entry in registry
                ] else False
            return issuers
        except:
            raise PublisherControllerError()
        
    def get_registry(self):
        r = requests.get(Config.ISSUER_REGISTRY)
        print(r.text)
        try:
            registry = r.json().get('registry')
            if not isinstance(registry, list):
                registry = r.json().get('issuers')
            return registry
        except:
            raise PublisherControllerError()
        
    def register_issuer(self, scope, name, description):
        r = requests.post(
            f'{self.endpoint}/registrations/issuers',
            headers={'X-API-KEY': self.api_key},
            json={
                'scope': scope,
                'name': name,
                'description': description
            }
        )
        try:
            return r.json()
        except:
            raise PublisherControllerError()
        
    def get_credential_types(self, issuer=None, cred_type=None):
        query_params = []
        if issuer:
            query_params.append(f'issuer={issuer}')
        if cred_type:
            query_params.append(f'type={cred_type}')
        if len(query_params) > 0:
            query_params = '?'+'&'.join(query_params)
        r = requests.get(
            f'{self.endpoint}/registrations/credentials?issuer={issuer}',
            headers={'X-API-KEY': self.api_key}
        )
        try:
            return r.json()
        except:
            raise PublisherControllerError()
        
    def get_credentials(self):
        r = requests.get(
            f'{self.endpoint}/credentials/issuers',
            headers={'X-API-KEY': self.api_key}
        )
        try:
            return r.json()
        except:
            raise PublisherControllerError()
        
    def register_credential(self, subject_type, version, issuer, subject_paths, core_paths):
        registration = CredentialRegistration(
            type=f'{subject_type}Credential',
            subjectType=subject_type,
            version=version,
            issuer=issuer,
            corePaths=core_paths,
            subjectPaths=subject_paths,
            additionalPaths={},
            relatedResources={
                'context': 'https://www.w3.org/ns/credentials/examples/v2'
            }
        ).model_dump()
        
        r = requests.post(
            f'{self.endpoint}/registrations/credentials',
            headers={'X-API-KEY': self.api_key},
            json=registration
        )
        try:
            return r.json()
        except:
            raise PublisherControllerError()
        
    def forward_credential(self, vc, options):
        r = requests.post(
            f'{self.endpoint}/credentials/forward',
            json={
                'verifiableCredential': vc,
                'options': options
            }
        )