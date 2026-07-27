import urllib.request
import os

FOOTBALL_DATA_LOGOS = {
    "pl-league.png": "https://crests.football-data.org/PL.png",
    "pd-league.png": "https://crests.football-data.org/PD.png",
    "bl1-league.png": "https://crests.football-data.org/BL1.png",
    "sa-league.png": "https://crests.football-data.org/SA.png",
    "fl1-league.png": "https://crests.football-data.org/FL1.png",
}

output_dir = "public/crests"
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}

for filename, url in FOOTBALL_DATA_LOGOS.items():
    dest_path = os.path.join(output_dir, filename)
    print(f"Fetching {filename} from {url}...")
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req) as resp, open(dest_path, "wb") as f:
            data = resp.read()
            f.write(data)
            print(f"  Successfully wrote {len(data)} bytes to {dest_path}")
    except Exception as e:
        print(f"  Failed: {e}")
