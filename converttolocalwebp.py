import json
import os
import requests
from PIL import Image
from io import BytesIO
import re

# Ensure the assets/renders directory exists
os.makedirs('assets/renders', exist_ok=True)

# Set up a session with headers that mimic a browser
session = requests.Session()
session.headers.update({
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
})

def process_image(url, filename):
    try:
        response = session.get(url, timeout=10)
        response.raise_for_status()
        img = Image.open(BytesIO(response.content))
        webp_path = f'assets/renders/{filename}.webp'
        img.save(webp_path, 'WEBP')
        return webp_path
    except Exception as e:
        print(f"Error processing {url}: {e}")
    return None

# Read characters.json
with open('characters.json', 'r') as f:
    characters = json.load(f)

# Process each character
for i, character in enumerate(characters):
    image_url = character['image_url']
    
    if 'imgur.com' in image_url:
        match = re.search(r'/([\w]+)\.(jpg|png|gif)', image_url)
        if match:
            filename = match.group(1)
            new_path = process_image(image_url, filename)
            
            if new_path:
                character['image_url'] = new_path
                print(f"Processed {i+1}/{len(characters)}: {image_url}")
            else:
                print(f"Failed to process {i+1}/{len(characters)}: {image_url}")
        else:
            print(f"Could not extract filename from URL: {image_url}")

# Save the updated character data
with open('characters.json', 'w') as f:
    json.dump(characters, f, indent=2)

print("Processing complete. Check the console output for any errors.")