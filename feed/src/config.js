// Outlet names must match the keys of LEAN in globe.html so the source-balance bar classifies them.
export const FEEDS = [
  { name: 'NPR World', url: 'https://feeds.npr.org/1004/rss.xml' },
  { name: 'NPR', url: 'https://feeds.npr.org/1001/rss.xml' },
  { name: 'CNN', url: 'http://rss.cnn.com/rss/edition_world.rss' },
  { name: 'Euronews', url: 'https://www.euronews.com/rss?level=theme&name=news' },
  { name: 'Fox News', url: 'https://moxie.foxnews.com/google-publisher/world.xml' },
  { name: 'Bloomberg', url: 'https://feeds.bloomberg.com/politics/news.rss' },
  { name: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { name: 'Punch NG', url: 'https://punchng.com/feed/' },
  { name: 'Times of Israel', url: 'https://www.timesofisrael.com/feed/' },
  { name: 'CBC News', url: 'https://www.cbc.ca/webfeed/rss/rss-world' },
  { name: 'TIME', url: 'https://time.com/feed/' },
  { name: 'CS Monitor', url: 'https://rss.csmonitor.com/feeds/world' },
  { name: 'Inquirer', url: 'https://globalnation.inquirer.net/feed' },
  { name: 'Rio Times', url: 'https://www.riotimesonline.com/feed/' },
  { name: 'The Defense Post', url: 'https://thedefensepost.com/feed/' },
];

// Case-sensitive whole-word patterns; ids match the location ids in globe.html.
export const LOCATIONS = {
  dc: ['Washington(?! Post)', 'White House', 'Pentagon', 'Capitol Hill', 'U\\.S\\. Congress', 'Trump administration', 'State Department'],
  kyiv: ['Ukraine', 'Ukrainian', 'Ukrainians', 'Kyiv', 'Kiev', 'Zelensky', 'Zelenskyy', 'Kharkiv', 'Odesa'],
  tehran: ['Iran', 'Iranian', 'Iranians', 'Tehran', 'Hormuz', 'Khamenei'],
  moscow: ['Russia', 'Russian', 'Russians', 'Moscow', 'Kremlin', 'Putin'],
  beijing: ['China', 'Chinese', 'Beijing', 'Xi Jinping'],
  paris: ['France', 'French', 'Paris', 'Macron', 'Élysée'],
  london: ['Britain', 'British', 'United Kingdom', 'U\\.K\\.', 'UK', 'London', 'Starmer', 'Downing Street'],
  guam: ['Guam', 'Northern Mariana', 'Northern Marianas', 'Saipan'],
  delhi: ['India', 'Indian(?! Ocean)', 'Indians', 'New Delhi', 'Delhi', 'Modi', 'Mumbai'],
  tokyo: ['Japan', 'Japanese', 'Tokyo', 'Takaichi'],
  lagos: ['Nigeria', 'Nigerian', 'Nigerians', 'Lagos', 'Abuja', 'Tinubu'],
  caracas: ['Venezuela', 'Venezuelan', 'Venezuelans', 'Caracas', 'Maduro'],
  jerusalem: ['Israel', 'Israeli', 'Israelis', 'Jerusalem', 'Netanyahu', 'Tel Aviv'],
  gaza: ['Gaza', 'Hamas', 'West Bank', 'Palestinian', 'Palestinians'],
  damascus: ['Syria', 'Syrian', 'Syrians', 'Damascus', 'Aleppo'],
  beirut: ['Lebanon', 'Lebanese', 'Beirut', 'Hezbollah'],
  ankara: ['Türkiye', 'Turkey', 'Turkish', 'Ankara', 'Istanbul', 'Erdogan', 'Erdoğan'],
  baghdad: ['Iraq', 'Iraqi', 'Iraqis', 'Baghdad'],
  doha: ['Qatar', 'Qatari', 'Doha'],
  berlin: ['Germany', 'German', 'Germans', 'Berlin', 'Merz', 'Bundestag'],
  madrid: ['Spain', 'Spanish', 'Madrid', 'Barcelona'],
  brasilia: ['Brazil', 'Brazilian', 'Brazilians', 'Brasília', 'Brasilia', 'Lula', 'Rio de Janeiro', 'São Paulo', 'Sao Paulo'],
  buenosaires: ['Argentina', 'Argentine', 'Argentinian', 'Buenos Aires', 'Milei'],
  lima: ['Peru', 'Peruvian', 'Peruvians', 'Lima'],
  mexico: ['(?<!New )Mexico', 'Mexican', 'Mexicans', 'Sheinbaum'],
  toronto: ['Canada', 'Canadian', 'Canadians', 'Toronto', 'Ottawa', 'Carney'],
  rabat: ['Morocco', 'Moroccan', 'Rabat', 'Casablanca'],
  cairo: ['Egypt', 'Egyptian', 'Egyptians', 'Cairo', 'Sisi', 'Suez'],
  seoul: ['South Korea', 'South Korean', 'South Koreans', 'Seoul'],
  sydney: ['Australia', 'Australian', 'Australians', 'Sydney', 'Canberra', 'Albanese'],
  joburg: ['South Africa', 'South African', 'South Africans', 'Johannesburg', 'Pretoria', 'Cape Town', 'Ramaphosa'],
  islamabad: ['Pakistan', 'Pakistani', 'Pakistanis', 'Islamabad', 'Kashmir', 'Lahore', 'Karachi'],
  taipei: ['Taiwan', 'Taiwanese', 'Taipei'],
  jakarta: ['Indonesia', 'Indonesian', 'Indonesians', 'Jakarta', 'Prabowo', 'Bali'],
  manila: ['Philippines', 'Philippine', 'Filipino', 'Filipinos', 'Manila'],
  colombo: ['Sri Lanka', 'Sri Lankan', 'Sri Lankans', 'Colombo'],
  dhaka: ['Bangladesh', 'Bangladeshi', 'Bangladeshis', 'Dhaka'],
};

// Lowercase whole-word stems; order is the tie-break priority. Keys match CATS in globe.html.
export const CATEGORIES = {
  security: ['war', 'attack', 'attacks', 'strike', 'strikes', 'airstrike', 'airstrikes', 'missile', 'missiles', 'drone', 'drones', 'killed', 'kills', 'troops', 'military', 'ceasefire', 'bomb', 'bombing', 'shelling', 'militant', 'militants', 'army', 'soldiers', 'invasion', 'hostage', 'hostages', 'rebels', 'gunmen', 'terror', 'terrorist', 'navy', 'weapons', 'defence', 'defense', 'nato'],
  politics: ['election', 'elections', 'vote', 'voters', 'president', 'prime minister', 'parliament', 'minister', 'government', 'opposition', 'party', 'sanctions', 'diplomatic', 'diplomacy', 'summit', 'talks', 'law', 'protest', 'protests', 'coalition', 'referendum', 'impeachment', 'court', 'judge', 'senate', 'lawmakers', 'policy', 'visa', 'immigration'],
  business: ['economy', 'economic', 'market', 'markets', 'stocks', 'shares', 'oil', 'trade', 'tariff', 'tariffs', 'inflation', 'bank', 'central bank', 'investment', 'investors', 'company', 'companies', 'gdp', 'exports', 'imports', 'currency', 'prices', 'jobs', 'debt', 'budget', 'revenue'],
  technology: ['tech', 'technology', 'ai', 'artificial intelligence', 'chip', 'chips', 'semiconductor', 'software', 'cyber', 'cyberattack', 'hackers', 'internet', 'app', 'digital', 'data', 'robot', 'startup'],
  science: ['scientists', 'scientist', 'study', 'research', 'researchers', 'space', 'nasa', 'discovery', 'species', 'telescope', 'rocket', 'launch', 'astronomers', 'fossil'],
  health: ['health', 'hospital', 'hospitals', 'disease', 'outbreak', 'virus', 'vaccine', 'vaccines', 'cholera', 'dengue', 'measles', 'patients', 'doctors', 'medical', 'covid', 'malaria', 'famine', 'malnutrition'],
  environment: ['climate', 'flood', 'floods', 'flooding', 'wildfire', 'wildfires', 'drought', 'heatwave', 'heat wave', 'storm', 'typhoon', 'hurricane', 'cyclone', 'earthquake', 'quake', 'emissions', 'pollution', 'landslide', 'volcano', 'eruption', 'monsoon'],
  culture: ['film', 'festival', 'music', 'art', 'museum', 'world cup', 'football', 'soccer', 'olympic', 'olympics', 'sport', 'sports', 'match', 'league', 'celebrity', 'heritage', 'fashion', 'pope', 'church', 'religious', 'tourism', 'concert'],
};

export const WINDOW_DAYS = 7;
export const MAX_STORIES_PER_LOCATION = 8;
export const MAX_ARCHIVE_ITEMS = 4000;
export const MAX_FEED_BYTES = 3_000_000;
export const USER_AGENT = 'TerraNewsBot/1.0 (+https://terranews.netlify.app)';
