/**
 * Currency conversion service using open.er-api.com (free, no API key).
 * Caches exchange rates in memory and refreshes every 12 hours.
 */

interface ExchangeRates {
  [currency: string]: number;
}

interface CacheEntry {
  rates: ExchangeRates;
  timestamp: number;
}

const CACHE_DURATION_MS = 12 * 60 * 60 * 1000; // 12 hours
const ratesCache: Map<string, CacheEntry> = new Map();

/**
 * Fetch exchange rates for a base currency from the API.
 */
async function fetchRates(baseCurrency: string): Promise<ExchangeRates> {
  const cached = ratesCache.get(baseCurrency);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.rates;
  }

  try {
    const response = await fetch(
      `https://open.er-api.com/v6/latest/${baseCurrency}`
    );
    const data = await response.json();

    if (data.result !== 'success') {
      throw new Error(`API error: ${data['error-type'] || 'unknown'}`);
    }

    const rates = data.rates as ExchangeRates;
    ratesCache.set(baseCurrency, { rates, timestamp: Date.now() });
    console.log(`[Currency] Rates cached for ${baseCurrency} (${Object.keys(rates).length} currencies)`);
    return rates;
  } catch (error) {
    // If API fails, return cached data even if stale
    if (cached) {
      console.warn(`[Currency] API failed, using stale cache for ${baseCurrency}`);
      return cached.rates;
    }
    throw error;
  }
}

/**
 * Get the exchange rate from one currency to another.
 * Returns how many units of `to` you get for 1 unit of `from`.
 */
export async function getExchangeRate(from: string, to: string): Promise<number> {
  if (from === to) return 1;

  const rates = await fetchRates(from);
  const rate = rates[to];
  if (!rate) {
    throw new Error(`Exchange rate not found: ${from} → ${to}`);
  }
  return rate;
}

/**
 * Convert an amount from a foreign currency to CLP.
 */
export async function convertToCLP(amount: number, fromCurrency: string): Promise<{
  amountCLP: number;
  exchangeRate: number;
}> {
  if (fromCurrency === 'CLP') {
    return { amountCLP: amount, exchangeRate: 1 };
  }

  const exchangeRate = await getExchangeRate(fromCurrency, 'CLP');
  const amountCLP = Math.round(amount * exchangeRate); // CLP doesn't use decimals

  return { amountCLP, exchangeRate };
}

/**
 * Get all rates relative to CLP for frontend display.
 * Returns: { USD: 892.27, EUR: 1039.50, ... } meaning 1 USD = 892.27 CLP
 */
export async function getRatesForCLP(): Promise<ExchangeRates> {
  // Get rates with USD as base, then convert to "1 foreign = X CLP"
  const usdRates = await fetchRates('USD');
  const clpPerUsd = usdRates['CLP'];

  if (!clpPerUsd) {
    throw new Error('CLP rate not found');
  }

  const result: ExchangeRates = { CLP: 1 };

  // For each currency, calculate how many CLP per 1 unit
  for (const [currency, rateVsUsd] of Object.entries(usdRates)) {
    if (currency === 'CLP') continue;
    // 1 CURRENCY = (clpPerUsd / rateVsUsd) CLP
    // Since rateVsUsd = how many CURRENCY per 1 USD
    // And clpPerUsd = how many CLP per 1 USD
    // Then 1 CURRENCY = clpPerUsd / rateVsUsd CLP
    result[currency] = clpPerUsd / rateVsUsd;
  }

  // USD should be exactly clpPerUsd
  result['USD'] = clpPerUsd;

  return result;
}

/**
 * Supported currencies for the UI (most commonly used).
 */
export const SUPPORTED_CURRENCIES = [
  { code: 'CLP', name: 'Peso Chileno', symbol: '$' },
  { code: 'USD', name: 'Dólar Estadounidense', symbol: 'US$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'ARS', name: 'Peso Argentino', symbol: 'AR$' },
  { code: 'BRL', name: 'Real Brasileño', symbol: 'R$' },
  { code: 'MXN', name: 'Peso Mexicano', symbol: 'MX$' },
  { code: 'GBP', name: 'Libra Esterlina', symbol: '£' },
  { code: 'JPY', name: 'Yen Japonés', symbol: '¥' },
  { code: 'CAD', name: 'Dólar Canadiense', symbol: 'CA$' },
  { code: 'PEN', name: 'Sol Peruano', symbol: 'S/' },
  { code: 'COP', name: 'Peso Colombiano', symbol: 'CO$' },
  { code: 'DOP', name: 'Peso Dominicano', symbol: 'RD$' },
];
