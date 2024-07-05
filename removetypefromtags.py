import json

# Load the characters.json file
with open('characters.json', 'r') as f:
    characters = json.load(f)

# Tags to modify
types_to_modify = ["Melee Type", "Ranged Type", "Defense Type", "Support Type"]

# Function to remove "Type" from a tag
def remove_type(tag):
    return tag.replace(" Type", "") if tag in types_to_modify else tag

# Modify the tags for each character
for character in characters:
    character['tags'] = [remove_type(tag) for tag in character['tags']]

# Save the modified data back to characters.json
with open('characters.json', 'w') as f:
    json.dump(characters, f, indent=2)

print("'Type' has been removed from specific tags in characters.json")