import os
from azure.cosmos import CosmosClient, PartitionKey

COSMOS_ENDPOINT = os.environ["COSMOS_ENDPOINT"]
COSMOS_KEY      = os.environ["COSMOS_KEY"]
COSMOS_DATABASE = os.environ["COSMOS_DATABASE"]

# Containers name
TICKETS_CONTAINER = os.environ["COSMOS_CONTAINER_TICKETS"]
USERS_CONTAINER = os.environ["COSMOS_CONTAINER_USERS"]

_client = CosmosClient.from_connection_string(os.environ["COSMOS_CONNECTION_STRING"])
_database = _client.get_database_client(os.environ["COSMOS_DATABASE_NAME"])

# Get a Cosmos DB container client by name
def get_container(container_name: str):
    return _database.get_container_client(container_name)