
import os
import requests
from dotenv import load_dotenv

# Load credentials from backend/.env
load_dotenv(override=True)

CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID", "").strip()
CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET", "").strip()

TOKEN_URL = (
    "https://identity.dataspace.copernicus.eu/"
    "auth/realms/CDSE/protocol/openid-connect/token"
)


def authenticate():
    if not CLIENT_ID or not CLIENT_SECRET:
        print("FAILED: Client ID or Client Secret is missing.")
        return

    payload = {
        "grant_type": "client_credentials",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
    }

    try:
        response = requests.post(
            TOKEN_URL,
            data=payload,
            timeout=30,
        )

        print("HTTP Status:", response.status_code)

        if response.ok:
            data = response.json()
            if data.get("access_token"):
                print("Authentication: SUCCESS")
                print("Token received successfully.")
                return

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        print("Authentication: FAILED")
        print("OAuth error:", error_data.get("error", "unknown"))
        print(
            "Description:",
            error_data.get("error_description", "No description returned"),
        )

    except requests.RequestException as exc:
        print("Connection failed:", type(exc).__name__)


if __name__ == "__main__":
    authenticate()
