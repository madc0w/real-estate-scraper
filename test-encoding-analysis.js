/**
 * Test to analyze the actual byte encoding in the CSV
 */

const fs = require('fs');

function analyzeEncoding() {
	console.log('🔍 Analyzing CSV encoding');
	console.log('='.repeat(40));

	const csvPath = 'athome.csv';

	// Read as different encodings
	const encodings = ['utf8', 'latin1', 'ascii', 'utf16le'];

	encodings.forEach((encoding) => {
		try {
			console.log(`\n📄 Reading with ${encoding}:`);
			const content = fs.readFileSync(csvPath, encoding);

			// Find lines with problematic characters
			const lines = content.split('\n');
			const problemLines = lines.filter(
				(line) =>
					line.includes('Stra') ||
					line.includes('Vaux-sur') ||
					line.includes('Neunkirchen')
			);

			problemLines.forEach((line, index) => {
				if (index < 3) {
					// Only show first 3 matches
					console.log(`   Line ${index + 1}: ${line.substring(0, 100)}...`);

					// Look for the problematic parts
					const matches = line.match(/(Stra\S*|Vaux-sur-\S*|Neunkirchen-\S*)/g);
					if (matches) {
						matches.forEach((match) => {
							console.log(`     Problem word: "${match}"`);
							// Show character codes
							for (let i = 0; i < match.length; i++) {
								const char = match[i];
								const code = char.charCodeAt(0);
								if (code > 127) {
									console.log(
										`       "${char}" = ${code} (0x${code.toString(16)})`
									);
								}
							}
						});
					}
				}
			});
		} catch (error) {
			console.log(`   Error with ${encoding}: ${error.message}`);
		}
	});
}

analyzeEncoding();
