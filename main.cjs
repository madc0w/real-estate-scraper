const puppeteer = require('puppeteer');
const fs = require('fs');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
// const createCsvStringifier = require('csv-writer').createObjectCsvStringifier;

const maxPages = 500;
const maxArea = 800;
const areaStep = 20;
const outFileName = 'athome.csv';

async function readExistingUrls() {
	console.log(`Reading existing URLs from ${outFileName}...`);
	const existingUrls = new Set();

	try {
		if (fs.existsSync(outFileName)) {
			const csvContent = fs.readFileSync(outFileName, 'utf-8');
			const lines = csvContent.split('\n');

			// Skip header row and process data rows
			for (let i = 1; i < lines.length; i++) {
				const line = lines[i].trim();
				if (line) {
					// Parse CSV line - URL is the second column (index 1)
					const columns = line.split(',');
					if (columns.length > 1) {
						// Remove quotes if present and clean the URL
						const url = columns[1].replace(/^"/, '').replace(/"$/, '').trim();
						if (url && url !== 'URL') {
							// Skip header if it somehow got through
							existingUrls.add(url);
						}
					}
				}
			}
			console.log(`Found ${existingUrls.size} existing URLs in ${outFileName}`);
		} else {
			console.log(`${outFileName} does not exist, will create new file`);
		}
	} catch (error) {
		console.error('Error reading existing CSV file:', error);
	}

	return existingUrls;
}

async function scrapeAtHomeLu() {
	console.log(`Starting scraper for ${outFileName}...`);

	// Read existing URLs to avoid duplicates
	const existingUrls = await readExistingUrls();

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: { width: 1920, height: 1080 },
	});

	const allPropertyLinks = new Set(); // Use Set to avoid duplicates

	// Check if CSV file exists to determine if we need to write headers
	const csvExists = fs.existsSync(outFileName);

	const csvWriter = createCsvWriter({
		path: outFileName,
		header: [
			{ id: 'date', title: 'Date Added' },
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
			{ id: 'creationDate', title: 'Creation Date' },
			{ id: 'updateDate', title: 'Update Date' },
		],
		append: csvExists, // Append to existing file if it exists
	});

	let totalRecordsWritten = 0;

	try {
		const page = await browser.newPage();

		// Set user agent to avoid being blocked
		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);

		for (let area = 1; area <= maxArea; area += areaStep) {
			for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
				const toArea = area + areaStep - 1;
				const pageUrl = `https://www.athome.lu/vente/?tr=buy&page=${pageNum}&srf_min=${area}&srf_max=${toArea}`;
				console.log(
					`${new Date().toISOString()} : Navigating to page ${pageNum} for area ${area} - ${toArea} m²: ${pageUrl}`
				);

				try {
					await page.goto(pageUrl, {
						waitUntil: 'networkidle2',
						timeout: 30000,
					});

					// Wait for the page to load completely
					await new Promise((resolve) => setTimeout(resolve, 800));

					// Extract all links starting with "/vente/"
					let propertyLinks = await page.evaluate(() => {
						const links = document.querySelectorAll('a');
						return Array.from(links).map((link) => link.href);
					});

					// console.log('unfiltered', propertyLinks);
					propertyLinks = Array.from(propertyLinks).filter((link) => {
						const urlPattern = /\/id-\d+\.html$/;
						return urlPattern.test(link);
					});
					// console.log('filtered', propertyLinks);

					console.log(`Found ${propertyLinks.length} links on page ${pageNum}`);
					// console.log(propertyLinks);
					if (propertyLinks.length === 0) {
						break;
					}
					propertyLinks.forEach((link) => allPropertyLinks.add(link));
					console.log(`${allPropertyLinks.size} listings found so far`);
				} catch (error) {
					console.error(`Error on page ${pageNum} for area ${area}m²:`, error);
					continue; // Continue with next page if this one fails
				}
			}
		}

		console.log(`Total unique property links found: ${allPropertyLinks.size}`);

		// Filter out URLs that already exist in the CSV
		const newPropertyLinks = Array.from(allPropertyLinks).filter(
			(link) => !existingUrls.has(link)
		);
		console.log(
			`Found ${newPropertyLinks.length} new URLs to scrape (${existingUrls.size} already exist)`
		);

		if (newPropertyLinks.length === 0) {
			console.log(
				`No new URLs to scrape. All listings already exist in ${outFileName}`
			);
			await browser.close();
			return;
		}

		// Now visit each NEW property page and extract data
		let propertyCount = 0;
		for (const propertyLink of newPropertyLinks) {
			propertyCount++;
			console.log(
				`${new Date().toISOString()} : Processing listing ${propertyCount}/${
					newPropertyLinks.length
				}: ${propertyLink}`
			);

			try {
				await page.goto(propertyLink, {
					waitUntil: 'networkidle2',
					timeout: 30000,
				});

				// Wait for the page to load completely
				await new Promise((resolve) => setTimeout(resolve, 800));

				// Extract property data from structured JSON data
				const propertyInfo = await page.evaluate((url) => {
					// Initialize data structure
					const data = {
						url,
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
						date: '',
						creationDate: '',
						updateDate: '',
					};

					try {
						// Extract structured data from window.AT_HOME_APP
						const appData =
							window.AT_HOME_APP?.preloadedState?.listing?.listing;

						if (!appData) {
							console.log(
								'No structured data found, falling back to DOM scraping'
							);
							throw new Error('No structured data available');
						}

						// Price information
						if (appData.price) {
							data.priceFrom = appData.price.toString();
							// For ranges, we'd need to check if there are min/max values
							// but typically athome.lu shows single prices
						}

						// Image URL - get first photo
						if (appData.media?.photos && appData.media.photos.length > 0) {
							// The photos array contains relative paths, need to construct full URL
							data.imageUrl =
								'https://static.athome.lu' + appData.media.photos[0];
						}

						// Location - construct from address object
						if (appData.address) {
							const addr = appData.address;
							const locationParts = [];
							if (addr.street) locationParts.push(addr.street);
							if (addr.city) locationParts.push(addr.city);
							if (addr.zip) locationParts.push(addr.zip);
							data.location = locationParts.join(', ');
						}

						// Area/Surface information
						if (appData.characteristic?.surface) {
							data.areaFrom = appData.characteristic.surface.toString();
						}

						// Description
						if (appData.description) {
							data.description = appData.description.replace(/\n/g, ' ').trim();
						}

						// Agency information
						if (appData.contact) {
							data.agencyName = appData.contact.name || '';

							// Phone - prefer mobile, fallback to regular phone
							data.contactPhone =
								appData.contact.mobilePhone || appData.contact.phone || '';

							// Email
							data.contactEmail = appData.contact.email || '';

							// If we have agent info, prefer agent's contact details
							if (appData.contact.agent) {
								if (appData.contact.agent.email) {
									data.contactEmail = appData.contact.agent.email;
								}
								if (appData.contact.agent.mobilePhone) {
									data.contactPhone = appData.contact.agent.mobilePhone;
								}
							}
						}

						// Creation and update dates
						if (appData.createdAt) {
							data.creationDate = appData.createdAt;
						}
						if (appData.updatedAt) {
							data.updateDate = appData.updatedAt;
						}

						console.log('Successfully extracted structured data');
						return data;
					} catch (error) {
						console.log(
							'Structured data extraction failed, falling back to DOM scraping:',
							error.message
						);

						// Fallback to original DOM scraping method
						function getTextContent(selector) {
							return document.querySelector(selector)?.textContent.trim() || '';
						}

						function getAttribute(selector, attr) {
							return document.querySelector(selector)?.getAttribute(attr) || '';
						}

						// Price range - try multiple selectors and parse
						const priceText =
							getTextContent('.property-price') ||
							getTextContent('.price') ||
							getTextContent('[class*="price"]') ||
							getTextContent('.property-details__price');

						if (priceText) {
							const cleanPriceText = priceText.replace(/\s+/g, ' ').trim();
							const rangeMatch = cleanPriceText.match(
								/(\d+(?:\s+\d+)*)\s*€.*?(\d+(?:\s+\d+)*)\s*€/
							);
							if (rangeMatch) {
								data.priceFrom = rangeMatch[1].replace(/\s+/g, '');
								data.priceTo = rangeMatch[2].replace(/\s+/g, '');
							} else {
								const singlePriceMatch =
									cleanPriceText.match(/(\d+(?:\s+\d+)*)/);
								if (singlePriceMatch) {
									data.priceFrom = singlePriceMatch[1].replace(/\s+/g, '');
								}
							}
						}

						// Image URL
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

						if (locationText) {
							data.location = locationText.replace(/^à\s*/i, '').trim();
						}

						// Square meters
						const surfaceText =
							getTextContent('[class*="surface"]') ||
							getTextContent('[class*="area"]') ||
							getTextContent('.property-surface') ||
							document.body.textContent.match(
								/(\d+(?:\s+\d+)*)\s*m[²2]/
							)?.[0] ||
							'';

						if (surfaceText) {
							const cleanSurfaceText = surfaceText.replace(/\s+/g, ' ').trim();
							const areaRangeMatch = cleanSurfaceText.match(
								/(\d+(?:\s+\d+)*)\s*m[²2].*?(\d+(?:\s+\d+)*)\s*m[²2]/
							);
							if (areaRangeMatch) {
								data.areaFrom = areaRangeMatch[1].replace(/\s+/g, '');
								data.areaTo = areaRangeMatch[2].replace(/\s+/g, '');
							} else {
								const singleAreaMatch = cleanSurfaceText.match(
									/(\d+(?:\s+\d+)*)\s*m[²2]/
								);
								if (singleAreaMatch) {
									data.areaFrom = singleAreaMatch[1].replace(/\s+/g, '');
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

						// Contact email - try specific selectors first
						data.contactEmail =
							getAttribute('a[href^="mailto:"]', 'href')?.replace(
								'mailto:',
								''
							) ||
							getTextContent('a[href^="mailto:"]') ||
							getTextContent('[class*="email"]') ||
							getTextContent('.contact-email') ||
							getTextContent('.agency-email') ||
							(() => {
								const emailMatches = document.body.textContent.match(
									/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g
								);
								return emailMatches ? emailMatches[0] : '';
							})() ||
							'';

						// Clean up email
						if (data.contactEmail) {
							const emailMatch = data.contactEmail.match(
								/^([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/
							);
							if (emailMatch) {
								data.contactEmail = emailMatch[1];
							}
						}

						// Clean up the data
						Object.keys(data).forEach((key) => {
							if (typeof data[key] === 'string') {
								data[key] = data[key].replace(/\s+/g, ' ').trim();
							}
						});

						return data;
					}
				}, propertyLink);

				// Add current timestamp
				propertyInfo.date = new Date().toISOString();

				// Write this property's data immediately to CSV
				await csvWriter.writeRecords([propertyInfo]);
				totalRecordsWritten++;
				// console.log(
				// 	`Extracted and saved data for property ${propertyCount} (${totalRecordsWritten} total records written)`
				// );

				// Small delay to be respectful to the server
				await new Promise((resolve) => setTimeout(resolve, 400));
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
					date: new Date().toISOString(),
					creationDate: '',
					updateDate: '',
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
			`Scraping completed! Processed ${propertyCount} new properties (filtered from ${allPropertyLinks.size} total) and wrote ${totalRecordsWritten} records to ${outFileName}`
		);
	} catch (error) {
		console.error('Error occurred:', error);
	} finally {
		await browser.close();
		// console.log('Browser closed.');
	}
}

// Run the scraper
scrapeAtHomeLu().catch(console.error);
