import pymongo
from bson.objectid import ObjectId
from config import settings


class MongoClientError(Exception):
    """Generic MongoClient Error."""


class MongoClient:
    def __init__(self):
        self.client = pymongo.MongoClient(
            f'{settings.MONGO_HOST}:{settings.MONGO_PORT}',
            username=settings.MONGO_USER,
            password=settings.MONGO_PASSWORD,
            authSource=settings.MONGO_DB,
        )
        self.db = self.client[settings.MONGO_DB]

    def provision(self):
        self.db["IssuerRecord"].create_index([("id")], unique=True)
        self.db["CredentialRecord"].create_index([("id")], unique=True)
        self.db["StatusListRecord"].create_index([("id")], unique=True)
        self.db["CredentialTypeRecord"].create_index([("version")], unique=True)
        self.db["CredentialPickupRecord"].create_index([("id")], unique=True)

    def insert(self, collection, item):
        try:
            self.db[collection].insert_one(item)
        except pymongo.errors.DuplicateKeyError:
            raise MongoClientError()
            

    def find(self, collection, query):
        return self.db[collection].find(query, {'_id': False}, sort=[("_id", pymongo.DESCENDING)])

    def find_one(self, collection, query):
        return self.db[collection].find_one(query, {'_id': False}, sort=[("_id", pymongo.DESCENDING)])

    def find_by_id(self, collection, object_id):
        return self.db[collection].find_one({"_id": ObjectId(object_id)})

    def replace(self, collection, query, new_item):
        self.db[collection].replace_one(query, new_item)

    def delete(self, collection, query):
        self.db[collection].delete_one(query)
