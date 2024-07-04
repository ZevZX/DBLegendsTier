const fs = require('fs');

// Read the characters.json file
fs.readFile('characters.json', 'utf8', (err, data) => {
    if (err) {
        console.error("Error reading file:", err);
        return;
    }

    try {
        let characters = JSON.parse(data);

        // Modify the characters
        characters = characters.map(character => {
            if (character.is_lf && character.rarity === "SPARKING") {
                character.rarity = "LEGENDS LIMITED";
            }
            return character;
        });

        // Write the modified data back to the file
        fs.writeFile('characters.json', JSON.stringify(characters, null, 2), 'utf8', (err) => {
            if (err) {
                console.error("Error writing file:", err);
            } else {
                console.log("Successfully updated characters.json");
            }
        });

    } catch (err) {
        console.error("Error parsing JSON:", err);
    }
});