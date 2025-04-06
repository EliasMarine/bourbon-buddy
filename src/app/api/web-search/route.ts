import { NextResponse } from 'next/server';

// GET /api/web-search - Search the web for spirit information
export async function GET(request: Request) {
  try {
    // Get the search query from URL params
    const url = new URL(request.url);
    const query = url.searchParams.get('query');
    const distillery = url.searchParams.get('distillery') || '';
    const releaseYear = url.searchParams.get('releaseYear') || '';

    if (!query) {
      return NextResponse.json(
        { error: 'Missing search query' },
        { status: 400 }
      );
    }

    console.log(`[INFO] Performing web search for: "${query}"`);
    if (distillery) {
      console.log(`[INFO] Specified distillery: ${distillery}`);
    }
    if (releaseYear) {
      console.log(`[INFO] Specified release year: ${releaseYear}`);
    }

    // Perform a basic web search using a search API
    // For demonstration, we'll create some structured mock data
    // In a production app, you would use a proper web search API or scraper
    const searchResults = await mockWebSearch(query, distillery, releaseYear);
    
    console.log(`[INFO] Web search complete, found data for: ${searchResults.relatedInfo.distillery.name}`);

    return NextResponse.json(searchResults);
  } catch (error) {
    console.error('[ERROR] Web search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface ProductPrice {
  low: number;
  avg: number;
  high: number;
}

interface ExpertTastingNotes {
  aroma: string;
  taste: string;
  finish: string;
}

interface Distillery {
  name: string;
  location: string;
  founded: string;
  description: string;
}

interface Product {
  avgRating: string;
  price: ProductPrice;
  awards: string[];
  releaseYear?: string;
}

interface TastingNotes {
  expert: ExpertTastingNotes;
  community: string[];
}

interface SpiritData {
  distillery: Distillery;
  product: Product;
  tastingNotes: TastingNotes;
}

interface SpiritDataMap {
  [key: string]: SpiritData;
}

// Define common bourbon/whiskey/spirit patterns
const SPIRIT_DATA: SpiritDataMap = {
  // Bourbon brands
  "buffalo trace": {
    distillery: {
      name: "Buffalo Trace Distillery",
      location: "Frankfort, Kentucky, USA",
      founded: "1773 (as Old Fire Copper Distillery)",
      description: "One of America's oldest continuously operating distilleries that survived prohibition. Known for producing premium bourbons including Pappy Van Winkle, Eagle Rare, and Blanton's."
    },
    product: {
      avgRating: "8.5",
      price: { low: 25, avg: 30, high: 40 },
      awards: [
        "Gold Medal, San Francisco World Spirits Competition",
        "Distillery of the Year, Whisky Magazine 2020",
        "World's Best Bourbon, World Whiskies Awards"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Vanilla, mint, molasses and sweet corn",
        taste: "Brown sugar, toffee, oak with hints of dark fruit and anise",
        finish: "Medium-long, sweet with a touch of spice"
      },
      community: [
        "Well-balanced sweetness with notable vanilla notes",
        "Oak and caramel with minimal burn",
        "Great entry-level bourbon at an affordable price",
        "Smooth, easy drinking with subtle complexity"
      ]
    }
  },
  "makers mark": {
    distillery: {
      name: "Maker's Mark Distillery",
      location: "Loretto, Kentucky, USA",
      founded: "1953",
      description: "Known for its distinctive square bottles, red wax seal, and use of wheat instead of rye in the mash bill. A premium small-batch bourbon whisky."
    },
    product: {
      avgRating: "8.2",
      price: { low: 25, avg: 35, high: 45 },
      awards: [
        "Double Gold, San Francisco World Spirits Competition",
        "Gold Medal, International Spirits Challenge",
        "Kentucky Bourbon Hall of Fame"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Caramel, vanilla, and wheat with fruit notes",
        taste: "Sweet and balanced with vanilla, caramel and wheat bread",
        finish: "Smooth, medium length with warming spice"
      },
      community: [
        "Smooth and sweet due to the wheat mash bill",
        "Approachable with minimal burn",
        "Pleasant caramel and vanilla flavors",
        "Great for bourbon beginners and cocktails"
      ]
    }
  },
  "woodford reserve": {
    distillery: {
      name: "Woodford Reserve Distillery",
      location: "Versailles, Kentucky, USA",
      founded: "1812 (site), 1996 (brand)",
      description: "Located at the historic Labrot & Graham Distillery site. Known for small batch production methods and innovative finishing techniques."
    },
    product: {
      avgRating: "8.7",
      price: { low: 30, avg: 40, high: 55 },
      awards: [
        "Gold Medal, San Francisco World Spirits Competition",
        "Distillery of the Year, Icons of Whisky America",
        "Best Kentucky Bourbon, International Whisky Competition"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Rich dried fruit, vanilla, and toasted oak with hints of mint",
        taste: "Complex balance of spice, fruit, floral and sweet aromatics",
        finish: "Long, warm satisfying finish with hints of cinnamon and cocoa"
      },
      community: [
        "Complex flavor profile with excellent balance",
        "Great sipper with noticeable oak influence",
        "Rich mouthfeel with dried fruit notes",
        "Consistent quality across batches"
      ]
    }
  },
  "jack daniels": {
    distillery: {
      name: "Jack Daniel's Distillery",
      location: "Lynchburg, Tennessee, USA",
      founded: "1866",
      description: "The oldest registered distillery in the United States. Famous for its charcoal mellowing process known as the \"Lincoln County Process\"."
    },
    product: {
      avgRating: "7.8",
      price: { low: 20, avg: 28, high: 35 },
      awards: [
        "Gold Medal, San Francisco World Spirits Competition",
        "Master status, American Whiskey Masters",
        "Global Icon status in spirits industry"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Sweet caramel, vanilla, and charred oak with banana notes",
        taste: "Smooth and sweet with caramel, vanilla, and light oak char",
        finish: "Medium length with lingering sweetness and light spice"
      },
      community: [
        "Iconic sweet Tennessee whiskey profile",
        "Mellower than many bourbons due to charcoal filtering",
        "Very consistent and approachable",
        "Slight banana and caramel notes"
      ]
    }
  },
  "wild turkey": {
    distillery: {
      name: "Wild Turkey Distillery",
      location: "Lawrenceburg, Kentucky, USA",
      founded: "1869 (site), 1940 (brand)",
      description: "Known for high-proof bourbons with rich, bold flavors. Uses a higher percentage of rye in their mash bill than most bourbon producers."
    },
    product: {
      avgRating: "8.4",
      price: { low: 22, avg: 30, high: 45 },
      awards: [
        "Gold Medal, San Francisco World Spirits Competition",
        "Distiller of the Year, Whisky Advocate",
        "95 points, Ultimate Spirits Challenge"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Vanilla, caramel, and honey with bold spice and oak",
        taste: "Rich with caramel, vanilla, and bold rye spice",
        finish: "Long, warm finish with pepper, toast, and honey"
      },
      community: [
        "Bold, spicy character with noticeable rye influence",
        "Higher proof gives it a robust profile",
        "Great value for the quality",
        "Excellent for cocktails that need a punch"
      ]
    }
  },
  // Scotch whisky
  "lagavulin": {
    distillery: {
      name: "Lagavulin Distillery",
      location: "Islay, Scotland",
      founded: "1816",
      description: "Iconic Islay distillery known for heavily peated whiskies with maritime influence. Famous for their 16-year-old expression."
    },
    product: {
      avgRating: "9.2",
      price: { low: 75, avg: 90, high: 120 },
      awards: [
        "Double Gold, San Francisco World Spirits Competition",
        "Best Islay Single Malt, World Whiskies Awards",
        "95 points, Ultimate Spirits Challenge"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Intense peat smoke with iodine, seaweed and sweet spice",
        taste: "Rich, dried fruit sweetness with clouds of smoke and strong barley malt flavors",
        finish: "Long, elegant finish with smoke, spice and salt"
      },
      community: [
        "Quintessential Islay peat monster",
        "Wonderful balance between smoke and sweetness",
        "Complex medicinal character with sea spray notes",
        "Improves dramatically with time in the glass"
      ]
    }
  },
  "macallan": {
    distillery: {
      name: "The Macallan Distillery",
      location: "Speyside, Scotland",
      founded: "1824",
      description: "Prestigious distillery known for sherried whiskies and exceptional oak cask management. Often considered the \"Rolls Royce\" of single malts."
    },
    product: {
      avgRating: "9.0",
      price: { low: 70, avg: 120, high: 300 },
      awards: [
        "Double Gold, San Francisco World Spirits Competition",
        "Distillery of the Year, Icons of Whisky",
        "World's Best Single Malt, World Whiskies Awards"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Sherry, dried fruits, vanilla, and ginger with hints of orange zest",
        taste: "Rich dried fruits, spice, chocolate, and oak",
        finish: "Long, sweet finish with dried fruit, spice, and oak"
      },
      community: [
        "Rich sherried character with exceptional smoothness",
        "Luxurious mouthfeel with well-integrated oak",
        "Christmas cake flavors with elegant structure",
        "Benchmark for sherried Scotch"
      ]
    }
  },
  // Generic fallback
  "generic": {
    distillery: {
      name: "Traditional Distillery",
      location: "United States/Scotland/Ireland",
      founded: "Circa 1800s",
      description: "A traditional distillery producing quality spirits using time-honored techniques and locally sourced ingredients."
    },
    product: {
      avgRating: "8.2",
      price: { low: 35, avg: 50, high: 85 },
      awards: [
        "Gold Medal, International Spirits Competition",
        "Best in Class, Spirits Challenge",
        "Double Gold, Distillers Selection"
      ]
    },
    tastingNotes: {
      expert: {
        aroma: "Caramel, vanilla, oak, cinnamon, and dried fruit",
        taste: "Rich butterscotch, dark chocolate, and toasted nuts with hints of spice",
        finish: "Long, warming finish with notes of baking spices and honey"
      },
      community: [
        "Sweet caramel and vanilla on the nose",
        "Rich mouthfeel with notes of toffee and nuts",
        "Spicy finish with a pleasant warmth",
        "Hints of cherry and dark fruits",
        "Subtle oak influence throughout"
      ]
    }
  }
};

interface SearchResult {
  title: string;
  description: string;
  source: string;
  url: string;
}

interface WebSearchResult {
  query: string;
  results: SearchResult[];
  relatedInfo: SpiritData;
}

// Temporary mock function until we implement real search
async function mockWebSearch(query: string, distillery: string = '', releaseYear: string = ''): Promise<WebSearchResult> {
  console.log(`Running web search for query: "${query}", distillery: "${distillery}", releaseYear: "${releaseYear}"`);
  
  // Normalize inputs for matching
  const queryLower = query.toLowerCase().trim();
  const distilleryLower = distillery.toLowerCase().trim();
  
  // Find matching spirit data
  let matchedSpirit: SpiritData | null = null;
  let bestMatchScore = 0;
  let bestMatchKey = '';
  
  // Check for exact matches and partial matches
  for (const [key, data] of Object.entries(SPIRIT_DATA)) {
    let score = 0;
    const keyLower = key.toLowerCase();
    
    // Direct distillery name match (highest priority)
    if (distilleryLower && data.distillery.name.toLowerCase().includes(distilleryLower)) {
      score += 10;
      console.log(`Distillery match: +10 points for "${key}" - ${data.distillery.name} includes ${distilleryLower}`);
    }
    
    // Direct key match in query
    if (queryLower.includes(keyLower)) {
      score += 8;
      console.log(`Key match: +8 points for "${key}" - found in query`);
    }
    
    // Check for individual keyword matches
    const keyWords = keyLower.split(' ');
    const queryWords = queryLower.split(' ');
    
    // Check how many words from the key appear in the query
    for (const word of keyWords) {
      if (word.length > 2 && queryWords.includes(word)) { // Skip very short words
        score += 2;
        console.log(`Word match: +2 points for "${key}" - word "${word}" found in query`);
      }
    }
    
    // Check spirit type matches
    const spiritTypes = {
      'bourbon': 5,
      'scotch': 5, 
      'whisky': 4,
      'whiskey': 4,
      'rye': 4,
      'tennessee': 4,
      'irish': 4,
      'japanese': 4,
      'rum': 3,
      'tequila': 3,
      'gin': 3,
      'vodka': 3
    };
    
    for (const [type, typeScore] of Object.entries(spiritTypes)) {
      if (queryLower.includes(type) && keyLower.includes(type)) {
        score += typeScore;
        console.log(`Type match: +${typeScore} points for "${key}" - type "${type}" matches`);
      }
    }
    
    // Special case for "buffalo trace" and similar major distilleries
    // This helps recognize variants from the same distillery
    const majorDistilleries = [
      { name: 'buffalo trace', variants: ['eagle rare', 'blantons', 'weller', 'eh taylor', 'pappy'] },
      { name: 'wild turkey', variants: ['longbranch', 'rare breed', 'russell'] },
      { name: 'makers mark', variants: ['maker', '46'] },
      { name: 'jim beam', variants: ['knob creek', 'bookers', 'bakers', 'basil hayden'] },
      { name: 'heaven hill', variants: ['elijah craig', 'parker', 'evan williams'] }
    ];
    
    for (const major of majorDistilleries) {
      if (keyLower === major.name) {
        for (const variant of major.variants) {
          if (queryLower.includes(variant)) {
            score += 7;
            console.log(`Distillery family: +7 points for "${key}" - found variant "${variant}" in query`);
            break;
          }
        }
      }
    }
    
    console.log(`Total score for "${key}": ${score}`);
    
    // Update best match if this is better
    if (score > bestMatchScore) {
      bestMatchScore = score;
      bestMatchKey = key;
      matchedSpirit = data;
    }
  }
  
  // Debugging info about the match
  if (matchedSpirit) {
    console.log(`Best match: "${bestMatchKey}" with score ${bestMatchScore}`);
  } else {
    console.log(`No good match found, using fallback (best score was ${bestMatchScore})`);
  }
  
  // If no good match is found, use fallback data
  if (!matchedSpirit || bestMatchScore < 4) {
    matchedSpirit = getFallbackData(queryLower, distilleryLower);
  }
  
  // Add release year to the product data if provided
  if (releaseYear && matchedSpirit) {
    matchedSpirit.product.releaseYear = releaseYear;
  }
  
  // Generate search results
  const results = generateSearchResults(query, matchedSpirit);
  
  return {
    query,
    results,
    relatedInfo: matchedSpirit
  };
}

// Helper function to generate fallback data when no match is found
function getFallbackData(query: string, distillery: string): SpiritData {
  console.log(`Generating fallback data for query: "${query}", distillery: "${distillery}"`);
  
  // Extract brand and name from query
  const queryWords = query.split(' ');
  const extractedBrand = distillery || queryWords.slice(0, Math.min(2, queryWords.length)).join(' ');
  
  // Format brand/distillery name properly
  const distilleryName = extractedBrand
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
  
  // Detect spirit type
  let spiritType = 'whiskey';
  const typeDetectors = {
    'bourbon': ['bourbon'],
    'scotch': ['scotch', 'single malt'],
    'rye': ['rye'],
    'irish whiskey': ['irish'],
    'japanese whisky': ['japanese'],
    'tennessee whiskey': ['tennessee'],
    'tequila': ['tequila', 'mezcal', 'blanco', 'reposado', 'añejo'],
    'rum': ['rum'],
    'gin': ['gin'],
    'vodka': ['vodka']
  };
  
  // Find the spirit type from the query
  for (const [type, keywords] of Object.entries(typeDetectors)) {
    for (const keyword of keywords) {
      if (query.toLowerCase().includes(keyword)) {
        spiritType = type;
        break;
      }
    }
  }
  
  // Set distillery location based on spirit type
  let distilleryLocation = '';
  if (spiritType === 'bourbon') {
    distilleryLocation = 'Kentucky, USA';
  } else if (spiritType === 'scotch') {
    distilleryLocation = 'Scotland';
  } else if (spiritType === 'irish whiskey') {
    distilleryLocation = 'Ireland';
  } else if (spiritType === 'japanese whisky') {
    distilleryLocation = 'Japan';
  } else if (spiritType === 'tequila') {
    distilleryLocation = 'Jalisco, Mexico';
  } else if (spiritType === 'tennessee whiskey') {
    distilleryLocation = 'Tennessee, USA';
  } else {
    distilleryLocation = 'USA';
  }
  
  // Create a better description
  const description = `${distilleryName} is known for producing exceptional ${spiritType}. ` +
    `This particular expression is crafted using traditional methods and carefully selected ingredients ` +
    `to create a distinctive flavor profile.`;
  
  // Generate tasting notes based on spirit type
  const tastingNotes = generateTastingNotes(spiritType);
  
  // Extract a year from the query if present
  const yearMatch = query.match(/\b(19\d{2}|20\d{2})\b/);
  const releaseYear = yearMatch ? yearMatch[1] : undefined;
  
  // Generate realistic price range based on spirit type
  let priceRange = { low: 30, avg: 45, high: 65 }; // default
  
  if (spiritType === 'bourbon') {
    priceRange = { low: 35, avg: 55, high: 90 };
  } else if (spiritType === 'scotch') {
    priceRange = { low: 50, avg: 85, high: 150 };
  } else if (spiritType === 'japanese whisky') {
    priceRange = { low: 65, avg: 110, high: 180 };
  }
  
  // Extract age statement if present
  const ageMatch = query.match(/(\d+)\s*(?:year|yr)s?\s*(?:old)?/i);
  if (ageMatch && parseInt(ageMatch[1]) > 10) {
    // Increase price for older spirits
    const age = parseInt(ageMatch[1]);
    const multiplier = 1 + (age - 10) * 0.1;
    priceRange.avg = Math.round(priceRange.avg * multiplier);
    priceRange.high = Math.round(priceRange.high * multiplier);
  }
  
  return {
    distillery: {
      name: distilleryName,
      location: distilleryLocation,
      founded: "N/A", // We don't have reliable data
      description
    },
    product: {
      avgRating: "8.2",
      price: priceRange,
      releaseYear,
      awards: [
        `${spiritType.charAt(0).toUpperCase() + spiritType.slice(1)} Excellence Award`,
        "Silver Medal, International Spirits Challenge",
        "Recommended by Whisky/Spirits Monthly"
      ]
    },
    tastingNotes
  };
}

// Helper function to generate appropriate tasting notes based on spirit type
function generateTastingNotes(spiritType: string): any {
  // Base characteristics for different spirit types
  switch(spiritType) {
    case 'bourbon':
      return {
        expert: {
          aroma: "Caramel, vanilla, toasted oak, and hints of cinnamon and nutmeg",
          taste: "Rich caramel, vanilla, and oak with notes of baking spices and dried fruit",
          finish: "Medium to long with lingering sweetness and warm spice"
        },
        community: [
          "Excellent balance of sweet and spicy flavors",
          "Smooth mouthfeel with minimal burn",
          "Rich caramel and vanilla notes dominate",
          "Oak influence is well-integrated"
        ]
      };
    case 'scotch':
      return {
        expert: {
          aroma: "Heather honey, apple, pear with hints of vanilla and oak",
          taste: "Malty sweetness, dried fruits, and gentle oak with subtle spice notes",
          finish: "Medium length with pleasant warmth and lingering fruit"
        },
        community: [
          "Classic Scotch profile with excellent balance",
          "Honey and fruit notes blend beautifully",
          "Gentle oak influence gives nice structure",
          "Smooth with approachable character"
        ]
      };
    case 'rye':
      return {
        expert: {
          aroma: "Bold spice, pepper, and citrus with subtle vanilla and caramel",
          taste: "Spicy rye, black pepper, and cinnamon with underlying sweetness",
          finish: "Long and warming with lingering rye spice"
        },
        community: [
          "Assertive rye spice character throughout",
          "Good balance between spice and sweetness",
          "Complex with layered flavors",
          "Makes an excellent cocktail base"
        ]
      };
    case 'tequila':
      return {
        expert: {
          aroma: "Agave, citrus, herbs, and subtle pepper",
          taste: "Sweet agave, citrus zest, and herbaceous notes with white pepper",
          finish: "Clean with lingering sweetness and gentle spice"
        },
        community: [
          "Vibrant agave character with excellent clarity",
          "Well-balanced between sweet and earthy notes",
          "Smooth for its proof with minimal alcohol burn",
          "Versatile for sipping or cocktails"
        ]
      };
    default:
      // Generic whiskey notes
      return {
        expert: {
          aroma: "Vanilla, caramel, oak, and light spice notes",
          taste: "Balanced sweetness, vanilla, and oak with subtle fruit and spice",
          finish: "Medium with pleasant warmth and lingering flavors"
        },
        community: [
          "Approachable flavor profile with good complexity",
          "Well-balanced with no single element dominating",
          "Smooth with minimal harshness", 
          "Versatile for sipping or mixing"
        ]
      };
  }
}

// Helper function to generate search results
function generateSearchResults(query: string, spiritData: SpiritData): SearchResult[] {
  const brandName = query.split(' ').slice(0, 2).join(' ');
  
  return [
    {
      title: `${brandName} Official Site - Product Information`,
      description: `Official product page for ${query}. Learn about the history, production process, and tasting notes directly from the brand.`,
      source: `${brandName.replace(' ', '')}.com`,
      url: `https://www.${brandName.toLowerCase().replace(' ', '')}.com/products`
    },
    {
      title: `${query} Review - Whiskey Advocate`,
      description: `Expert tasting notes and rating for ${query}. ${spiritData.tastingNotes.expert.aroma}`,
      source: 'whiskyadvocate.com',
      url: 'https://www.whiskyadvocate.com/reviews/'
    },
    {
      title: `${spiritData.distillery.name}: History and Production`,
      description: `Learn about ${spiritData.distillery.name} located in ${spiritData.distillery.location}, founded in ${spiritData.distillery.founded}.`,
      source: 'distillerytrail.com',
      url: 'https://www.distillerytrail.com/blog/'
    },
    {
      title: `Where to Buy ${query} - Best Prices and Availability`,
      description: `Compare prices and find availability for ${query}. Current market value ranges from $${spiritData.product.price.low} to $${spiritData.product.price.high}.`,
      source: 'wine-searcher.com',
      url: 'https://www.wine-searcher.com/'
    }
  ];
} 