export interface SpiritCategory {
  id: string;
  name: string;
  subcategories: string[];
  icon?: string;
  description?: string;
}

// Comprehensive list of spirit categories and their types
const spiritCategories: SpiritCategory[] = [
  {
    id: 'whiskey',
    name: 'Whiskey',
    description: 'Distilled alcoholic beverage made from fermented grain mash',
    subcategories: [
      'Bourbon',
      'Rye',
      'Scotch',
      'Irish',
      'Japanese',
      'Canadian',
      'Tennessee',
      'Single Malt',
      'Blended',
      'Other Whiskey'
    ]
  },
  {
    id: 'tequila',
    name: 'Tequila',
    description: 'Distilled spirit made from the blue agave plant',
    subcategories: [
      'Blanco',
      'Reposado',
      'Añejo',
      'Extra Añejo',
      'Joven',
      'Cristalino',
      'Mezcal',
      'Other Tequila'
    ]
  },
  {
    id: 'rum',
    name: 'Rum',
    description: 'Distilled spirit made from sugarcane byproducts',
    subcategories: [
      'White/Silver',
      'Gold/Amber',
      'Dark/Black',
      'Spiced',
      'Aged',
      'Overproof',
      'Agricole',
      'Cachaça',
      'Other Rum'
    ]
  },
  {
    id: 'vodka',
    name: 'Vodka',
    description: 'Distilled beverage composed primarily of water and ethanol',
    subcategories: [
      'Unflavored',
      'Flavored',
      'Potato',
      'Grain',
      'Corn',
      'Fruit',
      'Other Vodka'
    ]
  },
  {
    id: 'gin',
    name: 'Gin',
    description: 'Spirit flavored with juniper berries and other botanicals',
    subcategories: [
      'London Dry',
      'Plymouth',
      'Old Tom',
      'Genever',
      'New American',
      'Navy Strength',
      'Flavored',
      'Other Gin'
    ]
  },
  {
    id: 'brandy',
    name: 'Brandy',
    description: 'Spirit produced by distilling wine or fermented fruit juice',
    subcategories: [
      'Cognac',
      'Armagnac',
      'Calvados',
      'Pisco',
      'American Brandy',
      'Fruit Brandy',
      'Eau de Vie',
      'Other Brandy'
    ]
  },
  {
    id: 'liqueur',
    name: 'Liqueur',
    description: 'Sweetened and flavored spirit, often with fruits, herbs, spices, flowers, nuts, or cream',
    subcategories: [
      'Fruit',
      'Herbal',
      'Nut',
      'Cream',
      'Coffee',
      'Chocolate',
      'Anise',
      'Bitter',
      'Other Liqueur'
    ]
  },
  {
    id: 'asian',
    name: 'Asian Spirits',
    description: 'Traditional spirits from Asia',
    subcategories: [
      'Sake',
      'Soju',
      'Baijiu',
      'Shochu',
      'Makgeolli',
      'Awamori',
      'Other Asian Spirit'
    ]
  },
  {
    id: 'beer',
    name: 'Beer',
    description: 'Alcoholic drink made from fermented cereal grains and flavored with hops',
    subcategories: [
      'IPA',
      'Stout',
      'Porter',
      'Lager',
      'Pilsner',
      'Wheat Beer',
      'Sour',
      'Ale',
      'Belgian',
      'Craft',
      'Other Beer'
    ]
  },
  {
    id: 'wine',
    name: 'Wine',
    description: 'Alcoholic drink made from fermented grape juice',
    subcategories: [
      'Red',
      'White',
      'Rosé',
      'Sparkling',
      'Dessert',
      'Fortified',
      'Natural',
      'Orange',
      'Other Wine'
    ]
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Other alcoholic beverages',
    subcategories: [
      'Absinthe',
      'Aquavit',
      'Arak',
      'Fernet',
      'Grappa',
      'Ouzo',
      'Raki',
      'Schnapps',
      'Vermouth',
      'Other Spirit'
    ]
  }
];

export default spiritCategories; 