const puppeteer = require('puppeteer');

async function testSingleUrl() {
	const url =
		'https://www.athome.lu/fr/vente/projet-neuf/residence/brooklyn-luxembourg/id-8258648.html';

	console.log(`Testing URL: ${url}`);

	const browser = await puppeteer.launch({
		headless: true,
		defaultViewport: { width: 1920, height: 1080 },
	});

	try {
		const page = await browser.newPage();

		await page.setUserAgent(
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
		);

		console.log('Navigating to page...');
		await page.goto(url, {
			waitUntil: 'networkidle2',
			timeout: 30000,
		});

		await new Promise((resolve) => setTimeout(resolve, 2000));

		console.log('Extracting data...');
		const result = await page.evaluate((url) => {
			const data = {
				url,
				priceFrom: '',
				priceTo: '',
				areaFrom: '',
				areaTo: '',
				debug: {},
			};

			// Helper function to clean text
			function cleanText(text) {
				if (!text) return '';
				return String(text)
					.replace(/\n/g, ' ')
					.replace(/\r/g, ' ')
					.replace(/\t/g, ' ')
					.replace(/\s+/g, ' ')
					.trim();
			}

			// Check for window.AT_HOME_APP
			data.debug.hasAppData = !!window.AT_HOME_APP;
			if (window.AT_HOME_APP) {
				data.debug.appDataKeys = Object.keys(window.AT_HOME_APP);
				if (window.AT_HOME_APP.preloadedState) {
					data.debug.preloadedStateKeys = Object.keys(
						window.AT_HOME_APP.preloadedState
					);
					if (window.AT_HOME_APP.preloadedState.listing) {
						data.debug.listingKeys = Object.keys(
							window.AT_HOME_APP.preloadedState.listing
						);
					}
				}
			}

			// Try to extract from the main title/header area
			const titleElements = document.querySelectorAll(
				'h1, h2, .title, [class*="title"], [class*="header"]'
			);
			data.debug.titleTexts = Array.from(titleElements).map((el) =>
				cleanText(el.textContent)
			);

			// Look for price information in the page
			const priceTexts = [];
			const priceSelectors = [
				'[class*="price"]',
				'[data-testid*="price"]',
				'.property-price',
				'h1',
				'h2', // Sometimes prices are in headers
			];

			priceSelectors.forEach((selector) => {
				const elements = document.querySelectorAll(selector);
				elements.forEach((el) => {
					const text = cleanText(el.textContent);
					if (text && (text.includes('€') || text.includes('000'))) {
						priceTexts.push(text);
					}
				});
			});
			data.debug.priceTexts = priceTexts;

			// Look for area information
			const areaTexts = [];
			const areaSelectors = [
				'[class*="surface"]',
				'[class*="area"]',
				'[class*="m²"]',
				'h1',
				'h2', // Sometimes areas are in headers
			];

			areaSelectors.forEach((selector) => {
				const elements = document.querySelectorAll(selector);
				elements.forEach((el) => {
					const text = cleanText(el.textContent);
					if (text && (text.includes('m²') || text.includes('m2'))) {
						areaTexts.push(text);
					}
				});
			});
			data.debug.areaTexts = areaTexts;

			// Search for specific patterns in the entire page text
			const bodyText = document.body.textContent;

			// Look for "De X € à Y €" pattern
			const priceRangeMatch = bodyText.match(
				/De\s+(\d+(?:\s*\d+)*)\s*€\s+à\s+(\d+(?:\s*\d+)*)\s*€/i
			);
			if (priceRangeMatch) {
				data.priceFrom = priceRangeMatch[1].replace(/\s+/g, '');
				data.priceTo = priceRangeMatch[2].replace(/\s+/g, '');
				data.debug.priceRangeMatch = priceRangeMatch[0];
			}

			// Look for "De X à Y m²" pattern
			const areaRangeMatch = bodyText.match(
				/De\s+(\d+(?:\s*\d+)*)\s+à\s+(\d+(?:\s*\d+)*)\s*m[²2]/i
			);
			if (areaRangeMatch) {
				data.areaFrom = areaRangeMatch[1].replace(/\s+/g, '');
				data.areaTo = areaRangeMatch[2].replace(/\s+/g, '');
				data.debug.areaRangeMatch = areaRangeMatch[0];
			}

			return data;
		}, url);

		console.log('Extraction results:');
		console.log(JSON.stringify(result, null, 2));
	} catch (error) {
		console.error('Error:', error);
	} finally {
		await browser.close();
	}
}

testSingleUrl().catch(console.error);
