const puppeteer = require('puppeteer');
// const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const numPages = 500;
// const numPages = 4;

async function scrapeAtHomeLu() {
	console.log('Starting scraper for athome.lu...');

	const browser = await puppeteer.launch({
		headless: true, // Running in headless mode
		defaultViewport: { width: 1920, height: 1080 },
	});

	// const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const allPropertyLinks = new Set(); // Use Set to avoid duplicates

	// Setup CSV writer
	const csvWriter = createCsvWriter({
		path: 'out.csv',
		header: [
			{ id: 'url', title: 'URL' },
			{ id: 'priceFrom', title: 'Price From' },
			{ id: 'priceTo', title: 'Price To' },
			{ id: 'imageUrl', title: 'Image URL' },
			{ id: 'location', title: 'Location' },
			{ id: 'areaFrom', title: 'Area From' },
			{ id: 'areaTo', title: 'Area To' },
			{ id: 'description', title: 'Description' },
			{ id: 'agencyName', title: 'Agency Name' },
			{ id: 'contactPhone', title: 'Contact Phone' },
			{ id: 'contactEmail', title: 'Contact Email' },
		],
	});

	let totalRecordsWritten = 0;

	try {
		const page = await browser.newPage();

		// Set user agent to avoid being blocked
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);

		// Iterate through pages 1-20
		for (let pageNum = 1; pageNum <= numPages; pageNum++) {
			const pageUrl = `https://www.athome.lu/vente/?tr=buy&page=${pageNum}`;
			console.log(`Navigating to page ${pageNum}: ${pageUrl}`);

			try {
				await page.goto(pageUrl, {
					waitUntil: 'networkidle2',
					timeout: 30000,
				});

				// Wait for the page to load completely
				await new Promise((resolve) => setTimeout(resolve, 2000));

				// Extract all links starting with "/vente/"
				const propertyLinks = await page.evaluate(() => {
					const links = document.querySelectorAll('a[href^="/vente/"]');
					return Array.from(links).map((link) => link.href);
				});

				console.log(
					`Found ${propertyLinks.length} property links on page ${pageNum}`
				);

				// Add links to our set
				propertyLinks.forEach((link) => allPropertyLinks.add(link));
			} catch (error) {
				console.error(`Error on page ${pageNum}:`, error);
				continue; // Continue with next page if this one fails
			}
		}

		console.log(`Total unique property links found: ${allPropertyLinks.size}`);

		// Filter URLs to only include those matching the pattern: https://www.athome.lu/vente/[path]/id-[id].html
		const filteredPropertyLinks = Array.from(allPropertyLinks).filter(
			(link) => {
				const urlPattern =
					/^https:\/\/www\.athome\.lu\/vente\/.*\/id-\d+\.html$/;
				return urlPattern.test(link);
			}
		);

		console.log(
			`Filtered to ${filteredPropertyLinks.length} URLs matching pattern (out of ${allPropertyLinks.size} total)`
		);

		// Now visit each property page and extract data
		let propertyCount = 0;
		for (const propertyLink of filteredPropertyLinks) {
			propertyCount++;
			console.log(
				`Processing property ${propertyCount}/${filteredPropertyLinks.length}: ${propertyLink}`
			);

			try {
				await page.goto(propertyLink, {
					waitUntil: 'networkidle2',
					timeout: 30000,
				});

				// Wait for the page to load completely
				await new Promise((resolve) => setTimeout(resolve, 1000));

				// Extract property data
				const propertyInfo = await page.evaluate((url) => {
					// Helper function to safely get text content
					const getTextContent = (selector) => {
						const element = document.querySelector(selector);
						return element ? element.textContent.trim() : '';
					};

					// Helper function to get attribute
					const getAttribute = (selector, attribute) => {
						const element = document.querySelector(selector);
						return element ? element.getAttribute(attribute) : '';
					};

					// Extract data
					const data = {
						url: url,
						priceFrom: '',
						priceTo: '',
						imageUrl: '',
						location: '',
						areaFrom: '',
						areaTo: '',
						description: '',
						agencyName: '',
						contactPhone: '',
						contactEmail: '',
					};

					// Price range - try multiple selectors and parse
					const priceText =
						getTextContent('.property-price') ||
						getTextContent('.price') ||
						getTextContent('[class*="price"]') ||
						getTextContent('.property-details__price');

					if (priceText) {
						// Handle French price format like "De 698 914 € à 999 278 €"
						// Remove spaces and extract numbers with spaces between digits
						const cleanPriceText = priceText.replace(/\s+/g, ' ').trim();

						// Look for price ranges like "De 698 914 € à 999 278 €"
						const rangeMatch = cleanPriceText.match(
							/(\d+(?:\s+\d+)*)\s*€.*?(\d+(?:\s+\d+)*)\s*€/
						);
						if (rangeMatch) {
							// Remove spaces from numbers and convert to integers
							data.priceFrom = rangeMatch[1].replace(/\s+/g, '');
							data.priceTo = rangeMatch[2].replace(/\s+/g, '');
						} else {
							// Single price - look for any number with potential spaces
							const singlePriceMatch = cleanPriceText.match(/(\d+(?:\s+\d+)*)/);
							if (singlePriceMatch) {
								data.priceFrom = singlePriceMatch[1].replace(/\s+/g, '');
								// Leave priceTo empty for single prices
							}
						}
					}

					// Image URL - get the main property image, prioritizing div with class "square"
					data.imageUrl =
						getAttribute('.square img', 'src') ||
						getAttribute('[class*="square"] img', 'src') ||
						getAttribute('.property-image img', 'src') ||
						getAttribute('.gallery img', 'src') ||
						getAttribute('[class*="image"] img', 'src') ||
						getAttribute('img[src*="property"]', 'src');

					// Location
					const locationText =
						getTextContent('.property-location') ||
						getTextContent('.location') ||
						getTextContent('[class*="location"]') ||
						getTextContent('.property-address');

					// Remove "à" from the beginning of location
					if (locationText) {
						data.location = locationText.replace(/^à\s*/i, '').trim();
					}

					// Square meters - extract area information and parse
					const surfaceText =
						getTextContent('[class*="surface"]') ||
						getTextContent('[class*="area"]') ||
						getTextContent('.property-surface') ||
						document.body.textContent.match(/(\d+(?:\s+\d+)*)\s*m[²2]/)?.[0] ||
						'';

					if (surfaceText) {
						// Handle area ranges like "52 m² à 80 m²" or single areas like "75 m²"
						const cleanSurfaceText = surfaceText.replace(/\s+/g, ' ').trim();

						// Look for area ranges
						const areaRangeMatch = cleanSurfaceText.match(
							/(\d+(?:\s+\d+)*)\s*m[²2].*?(\d+(?:\s+\d+)*)\s*m[²2]/
						);
						if (areaRangeMatch) {
							// Remove spaces from numbers
							data.areaFrom = areaRangeMatch[1].replace(/\s+/g, '');
							data.areaTo = areaRangeMatch[2].replace(/\s+/g, '');
						} else {
							// Single area
							const singleAreaMatch = cleanSurfaceText.match(
								/(\d+(?:\s+\d+)*)\s*m[²2]/
							);
							if (singleAreaMatch) {
								data.areaFrom = singleAreaMatch[1].replace(/\s+/g, '');
								// Leave areaTo empty for single areas
							}
						}
					}

					// Description
					data.description =
						getTextContent('.property-description') ||
						getTextContent('.description') ||
						getTextContent('[class*="description"]') ||
						getTextContent('.property-details__description');

					// Agency name
					data.agencyName = getTextContent('.agency-details__name');

					// Contact phone
					data.contactPhone =
						getTextContent('[class*="phone"]') ||
						getTextContent('[href^="tel:"]') ||
						getTextContent('.contact-phone') ||
						document.body.textContent.match(
							/(\+?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3}[\s\-]?\d{2,3})/
						)?.[0] ||
						'';

					// Contact email
					data.contactEmail =
						getTextContent('[href^="mailto:"]') ||
						getAttribute('[href^="mailto:"]', 'href')?.replace('mailto:', '') ||
						document.body.textContent.match(
							/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
						)?.[0] ||
						'';

					// Clean up the data
					Object.keys(data).forEach((key) => {
						if (typeof data[key] === 'string') {
							data[key] = data[key].replace(/\s+/g, ' ').trim();
						}
					});

					return data;
				}, propertyLink);

				// Write this property's data immediately to CSV
				await csvWriter.writeRecords([propertyInfo]);
				totalRecordsWritten++;
				// console.log(
				// 	`Extracted and saved data for property ${propertyCount} (${totalRecordsWritten} total records written)`
				// );

				// Small delay to be respectful to the server
				await new Promise((resolve) => setTimeout(resolve, 500));
			} catch (error) {
				console.error(`Error processing property ${propertyLink}:`, error);
				// Add empty record to maintain count
				const errorRecord = {
					url: propertyLink,
					priceFrom: 'ERROR',
					priceTo: '',
					imageUrl: '',
					location: '',
					areaFrom: '',
					areaTo: '',
					description: '',
					agencyName: '',
					contactPhone: '',
					contactEmail: '',
				};

				// Write error record immediately to CSV
				await csvWriter.writeRecords([errorRecord]);
				totalRecordsWritten++;
				console.log(
					`Error record written for property ${propertyCount} (${totalRecordsWritten} total records written)`
				);
				continue; // Continue with next property if this one fails
			}
		}

		console.log(
			`Scraping completed! Processed ${propertyCount} properties (filtered from ${allPropertyLinks.size} total) and wrote ${totalRecordsWritten} records to out.csv`
		);
	} catch (error) {
		console.error('Error occurred:', error);
	} finally {
		await browser.close();
		console.log('Browser closed.');
	}
}

// Run the scraper
scrapeAtHomeLu().catch(console.error);
