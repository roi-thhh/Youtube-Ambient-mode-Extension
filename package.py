import os
import zipfile
import json

def package_extension():
    source_dir = "yt-ambient"
    dist_dir = "dist"
    os.makedirs(dist_dir, exist_ok=True)

    with open(os.path.join(source_dir, "manifest.json"), "r", encoding="utf-8") as f:
        manifest = json.load(f)
    version = manifest.get("version", "1.0.0")

    zip_filename = os.path.join(dist_dir, f"yt-ambient-v{version}.zip")

    with zipfile.ZipFile(zip_filename, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
                print(f"Added: {arcname}")

    print(f"\nSuccessfully created production package: {zip_filename} ({os.path.getsize(zip_filename)} bytes)")

if __name__ == "__main__":
    package_extension()
