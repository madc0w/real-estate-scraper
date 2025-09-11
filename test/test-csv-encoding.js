/**
 * Test reading the CSV with different encodings to see which one preserves the characters correctly
 */

const fs = require('fs');
const path = require('path');

function testEncodings() {
	console.log('🔍 Testing CSV file encoding options');
	console.log('='.repeat(50));

	const csvPath = path.join(__dirname, 'athome.csv');
	const encodings = ['utf-8', 'latin1', 'ascii', 'utf16le'];

	encodings.forEach((encoding) => {
		try {
			console.log(`\n📄 Reading with ${encoding}:`);
			const content = fs.readFileSync(csvPath, encoding);

			// Find the Neunkirchen line
			const lines = content.split('\n');
			const neunkirchen = lines.find((line) => line.includes('Neunkirchen'));

			if (neunkirchen) {
				// Extract just the location part - it should be in quotes
				const locationMatch = neunkirchen.match(/"([^"]*Neunkirchen[^"]*)"/);
				if (locationMatch) {
					const location = locationMatch[1];
					console.log(`   Location field: ${location}`);

					// Check if it contains the problematic character
					if (location.includes('l') && location.includes('s-Bouzonville')) {
						const problematicPart = location.substring(
							location.indexOf('l'),
							location.indexOf('s-Bouzonville') + 12
						);
						console.log(`   Problematic part: "${problematicPart}"`);

						// Show character codes
						const chars = [];
						for (let i = 0; i < problematicPart.length; i++) {
							const char = problematicPart[i];
							chars.push(`"${char}"(${char.charCodeAt(0)})`);
						}
						console.log(`   Character codes: ${chars.join(' ')}`);
					}
				} else {
					console.log('   Could not extract location from line');
				}
			} else {
				console.log('   Neunkirchen line not found');
			}
		} catch (error) {
			console.log(`   Error with ${encoding}: ${error.message}`);
		}
	});
}

testEncodings();
