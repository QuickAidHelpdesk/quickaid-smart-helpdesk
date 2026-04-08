import os
from azure.cosmos import CosmosClient, PartitionKey

COSMOS_ENDPOINT = os.environ["COSMOS_ENDPOINT"]
COSMOS_KEY      = os.environ["COSMOS_KEY"]
COSMOS_DATABASE = os.environ["COSMOS_DATABASE"]

_client = CosmosClient(COSMOS_ENDPOINT, credential=COSMOS_KEY)
_database = _client.get_database_client(COSMOS_DATABASE)

# Get a Cosmos DB container client by name
def get_container(container_name: str):
    return _database.get_container_client(container_name)

# Create an item in the container
def create_item(container_name: str, item: dict):
    container = get_container(container_name)
    return container.upsert_item(item)