const fs = require('fs');
const path = require('path');
const directoryPath = './assets/renderswebp'; // Path to the renders directory

// Read files from the renders directory
const files = fs.readdirSync(directoryPath);

// Transform files into an array of objects with path, rarity, and cardNumber
const imagesInfo = files.filter(file => path.extname(file).toLowerCase() === '.webp')
                        .map(file => ({
                          path: 'assets/renderswebp/' + file, // Prepend 'assets/renderswebp/' to the path
                          rarity: '', // Leave rarity empty for now
                          cardNumber: '' // Leave cardNumber empty for now
                        }));

// Create JSON structure with "images" field and newlines
const jsonData = {
  "images": imagesInfo
};
const imagesJson = JSON.stringify(jsonData, null, 2);

// Specify the output JSON file name
const outputJsonFile = 'images.json';

// Write to images.json
fs.writeFile(outputJsonFile, imagesJson, (err) => {
    if (err) {
        console.error('Error writing to images.json:', err);
        return;
    }
    console.log('images.json has been updated with image paths, rarities, and card numbers.');
});