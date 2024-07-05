import json
import os
from PIL import Image

# Ensure the assets/renders directory exists
os.makedirs('assets/renders', exist_ok=True)

def crop_to_square(img):
    width, height = img.size
    new_size = min(width, height)
    left = (width - new_size) / 2
    top = (height - new_size) / 2
    right = (width + new_size) / 2
    bottom = (height + new_size) / 2
    return img.crop((left, top, right, bottom))

def process_image(file_path, filename):
    try:
        img = Image.open(file_path)
        
        # Crop to square if filename doesn't start with "BChaCut"
        if not filename.startswith("BChaCut"):
            img = crop_to_square(img)
        
        webp_path = f'assets/renders/{filename}.webp'
        img.save(webp_path, 'WEBP')
        return webp_path
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
    return None

# Read characters.json
with open('characters.json', 'r') as f:
    characters = json.load(f)

# Process each character
for i, character in enumerate(characters):
    image_path = character['image_url']
    
    if os.path.exists(image_path):
        filename = os.path.splitext(os.path.basename(image_path))[0]
        new_path = process_image(image_path, filename)
        
        if new_path:
            character['image_url'] = new_path
            print(f"Processed {i+1}/{len(characters)}: {image_path}")
        else:
            print(f"Failed to process {i+1}/{len(characters)}: {image_path}")
    else:
        print(f"File not found: {image_path}")

# Save the updated character data
with open('characters.json', 'w') as f:
    json.dump(characters, f, indent=2)

print("Processing complete. Check the console output for any errors.")