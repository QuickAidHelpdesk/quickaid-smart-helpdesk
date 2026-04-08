"""
Cosmos DB client helper — singleton connection to Azure Cosmos DB.
Replaces Django ORM / SQLite with NoSQL operations.
"""

import os

from azure.cosmos import CosmosClient, PartitionKey, exceptions

# ── Connection ──────────────────────────────────────────────────────
_client = None
_database = None


def get_database():
    """Return a cached reference to the Cosmos DB database."""
    global _client, _database
    if _database is None:
        connection_string = os.environ["COSMOS_CONNECTION_STRING"]
        database_name = os.environ.get("COSMOS_DATABASE", "quickaid-db")
        _client = CosmosClient.from_connection_string(connection_string)
        _database = _client.get_database_client(database_name)
    return _database


def get_container(container_name: str):
    """Return a container client by name."""
    return get_database().get_container_client(container_name)


# ── Container names (match your Cosmos DB setup) ────────────────────
USERS_CONTAINER = "users"
TICKETS_CONTAINER = "tickets"
STATUS_HISTORY_CONTAINER = "status_history"
EMAIL_LOGS_CONTAINER = "email_logs"
ADMIN_NOTES_CONTAINER = "admin_notes"


# ── Generic helpers ─────────────────────────────────────────────────
def query_items(container_name: str, query: str, parameters: list = None):
    """Run a SQL query against a container and return results as a list."""
    container = get_container(container_name)
    return list(
        container.query_items(
            query=query,
            parameters=parameters or [],
            enable_cross_partition_query=True,
        )
    )


def create_item(container_name: str, item: dict):
    """Create (upsert) an item in a container."""
    container = get_container(container_name)
    return container.upsert_item(item)


def read_item(container_name: str, item_id: str, partition_key: str):
    """Read a single item by id and partition key."""
    container = get_container(container_name)
    try:
        return container.read_item(item=item_id, partition_key=partition_key)
    except exceptions.CosmosResourceNotFoundError:
        return None


def replace_item(container_name: str, item_id: str, item: dict):
    """Replace an existing item."""
    container = get_container(container_name)
    return container.replace_item(item=item_id, body=item)
