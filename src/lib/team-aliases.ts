/**
 * Map football-data.org official names → football-data.co.uk CSV short names.
 * Unknown/promoted clubs keep their API name (new team id).
 */
const ALIASES: Record<string, string> = {
  // Premier League
  "Arsenal FC": "Arsenal",
  "Aston Villa FC": "Aston Villa",
  "AFC Bournemouth": "Bournemouth",
  "Brentford FC": "Brentford",
  "Brighton & Hove Albion FC": "Brighton",
  "Chelsea FC": "Chelsea",
  "Crystal Palace FC": "Crystal Palace",
  "Everton FC": "Everton",
  "Fulham FC": "Fulham",
  "Ipswich Town FC": "Ipswich",
  "Leeds United FC": "Leeds",
  "Liverpool FC": "Liverpool",
  "Manchester City FC": "Man City",
  "Manchester United FC": "Man United",
  "Newcastle United FC": "Newcastle",
  "Nottingham Forest FC": "Nott'm Forest",
  "Sunderland AFC": "Sunderland",
  "Tottenham Hotspur FC": "Tottenham",
  "West Ham United FC": "West Ham",
  "Wolverhampton Wanderers FC": "Wolves",
  "Burnley FC": "Burnley",
  "Leicester City FC": "Leicester",
  "Southampton FC": "Southampton",
  "Luton Town FC": "Luton",
  "Sheffield United FC": "Sheffield United",
  "Watford FC": "Watford",
  "Norwich City FC": "Norwich",

  // La Liga
  "Athletic Club": "Ath Bilbao",
  "Club Atlético de Madrid": "Ath Madrid",
  "FC Barcelona": "Barcelona",
  "Real Betis Balompié": "Betis",
  "RC Celta de Vigo": "Celta",
  "Elche CF": "Elche",
  "RCD Espanyol de Barcelona": "Espanol",
  "Getafe CF": "Getafe",
  "Girona FC": "Girona",
  "UD Las Palmas": "Las Palmas",
  "CD Leganés": "Leganes",
  "Levante UD": "Levante",
  "RCD Mallorca": "Mallorca",
  "CA Osasuna": "Osasuna",
  "Real Oviedo": "Oviedo",
  "Real Madrid CF": "Real Madrid",
  "Sevilla FC": "Sevilla",
  "Real Sociedad de Fútbol": "Sociedad",
  "Valencia CF": "Valencia",
  "Villarreal CF": "Villarreal",
  "Deportivo Alavés": "Alaves",
  "Rayo Vallecano de Madrid": "Vallecano",
  "Granada CF": "Granada",
  "Cádiz CF": "Cadiz",
  "Real Valladolid CF": "Valladolid",
  "UD Almería": "Almeria",

  // Bundesliga
  "FC Augsburg": "Augsburg",
  "FC Bayern München": "Bayern Munich",
  "Borussia Dortmund": "Dortmund",
  "Eintracht Frankfurt": "Ein Frankfurt",
  "1. FC Köln": "FC Koln",
  "SC Freiburg": "Freiburg",
  "Hamburger SV": "Hamburg",
  "1. FC Heidenheim 1846": "Heidenheim",
  "TSG 1899 Hoffenheim": "Hoffenheim",
  "Bayer 04 Leverkusen": "Leverkusen",
  "Borussia Mönchengladbach": "M'gladbach",
  "1. FSV Mainz 05": "Mainz",
  "RB Leipzig": "RB Leipzig",
  "FC Schalke 04": "Schalke 04",
  "FC St. Pauli 1910": "St Pauli",
  "VfB Stuttgart": "Stuttgart",
  "1. FC Union Berlin": "Union Berlin",
  "SV Werder Bremen": "Werder Bremen",
  "VfL Wolfsburg": "Wolfsburg",
  "VfL Bochum 1848": "Bochum",
  "SV Darmstadt 98": "Darmstadt",
  "Holstein Kiel": "Holstein Kiel",

  // Serie A
  "Atalanta BC": "Atalanta",
  "Bologna FC 1909": "Bologna",
  "Cagliari Calcio": "Cagliari",
  "Como 1907": "Como",
  "US Cremonese": "Cremonese",
  "Empoli FC": "Empoli",
  "ACF Fiorentina": "Fiorentina",
  "Frosinone Calcio": "Frosinone",
  "Genoa CFC": "Genoa",
  "FC Internazionale Milano": "Inter",
  "Juventus FC": "Juventus",
  "SS Lazio": "Lazio",
  "US Lecce": "Lecce",
  "AC Milan": "Milan",
  "AC Monza": "Monza",
  "SSC Napoli": "Napoli",
  "Parma Calcio 1913": "Parma",
  "Pisa Sporting Club": "Pisa",
  "AS Roma": "Roma",
  "US Salernitana 1919": "Salernitana",
  "UC Sampdoria": "Sampdoria",
  "US Sassuolo Calcio": "Sassuolo",
  "Spezia Calcio": "Spezia",
  "Torino FC": "Torino",
  "Udinese Calcio": "Udinese",
  "Venezia FC": "Venezia",
  "Hellas Verona FC": "Verona",

  // Ligue 1
  "AC Ajaccio": "Ajaccio",
  "Angers SCO": "Angers",
  "AJ Auxerre": "Auxerre",
  "FC Girondins de Bordeaux": "Bordeaux",
  "Stade Brestois 29": "Brest",
  "Clermont Foot 63": "Clermont",
  "Le Havre AC": "Le Havre",
  "Racing Club de Lens": "Lens",
  "Lille OSC": "Lille",
  "FC Lorient": "Lorient",
  "Olympique Lyonnais": "Lyon",
  "Olympique de Marseille": "Marseille",
  "FC Metz": "Metz",
  "AS Monaco FC": "Monaco",
  "Montpellier HSC": "Montpellier",
  "FC Nantes": "Nantes",
  "OGC Nice": "Nice",
  "Paris FC": "Paris FC",
  "Paris Saint-Germain FC": "Paris SG",
  "Stade de Reims": "Reims",
  "Stade Rennais FC 1901": "Rennes",
  "AS Saint-Étienne": "St Etienne",
  "RC Strasbourg Alsace": "Strasbourg",
  "Toulouse FC": "Toulouse",
  "ES Troyes AC": "Troyes",

  // أسماء API-Football/التغذيات بصيغ مختلفة عن أسماء CSV القياسية —
  // غيابها كان ينشئ فرقاً مكررة بهويات موازية (Bayern München ≠ Bayern Munich)
  "Manchester City": "Man City",
  "Manchester United": "Man United",
  "Nottingham Forest": "Nott'm Forest",
  "Atletico Madrid": "Ath Madrid",
  "Celta Vigo": "Celta",
  "Espanyol": "Espanol",
  "Rayo Vallecano": "Vallecano",
  "Real Betis": "Betis",
  "Real Sociedad": "Sociedad",
  "Hellas Verona": "Verona",
  "Bayern München": "Bayern Munich",
  "Bayer Leverkusen": "Leverkusen",
  "FSV Mainz 05": "Mainz",
  "1899 Hoffenheim": "Hoffenheim",
  "FC St. Pauli": "St Pauli",
  "1. FC Heidenheim": "Heidenheim",
  "VfL Bochum": "Bochum",
  "Paris Saint Germain": "Paris SG",
  "Saint Etienne": "St Etienne",
  "SV Elversberg": "Elversberg",

  // أسماء API-Football للمباريات القادمة (Eredivisie / Primeira / إلخ)
  "Famalicão": "Famalicao",
  "Guimaraes": "Guimaraes",
  "Vitoria Guimaraes": "Guimaraes",
  "Vitória Guimarães": "Guimaraes",
  "Fortuna Sittard": "For Sittard",
  "NEC Nijmegen": "Nijmegen",
  "NEC": "Nijmegen",
  "FC Twente": "Twente",
  "Heracles Almelo": "Heracles",
  "PEC Zwolle": "Zwolle",
  "FC Utrecht": "Utrecht",
  "SC Heerenveen": "Heerenveen",
  "FC Groningen": "Groningen",
  "FC Volendam": "Volendam",
  "RKC Waalwijk": "Waalwijk",
  "Estrela da Amadora": "Estrela",
  "Sporting Braga": "Sp Braga",
  "SC Braga": "Sp Braga",
  "Sporting CP": "Sp Lisbon",
  "Sporting Lisbon": "Sp Lisbon",
  "Istanbul Basaksehir": "Buyuksehyr",
  "Başakşehir": "Buyuksehyr",
  "Goztepe": "Goztep",
  "Gaziantep FK": "Gaziantep",
};

function normalizeKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

const ALIAS_BY_NORM = new Map(
  Object.entries(ALIASES).map(([k, v]) => [normalizeKey(k), v]),
);

/** Resolve an API/display name to the CSV canonical short name when known. */
export function resolveTeamName(english: string): string {
  if (ALIASES[english]) return ALIASES[english]!;
  const byNorm = ALIAS_BY_NORM.get(normalizeKey(english));
  if (byNorm) return byNorm;
  return english;
}
