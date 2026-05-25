export interface FixtureMatch {
  stage: string;
  matchday?: number;
  homeTeam: string;
  awayTeam: string;
  matchDate?: string;
  venue?: string;
}

export const MUNDIAL_2026_FIXTURE: FixtureMatch[] = [
  // FASE DE GRUPOS - Jornada 1
  { stage: "group", matchday: 1, homeTeam: "México", awayTeam: "Argentina", matchDate: "2026-06-11T18:00:00Z", venue: "Estadio Azteca" },
  { stage: "group", matchday: 1, homeTeam: "Estados Unidos", awayTeam: "Brasil", matchDate: "2026-06-12T21:00:00Z", venue: "MetLife Stadium" },
  { stage: "group", matchday: 1, homeTeam: "España", awayTeam: "Francia", matchDate: "2026-06-13T18:00:00Z", venue: "SoFi Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Alemania", awayTeam: "Portugal", matchDate: "2026-06-13T21:00:00Z", venue: "AT&T Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Inglaterra", awayTeam: "Países Bajos", matchDate: "2026-06-14T18:00:00Z", venue: "Levi's Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Marruecos", awayTeam: "Bélgica", matchDate: "2026-06-14T21:00:00Z", venue: "Estadio Akron" },
  { stage: "group", matchday: 1, homeTeam: "Japón", awayTeam: "Colombia", matchDate: "2026-06-15T18:00:00Z", venue: "BC Place" },
  { stage: "group", matchday: 1, homeTeam: "Uruguay", awayTeam: "Senegal", matchDate: "2026-06-15T21:00:00Z", venue: "BMO Field" },
  { stage: "group", matchday: 1, homeTeam: "Croacia", awayTeam: "Serbia", matchDate: "2026-06-16T18:00:00Z", venue: "Gillette Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Suiza", awayTeam: "Dinamarca", matchDate: "2026-06-16T21:00:00Z", venue: "Lincoln Financial Field" },
  { stage: "group", matchday: 1, homeTeam: "Australia", awayTeam: "Ecuador", matchDate: "2026-06-17T18:00:00Z", venue: "NRG Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Polonia", awayTeam: "Irán", matchDate: "2026-06-17T21:00:00Z", venue: "Arrowhead Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Camerún", awayTeam: "Corea del Sur", matchDate: "2026-06-18T18:00:00Z", venue: "Empower Field" },
  { stage: "group", matchday: 1, homeTeam: "Arabia Saudita", awayTeam: "Ghana", matchDate: "2026-06-18T21:00:00Z", venue: "Lumen Field" },
  { stage: "group", matchday: 1, homeTeam: "Turquía", awayTeam: "Chile", matchDate: "2026-06-19T18:00:00Z", venue: "Hard Rock Stadium" },
  { stage: "group", matchday: 1, homeTeam: "Canadá", awayTeam: "Argelia", matchDate: "2026-06-19T21:00:00Z", venue: "Estadio Azteca" },
  // FASE DE GRUPOS - Jornada 2
  { stage: "group", matchday: 2, homeTeam: "Argentina", awayTeam: "Estados Unidos", matchDate: "2026-06-21T18:00:00Z", venue: "MetLife Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Brasil", awayTeam: "México", matchDate: "2026-06-21T21:00:00Z", venue: "Estadio Azteca" },
  { stage: "group", matchday: 2, homeTeam: "Francia", awayTeam: "Alemania", matchDate: "2026-06-22T18:00:00Z", venue: "AT&T Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Portugal", awayTeam: "España", matchDate: "2026-06-22T21:00:00Z", venue: "SoFi Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Países Bajos", awayTeam: "Marruecos", matchDate: "2026-06-23T18:00:00Z", venue: "Estadio Akron" },
  { stage: "group", matchday: 2, homeTeam: "Bélgica", awayTeam: "Inglaterra", matchDate: "2026-06-23T21:00:00Z", venue: "Levi's Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Colombia", awayTeam: "Uruguay", matchDate: "2026-06-24T18:00:00Z", venue: "BMO Field" },
  { stage: "group", matchday: 2, homeTeam: "Senegal", awayTeam: "Japón", matchDate: "2026-06-24T21:00:00Z", venue: "BC Place" },
  { stage: "group", matchday: 2, homeTeam: "Serbia", awayTeam: "Suiza", matchDate: "2026-06-25T18:00:00Z", venue: "Lincoln Financial Field" },
  { stage: "group", matchday: 2, homeTeam: "Dinamarca", awayTeam: "Croacia", matchDate: "2026-06-25T21:00:00Z", venue: "Gillette Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Ecuador", awayTeam: "Polonia", matchDate: "2026-06-26T18:00:00Z", venue: "Arrowhead Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Irán", awayTeam: "Australia", matchDate: "2026-06-26T21:00:00Z", venue: "NRG Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Corea del Sur", awayTeam: "Arabia Saudita", matchDate: "2026-06-27T18:00:00Z", venue: "Lumen Field" },
  { stage: "group", matchday: 2, homeTeam: "Ghana", awayTeam: "Camerún", matchDate: "2026-06-27T21:00:00Z", venue: "Empower Field" },
  { stage: "group", matchday: 2, homeTeam: "Chile", awayTeam: "Canadá", matchDate: "2026-06-28T18:00:00Z", venue: "Hard Rock Stadium" },
  { stage: "group", matchday: 2, homeTeam: "Argelia", awayTeam: "Turquía", matchDate: "2026-06-28T21:00:00Z", venue: "Estadio Azteca" },
  // FASE DE GRUPOS - Jornada 3
  { stage: "group", matchday: 3, homeTeam: "Argentina", awayTeam: "Brasil", matchDate: "2026-07-01T22:00:00Z", venue: "MetLife Stadium" },
  { stage: "group", matchday: 3, homeTeam: "México", awayTeam: "Estados Unidos", matchDate: "2026-07-01T22:00:00Z", venue: "Estadio Azteca" },
  { stage: "group", matchday: 3, homeTeam: "Francia", awayTeam: "Portugal", matchDate: "2026-07-02T22:00:00Z", venue: "SoFi Stadium" },
  { stage: "group", matchday: 3, homeTeam: "España", awayTeam: "Alemania", matchDate: "2026-07-02T22:00:00Z", venue: "AT&T Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Inglaterra", awayTeam: "Marruecos", matchDate: "2026-07-03T22:00:00Z", venue: "Levi's Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Países Bajos", awayTeam: "Bélgica", matchDate: "2026-07-03T22:00:00Z", venue: "Estadio Akron" },
  { stage: "group", matchday: 3, homeTeam: "Colombia", awayTeam: "Japón", matchDate: "2026-07-04T22:00:00Z", venue: "BC Place" },
  { stage: "group", matchday: 3, homeTeam: "Uruguay", awayTeam: "Senegal", matchDate: "2026-07-04T22:00:00Z", venue: "BMO Field" },
  { stage: "group", matchday: 3, homeTeam: "Croacia", awayTeam: "Dinamarca", matchDate: "2026-07-05T22:00:00Z", venue: "Gillette Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Serbia", awayTeam: "Suiza", matchDate: "2026-07-05T22:00:00Z", venue: "Lincoln Financial Field" },
  { stage: "group", matchday: 3, homeTeam: "Australia", awayTeam: "Polonia", matchDate: "2026-07-06T22:00:00Z", venue: "NRG Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Ecuador", awayTeam: "Irán", matchDate: "2026-07-06T22:00:00Z", venue: "Arrowhead Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Camerún", awayTeam: "Arabia Saudita", matchDate: "2026-07-07T22:00:00Z", venue: "Empower Field" },
  { stage: "group", matchday: 3, homeTeam: "Corea del Sur", awayTeam: "Ghana", matchDate: "2026-07-07T22:00:00Z", venue: "Lumen Field" },
  { stage: "group", matchday: 3, homeTeam: "Turquía", awayTeam: "Canadá", matchDate: "2026-07-08T22:00:00Z", venue: "Hard Rock Stadium" },
  { stage: "group", matchday: 3, homeTeam: "Chile", awayTeam: "Argelia", matchDate: "2026-07-08T22:00:00Z", venue: "Estadio Azteca" },
  // OCTAVOS DE FINAL
  { stage: "round_of_16", homeTeam: "1A", awayTeam: "2B", matchDate: "2026-07-11T18:00:00Z", venue: "MetLife Stadium" },
  { stage: "round_of_16", homeTeam: "1B", awayTeam: "2A", matchDate: "2026-07-11T22:00:00Z", venue: "AT&T Stadium" },
  { stage: "round_of_16", homeTeam: "1C", awayTeam: "2D", matchDate: "2026-07-12T18:00:00Z", venue: "SoFi Stadium" },
  { stage: "round_of_16", homeTeam: "1D", awayTeam: "2C", matchDate: "2026-07-12T22:00:00Z", venue: "Levi's Stadium" },
  { stage: "round_of_16", homeTeam: "1E", awayTeam: "2F", matchDate: "2026-07-13T18:00:00Z", venue: "Estadio Azteca" },
  { stage: "round_of_16", homeTeam: "1F", awayTeam: "2E", matchDate: "2026-07-13T22:00:00Z", venue: "NRG Stadium" },
  { stage: "round_of_16", homeTeam: "1G", awayTeam: "2H", matchDate: "2026-07-14T18:00:00Z", venue: "BC Place" },
  { stage: "round_of_16", homeTeam: "1H", awayTeam: "2G", matchDate: "2026-07-14T22:00:00Z", venue: "Hard Rock Stadium" },
  // CUARTOS DE FINAL
  { stage: "quarterfinal", homeTeam: "W R16-1", awayTeam: "W R16-2", matchDate: "2026-07-18T22:00:00Z", venue: "MetLife Stadium" },
  { stage: "quarterfinal", homeTeam: "W R16-3", awayTeam: "W R16-4", matchDate: "2026-07-19T22:00:00Z", venue: "AT&T Stadium" },
  { stage: "quarterfinal", homeTeam: "W R16-5", awayTeam: "W R16-6", matchDate: "2026-07-20T22:00:00Z", venue: "SoFi Stadium" },
  { stage: "quarterfinal", homeTeam: "W R16-7", awayTeam: "W R16-8", matchDate: "2026-07-21T22:00:00Z", venue: "Estadio Azteca" },
  // SEMIFINALES
  { stage: "semifinal", homeTeam: "W QF1", awayTeam: "W QF2", matchDate: "2026-07-25T22:00:00Z", venue: "MetLife Stadium" },
  { stage: "semifinal", homeTeam: "W QF3", awayTeam: "W QF4", matchDate: "2026-07-26T22:00:00Z", venue: "AT&T Stadium" },
  // FINAL
  { stage: "final", homeTeam: "W SF1", awayTeam: "W SF2", matchDate: "2026-07-19T18:00:00Z", venue: "MetLife Stadium" },
];
