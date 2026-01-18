import csv
import io

def generate_inventory_csv(items: list[dict]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=items[0].keys() if items else []
    )

    writer.writeheader()
    writer.writerows(items)

    return output.getvalue()
