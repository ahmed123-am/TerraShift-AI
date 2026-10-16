"""Seed the 20-crop catalogue into backend/app/terrashift.db (safe to rerun)."""
from app.farm_data import DATABASE_PATH, init_farm_data_tables


def seed_crops_database():
    init_farm_data_tables(DATABASE_PATH)
    print(f"Crop catalogue seeded/updated in {DATABASE_PATH}")


if __name__ == "__main__":
    seed_crops_database()
