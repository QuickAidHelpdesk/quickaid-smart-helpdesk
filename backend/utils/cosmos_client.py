import os
from azure.cosmos import CosmosClient

# Connection string (from local.settings.json or Azure App Settings)
COSMOS_CONNECTION_STRING = os.environ["COSMOS_CONNECTION_STRING"]
COSMOS_DATABASE_NAME = os.environ["COSMOS_DATABASE_NAME"]

# Container names
TICKETS_CONTAINER = os.environ["COSMOS_CONTAINER_TICKETS"]
USERS_CONTAINER = os.environ["COSMOS_CONTAINER_USERS"]
STATUS_HISTORY_CONTAINER = os.environ.get("COSMOS_CONTAINER_STATUS_HISTORY", "status_history")
TEAMS_CONTAINER = os.environ.get("COSMOS_CONTAINER_TEAMS", "teams")
USERS_TEAMS_CONTAINER = os.environ.get("COSMOS_CONTAINER_USERS_TEAMS", "users_teams")

# Initialize Cosmos client and database
_client = CosmosClient.from_connection_string(COSMOS_CONNECTION_STRING)
_database = _client.get_database_client(COSMOS_DATABASE_NAME)


def get_container(container_name: str):
    """Get a Cosmos DB container client by name."""
    return _database.get_container_client(container_name)
