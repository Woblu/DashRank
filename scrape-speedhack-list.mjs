import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';

// This is a FAKE URL and FAKE selectors. You must change these.
const BASE_URL = 'https://some-list-website.com';
const START_PATH = '/list';
const OUTPUT_FILE = path.join(process.cwd(), 'src', 'data', 'your-list-name.json');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function scrapeFullList() {
  let browser;
  try {
    console.log('Launching browser...');
    browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    // --- MODIFIED: A more robust way to set the timeout ---
    // Sets the timeout to 60 seconds for ALL subsequent navigations on this page.
    page.setDefaultNavigationTimeout(60000);

    console.log(`Navigating to main list page: ${BASE_URL + START_PATH}`);
    // We still use 'domcontentloaded' for faster page loads.
    await page.goto(BASE_URL + START_PATH, { waitUntil: 'domcontentloaded' });

    console.log('Scraping level links from the main page...');
    const levelLinks = await page.$$eval('.level-link-selector a', anchors => 
      anchors.map(a => a.href)
    );

    if (levelLinks.length === 0) {
      console.warn('Could not find any level links. The main page selector might be wrong.');
      await browser.close();
      return;
    }

    console.log(`Found ${levelLinks.length} levels to scrape. Starting detail page scraping...`);
    const allLevelsData = [];

    for (const link of levelLinks) {
      console.log(`Navigating to detail page: ${link}`);
      await page.goto(link, { waitUntil: 'domcontentloaded' }); // The 60s timeout applies here too

      const levelData = await page.evaluate(() => {
        const name = document.querySelector('.level-title-selector')?.innerText.trim() || '';
        const creator = document.querySelector('.creator-selector')?.innerText.trim() || '';
        const verifier = document.querySelector('.verifier-selector')?.innerText.trim() || '';
        const levelId = document.querySelector('.level-id-selector')?.innerText.trim() || '';
        const videoId = document.querySelector('.video-iframe-selector')?.src || '';

        return { name, creator, verifier, levelId, videoId, records: [] };
      });
      
      levelData.placement = allLevelsData.length + 1;
      allLevelsData.push(levelData);

      await sleep(1000);
    }

    console.log('Scraping complete. Saving data...');
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(allLevelsData, null, 2));
    console.log(`Successfully saved all data to ${OUTPUT_FILE}`);

  } catch (error) {
    console.error('An error occurred during the scraping process:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed.');
    }
  }
}

scrapeFullList();