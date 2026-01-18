from db.mongo import get_database

async def get_inventory_items(user: dict) -> list[dict]:
    """
    Return inventory items the user is allowed to export.
    (Later: filter by org_id, account_id, etc.)
    """
    db = get_database()

    cursor = db.inventory.find({})
    items = []

    async for item in cursor:
        item["_id"] = str(item["_id"])
        items.append(item)

    return items
