// Test script for web-search API
// Run with: node scripts/test-web-search.js

import fetch from 'node-fetch';
import { resolve } from 'path';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: resolve(__dirname, '../.env.local') });

async function testWebSearch() {
  console.log('Testing web-search API...');
  
  try {
    const response = await fetch('http://localhost:3000/api/web-search?query=Buffalo+Trace&distillery=Buffalo+Trace');
    
    if (!response.ok) {
      console.error(`Error: ${response.status} ${response.statusText}`);
      return;
    }
    
    const data = await response.json();
    
    console.log('Search query:', data.query);
    console.log('\nDistillery Information:');
    console.log('Name:', data.relatedInfo.distillery.name);
    console.log('Location:', data.relatedInfo.distillery.location);
    console.log('Founded:', data.relatedInfo.distillery.founded);
    
    console.log('\nProduct Information:');
    console.log('Average Rating:', data.relatedInfo.product.avgRating);
    console.log('Price Range:', `$${data.relatedInfo.product.price.low} - $${data.relatedInfo.product.price.high}`);
    
    console.log('\nTasting Notes:');
    console.log('Aroma:', data.relatedInfo.tastingNotes.expert.aroma);
    console.log('Taste:', data.relatedInfo.tastingNotes.expert.taste);
    console.log('Finish:', data.relatedInfo.tastingNotes.expert.finish);
    
    console.log('\nSearch Results:');
    data.results.forEach((result, index) => {
      console.log(`${index + 1}. ${result.title}`);
      console.log(`   Source: ${result.source}`);
    });
    
    console.log('\nTest completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testWebSearch(); 