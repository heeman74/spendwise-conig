const INSTITUTION_DOMAINS: Record<string, string> = {
  'Chase': 'chase.com',
  'Bank of America': 'bankofamerica.com',
  'Wells Fargo': 'wellsfargo.com',
  'Capital One': 'capitalone.com',
  'Citibank': 'citibank.com',
  'American Express': 'americanexpress.com',
  'Discover': 'discover.com',
  'TD Bank': 'tdbank.com',
  'US Bank': 'usbank.com',
  'USAA': 'usaa.com',
  'PNC': 'pnc.com',
  'Ally': 'ally.com',
  'Charles Schwab': 'schwab.com',
  'Fidelity': 'fidelity.com',
  'Vanguard': 'vanguard.com',
  'Navy Federal': 'navyfederal.org',
  'SoFi': 'sofi.com',
  'Marcus': 'marcus.com',
  'Synchrony': 'synchrony.com',
  'Barclays': 'barclays.com',
};

const INSTITUTION_COLORS: Record<string, string> = {
  'Chase': '#117ACA',
  'Bank of America': '#012169',
  'Wells Fargo': '#D71E28',
  'Capital One': '#D03027',
  'Citibank': '#003B70',
  'American Express': '#006FCF',
  'Discover': '#FF6000',
  'TD Bank': '#34A853',
  'US Bank': '#D52B1E',
  'USAA': '#1B3C71',
  'PNC': '#F58025',
  'Ally': '#7B2481',
  'Charles Schwab': '#00A0DF',
  'Fidelity': '#4B8B1F',
  'Vanguard': '#8B2131',
  'Navy Federal': '#003768',
  'SoFi': '#6B3FA0',
  'Marcus': '#000000',
  'Synchrony': '#00263E',
  'Barclays': '#00AEEF',
};

const DEFAULT_COLOR = '#6B7280';

function findInstitution(name: string): string | undefined {
  // Exact match first
  if (INSTITUTION_DOMAINS[name]) return name;

  // Case-insensitive match
  const lower = name.toLowerCase();
  return Object.keys(INSTITUTION_DOMAINS).find(
    (key) => key.toLowerCase() === lower
  );
}

export function getLogoUrl(institution: string): string | null {
  const match = findInstitution(institution);
  if (!match) return null;

  const domain = INSTITUTION_DOMAINS[match];
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function getBrandColor(institution: string): string {
  const match = findInstitution(institution);
  if (!match) return DEFAULT_COLOR;
  return INSTITUTION_COLORS[match] || DEFAULT_COLOR;
}

export function getInitials(institution: string): string {
  const words = institution.trim().split(/\s+/);
  if (words.length === 1) return words[0].charAt(0).toUpperCase();
  return (words[0].charAt(0) + words[1].charAt(0)).toUpperCase();
}
