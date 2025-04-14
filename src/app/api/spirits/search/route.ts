import { NextResponse } from 'next/server';
import { load } from 'cheerio';

interface SpiritSearchResult {
  name: string;
  distillery: string;
  type: string;
  proof: number | null;
  price: number | null;
  releaseYear: number | null;
  description: string | null;
  imageUrl: string | null;
}

// Comprehensive spirits database with accurate information
const spiritsDatabase = [
  // Bourbon
  {
    name: "Buffalo Trace",
    distillery: "Buffalo Trace",
    type: "Bourbon",
    proof: 90,
    price: 29.99,
    releaseYear: null,
    description: "Aromas of vanilla, mint, and molasses. Pleasantly sweet with notes of brown sugar and spice that give way to oak, toffee, dark fruit and anise.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_buf15.jpg"
  },
  {
    name: "Eagle Rare 10 Year",
    distillery: "Buffalo Trace",
    type: "Bourbon",
    proof: 90,
    price: 44.99,
    releaseYear: null,
    description: "Aged for a minimum of 10 years, this bourbon has notes of candied almonds and rich cocoa with a dry and delicate finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_eag10.jpg"
  },
  {
    name: "Maker's Mark",
    distillery: "Maker's Mark",
    type: "Bourbon",
    proof: 90,
    price: 29.99,
    releaseYear: null,
    description: "Sweet and balanced with notes of caramel, vanilla, and fruity essences. Smooth and subtle finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_mak1.jpg"
  },
  {
    name: "Woodford Reserve",
    distillery: "Woodford Reserve",
    type: "Bourbon",
    proof: 90.4,
    price: 34.99,
    releaseYear: null,
    description: "Rich, smooth, and complex with notes of dried fruit, mint, and cocoa. Creamy vanilla and toffee finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_woo8.jpg"
  },
  {
    name: "Blanton's Original Single Barrel",
    distillery: "Buffalo Trace",
    type: "Bourbon",
    proof: 93,
    price: 59.99,
    releaseYear: null,
    description: "Full and soft with a powerful dry vanilla spice. Honeyed notes of oak and caramel lead to a smooth finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_bla1.jpg"
  },
  {
    name: "Knob Creek 9 Year",
    distillery: "Jim Beam",
    type: "Bourbon",
    proof: 100,
    price: 34.99,
    releaseYear: null,
    description: "Full-bodied, rich and sweet with notes of maple and vanilla. Strong oak finish with hints of caramel.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_kno1.jpg"
  },
  {
    name: "Four Roses Single Barrel",
    distillery: "Four Roses",
    type: "Bourbon",
    proof: 100,
    price: 44.99,
    releaseYear: null,
    description: "Hints of plum and cherries with robust, spicy character. Smooth and mellow with a long finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_fou13.jpg"
  },
  {
    name: "Wild Turkey 101",
    distillery: "Wild Turkey",
    type: "Bourbon",
    proof: 101,
    price: 24.99,
    releaseYear: null,
    description: "Rich and complex with notes of caramel, vanilla, and hints of honey and oranges. Bold finish with spice and sweetness.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_wil16.jpg"
  },
  {
    name: "Elijah Craig Small Batch",
    distillery: "Heaven Hill",
    type: "Bourbon",
    proof: 94,
    price: 29.99,
    releaseYear: null,
    description: "Smooth with notes of vanilla, caramel, and nutmeg. Warming spice finish with hints of smoke and oak.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_eli4.jpg"
  },
  {
    name: "Jack Daniel's Old No. 7",
    distillery: "Jack Daniel's",
    type: "Tennessee Whiskey",
    proof: 80,
    price: 25.99,
    releaseYear: null,
    description: "Mellowed with charcoal for a smooth, sweet taste with hints of vanilla, caramel, and oak.",
    imageUrl: "https://img.thewhiskyexchange.com/900/ameri_jac8.jpg"
  },
  
  // Rye Whiskey
  {
    name: "Bulleit Rye",
    distillery: "Bulleit",
    type: "Rye",
    proof: 90,
    price: 29.99,
    releaseYear: null,
    description: "Russet in color with rich oaky aromas. Exceptionally smooth with hints of vanilla, honey, and spice.",
    imageUrl: "https://img.thewhiskyexchange.com/900/rye_bul1.jpg"
  },
  {
    name: "Sazerac Rye",
    distillery: "Buffalo Trace",
    type: "Rye",
    proof: 90,
    price: 32.99,
    releaseYear: null,
    description: "Notes of candied spices and citrus. Oak and vanilla flavors with a hint of chocolate.",
    imageUrl: "https://img.thewhiskyexchange.com/900/rye_saz1.jpg"
  },
  {
    name: "Pikesville Straight Rye",
    distillery: "Heaven Hill",
    type: "Rye",
    proof: 110,
    price: 49.99,
    releaseYear: null,
    description: "Dusty cocoa notes with oaky smoke underneath. Dry and spicy with hints of honeyed rye and cloves.",
    imageUrl: "https://img.thewhiskyexchange.com/900/rye_pik1.jpg"
  },
  {
    name: "WhistlePig 10 Year",
    distillery: "WhistlePig",
    type: "Rye",
    proof: 100,
    price: 79.99,
    releaseYear: null,
    description: "Deep and rich with winter fruit, dark spices, vanilla, and caramel. Long finish with oak and spice.",
    imageUrl: "https://img.thewhiskyexchange.com/900/rye_whi4.jpg"
  },
  {
    name: "Rittenhouse Rye",
    distillery: "Heaven Hill",
    type: "Rye",
    proof: 100,
    price: 27.99,
    releaseYear: null,
    description: "Spicy with a good dose of oak and vanilla. Smooth with a long finish of cinnamon and sweet fruit.",
    imageUrl: "https://img.thewhiskyexchange.com/900/rye_rit1.jpg"
  },
  
  // Scotch Whisky
  {
    name: "Lagavulin 16 Year",
    distillery: "Lagavulin",
    type: "Scotch",
    proof: 86,
    price: 99.99,
    releaseYear: null,
    description: "Intensely smoky and rich with deep complexity. Notes of dry peat, sea salt, and sweet nuttiness.",
    imageUrl: "https://img.thewhiskyexchange.com/900/laga_16y1.jpg"
  },
  {
    name: "Glenfiddich 12 Year",
    distillery: "Glenfiddich",
    type: "Scotch",
    proof: 80,
    price: 39.99,
    releaseYear: null,
    description: "Distinctively fresh and fruity with a hint of pear. Develops into butterscotch, cream, and malt.",
    imageUrl: "https://img.thewhiskyexchange.com/900/glenf_12y1.jpg"
  },
  {
    name: "Macallan 12 Year Double Cask",
    distillery: "Macallan",
    type: "Scotch",
    proof: 86,
    price: 69.99,
    releaseYear: null,
    description: "Rich with honey and dried fruits. Balanced with wood spice and citrus, finishing with warm oak.",
    imageUrl: "https://img.thewhiskyexchange.com/900/macob_12y25.jpg"
  },
  {
    name: "Ardbeg 10 Year",
    distillery: "Ardbeg",
    type: "Scotch",
    proof: 92,
    price: 59.99,
    releaseYear: null,
    description: "Powerful peat and smoky fruit flavors with notes of coffee and bacon. Long and spicy finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/ardbe_10y1.jpg"
  },
  {
    name: "Balvenie DoubleWood 12 Year",
    distillery: "Balvenie",
    type: "Scotch",
    proof: 86,
    price: 64.99,
    releaseYear: null,
    description: "Sweet fruit and Oloroso sherry notes, layered with honey and vanilla. Spicy with a long, warming finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/balve_12y1.jpg"
  },
  
  // Irish Whiskey
  {
    name: "Jameson",
    distillery: "Jameson",
    type: "Irish Whiskey",
    proof: 80,
    price: 24.99,
    releaseYear: null,
    description: "Perfect balance of spicy, nutty and vanilla notes with hints of sweet sherry. Smooth and mellow.",
    imageUrl: "https://img.thewhiskyexchange.com/900/irish_jam1.jpg"
  },
  {
    name: "Redbreast 12 Year",
    distillery: "Redbreast",
    type: "Irish Whiskey",
    proof: 80,
    price: 64.99,
    releaseYear: null,
    description: "Full-flavored and complex with a balance of spicy, creamy, fruity, sherry and toasted notes.",
    imageUrl: "https://img.thewhiskyexchange.com/900/irish_red3.jpg"
  },
  {
    name: "Green Spot",
    distillery: "Mitchell & Son",
    type: "Irish Whiskey",
    proof: 80,
    price: 59.99,
    releaseYear: null,
    description: "Fresh aromatic oils and spices with orchard fruits and barley. Flavors of toasted wood, vanilla, and ginger.",
    imageUrl: "https://img.thewhiskyexchange.com/900/irish_gre1.jpg"
  },
  
  // Japanese Whisky
  {
    name: "Suntory Toki",
    distillery: "Suntory",
    type: "Japanese Whisky",
    proof: 86,
    price: 39.99,
    releaseYear: null,
    description: "Silky with a subtly sweet and spicy finish. Notes of grapefruit, green grapes, and thyme.",
    imageUrl: "https://img.thewhiskyexchange.com/900/japan_tok1.jpg"
  },
  {
    name: "Nikka Coffey Grain",
    distillery: "Nikka",
    type: "Japanese Whisky",
    proof: 90,
    price: 69.99,
    releaseYear: null,
    description: "Rich with aromas of bourbon, vanilla, and corn. Sweet, fruity flavors with a touch of spice.",
    imageUrl: "https://img.thewhiskyexchange.com/900/japan_nik20.jpg"
  },
  {
    name: "Yamazaki 12 Year",
    distillery: "Suntory",
    type: "Japanese Whisky",
    proof: 86,
    price: 129.99,
    releaseYear: null,
    description: "Succulent notes of peach, pineapple and grapefruit. Mizunara (Japanese oak) spice with a complex finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/japan_yam2.jpg"
  },
  
  // Specialty and Limited Release
  {
    name: "Still Austin Bottled in Bond",
    distillery: "Still Austin",
    type: "Bourbon",
    proof: 100,
    price: 49.99,
    releaseYear: 2020,
    description: "Texas high-rye bourbon with notes of tropical fruit, dark chocolate, and cinnamon. Long, smooth finish.",
    imageUrl: "https://products0.imgix.drizly.com/ci-still-austin-bourbon-whiskey-bottled-in-bond-ffafdf37ed77cf07.jpeg"
  },
  {
    name: "Jack Daniel's Bonded",
    distillery: "Jack Daniel's",
    type: "Tennessee Whiskey",
    proof: 100,
    price: 36.99,
    releaseYear: 2022,
    description: "Bold and balanced with notes of caramel, oak, and spice. Rich in flavor with a lingering finish.",
    imageUrl: "https://www.jackdaniels.com/sites/default/files/2022-04/Jack-Daniels-Bonded-Bottle-shot.png"
  },
  {
    name: "1792 Small Batch",
    distillery: "Barton 1792",
    type: "Bourbon",
    proof: 93.7,
    price: 32.99,
    releaseYear: null,
    description: "Sweet and spicy with notes of caramel and vanilla. Bold and rich with an elegant finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_179.jpg"
  },
  {
    name: "Jefferson's Ocean Aged at Sea",
    distillery: "Jefferson's",
    type: "Bourbon",
    proof: 90,
    price: 79.99,
    releaseYear: null,
    description: "Caramelized sugars with hints of vanilla and caramel. Unique briny quality from sea aging.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_jef7.jpg"
  },
  {
    name: "Russell's Reserve Single Barrel",
    distillery: "Wild Turkey",
    type: "Bourbon",
    proof: 110,
    price: 64.99,
    releaseYear: null,
    description: "Bold and spicy with notes of vanilla, caramel, and oak. Deep complexity with a long finish.",
    imageUrl: "https://img.thewhiskyexchange.com/900/brbon_rus4.jpg"
  }
];

export async function GET(request: Request) {
  try {
    // Get search query from URL params
    const url = new URL(request.url);
    const query = url.searchParams.get('query');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Search query is too short' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Searching for spirit info: "${query}"`);

    // Improved search algorithm with a tiered approach
    const queryLower = query.toLowerCase();
    
    // 1. First try exact name or "distillery name" matches
    const exactMatches = spiritsDatabase.filter(spirit => 
      spirit.name.toLowerCase() === queryLower || 
      `${spirit.distillery.toLowerCase()} ${spirit.name.toLowerCase()}` === queryLower
    );
    
    if (exactMatches.length > 0) {
      return NextResponse.json({ spirits: exactMatches });
    }
    
    // 2. Try word-level matches (more precise than substring)
    const wordMatches = spiritsDatabase.filter(spirit => {
      const nameWords = spirit.name.toLowerCase().split(/\s+/);
      const distilleryWords = spirit.distillery.toLowerCase().split(/\s+/);
      const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2); // Ignore short words
      
      // Check if any query word exactly matches any word in name or distillery
      return queryWords.some(qWord => 
        nameWords.includes(qWord) || distilleryWords.includes(qWord)
      );
    });
    
    if (wordMatches.length > 0) {
      // Sort by match quality
      const sortedWordMatches = wordMatches.sort((a, b) => {
        // Count how many query words match in name and distillery
        const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);
        const aNameWords = a.name.toLowerCase().split(/\s+/);
        const bNameWords = b.name.toLowerCase().split(/\s+/);
        const aDistilleryWords = a.distillery.toLowerCase().split(/\s+/);
        const bDistilleryWords = b.distillery.toLowerCase().split(/\s+/);
        
        const aNameMatches = queryWords.filter(qw => aNameWords.includes(qw)).length;
        const bNameMatches = queryWords.filter(qw => bNameWords.includes(qw)).length;
        const aDistilleryMatches = queryWords.filter(qw => aDistilleryWords.includes(qw)).length;
        const bDistilleryMatches = queryWords.filter(qw => bDistilleryWords.includes(qw)).length;
        
        // Weight name matches more than distillery matches
        const aScore = (aNameMatches * 2) + aDistilleryMatches;
        const bScore = (bNameMatches * 2) + bDistilleryMatches;
        
        return bScore - aScore;
      });
      
      return NextResponse.json({ spirits: sortedWordMatches });
    }
    
    // 3. Fall back to substring matches with improved relevance scoring
    const partialMatches = spiritsDatabase.filter(spirit => {
      const nameMatch = spirit.name.toLowerCase().includes(queryLower);
      const distilleryMatch = spirit.distillery.toLowerCase().includes(queryLower);
      const typeMatch = spirit.type.toLowerCase().includes(queryLower);
      
      return nameMatch || distilleryMatch || typeMatch;
    });
    
    if (partialMatches.length > 0) {
      // Score and sort results by relevance
      const scoredResults = partialMatches.map(spirit => {
        let score = 0;
        
        // Name matches are most important
        if (spirit.name.toLowerCase().includes(queryLower)) {
          score += 10;
          // Bonus for matches at the beginning of name
          if (spirit.name.toLowerCase().startsWith(queryLower)) {
            score += 5;
          }
        }
        
        // Distillery matches are second most important
        if (spirit.distillery.toLowerCase().includes(queryLower)) {
          score += 5;
          // Bonus for matches at the beginning of distillery
          if (spirit.distillery.toLowerCase().startsWith(queryLower)) {
            score += 3;
          }
        }
        
        // Type matches are least important
        if (spirit.type.toLowerCase().includes(queryLower)) {
          score += 3;
        }
        
        return { spirit, score };
      }).sort((a, b) => b.score - a.score)
        .map(item => item.spirit);
      
      return NextResponse.json({ spirits: scoredResults });
    }

    // 4. If still no matches, try to suggest related spirits by type
    let suggestedType = '';
    if (queryLower.includes('bourbon')) suggestedType = 'Bourbon';
    else if (queryLower.includes('rye')) suggestedType = 'Rye';
    else if (queryLower.includes('scotch')) suggestedType = 'Scotch';
    else if (queryLower.includes('irish')) suggestedType = 'Irish Whiskey';
    else if (queryLower.includes('japanese')) suggestedType = 'Japanese Whisky';
    else if (queryLower.includes('tequila') || queryLower.includes('mezcal')) suggestedType = 'Tequila';
    
    if (suggestedType) {
      const similarSpirits = spiritsDatabase
        .filter(spirit => spirit.type === suggestedType)
        .slice(0, 5); // Return top 5 of that type
      
      if (similarSpirits.length > 0) {
        return NextResponse.json({ 
          spirits: similarSpirits,
          message: `No exact matches found for "${query}". Showing popular ${suggestedType} options instead.`
        });
      }
    }
    
    // 5. If still no matches, return a helpful message
    return NextResponse.json({ 
      spirits: [],
      message: `No matches found for "${query}". Try searching for a specific brand name, distillery, or type (like Bourbon, Rye, Scotch).`
    });
  } catch (error) {
    console.error('[ERROR] Spirit search error:', error);
    return NextResponse.json(
      { error: 'Failed to search for spirits' },
      { status: 500 }
    );
  }
} 