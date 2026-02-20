// =========================================================
// MyDashboard — app.js
// =========================================================
import { DefaultApi } from './node_modules/finnhub/src/index.js';

// ── Configuration defaults (overridden by DB on load) ─────────────────
const CONFIG = {
  finnhubKey: 'd6b9011r01qnr27k3n4gd6b9011r01qnr27k3n50',

  crypto: [
    { id: 'bitcoin',  symbol: 'BTC', name: 'Bitcoin',  configKey: 'crypto_BTC' },
    { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', configKey: 'crypto_ETH' },
    { id: 'solana',   symbol: 'SOL', name: 'Solana',   configKey: 'crypto_SOL' },
  ],

  indicesGlobal: [
    { symbol: '^FTSE',  name: 'FTSE 100',   currency: '£', configKey: 'markets_FTSE100' },
    { symbol: '^NSEI',  name: 'Nifty 50',   currency: '₹', configKey: 'markets_Nifty50' },
    { symbol: '^BSESN', name: 'BSE Sensex', currency: '₹', configKey: 'markets_Sensex'  },
  ],

  forexGBP: [
    { code: 'USD', name: 'US Dollar',    configKey: 'forex_USD' },
    { code: 'EUR', name: 'Euro',         configKey: 'forex_EUR' },
    { code: 'JPY', name: 'Japanese Yen',configKey: 'forex_JPY' },
    { code: 'INR', name: 'Indian Rupee',configKey: 'forex_INR' },
    { code: 'CHF', name: 'Swiss Franc', configKey: 'forex_CHF' },
  ],

  weatherLocations: [
    { name: 'London', lat: 51.5074, lon: -0.1278, configKey: 'weather_London' },
    { name: 'Brugge', lat: 51.2093, lon:  3.2247, configKey: 'weather_Brugge' },
  ],

  refreshInterval: 60000,
};

// Clock zones are mutable (add/delete at runtime)
let CLOCK_ZONES = [
  { label: 'Local',  tz: Intl.DateTimeFormat().resolvedOptions().timeZone, configKey: 'clock_Local'  },
  { label: 'London', tz: 'Europe/London',                                  configKey: 'clock_London' },
  { label: 'Paris',  tz: 'Europe/Paris',                                   configKey: 'clock_Paris'  },
];

// Finnhub client
const finnhubClient = new DefaultApi(CONFIG.finnhubKey);

function finnhubQuote(symbol) {
  return new Promise((resolve, reject) => {
    finnhubClient.quote(symbol, (error, data) => {
      if (error) reject(new Error(JSON.stringify(error)));
      else resolve(data);
    });
  });
}

// =========================================================
// UTILITIES
// =========================================================

function fmtPrice(value, currency = '$') {
  if (value == null || isNaN(value) || value === 0) return '—';
  const decimals = value >= 1 ? 2 : 4;
  return currency + Number(value).toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(value) {
  if (value == null || isNaN(value)) return { text: '—', cls: 'neutral' };
  const sign = value >= 0 ? '+' : '';
  return {
    text: `${sign}${value.toFixed(2)}%`,
    cls: value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral',
  };
}

function fmtRate(value, code) {
  if (value == null || isNaN(value)) return '—';
  const lowDecimals = ['JPY', 'KRW', 'IDR', 'HUF', 'INR'].includes(code);
  return Number(value).toLocaleString('en-US', {
    minimumFractionDigits: lowDecimals ? 2 : 4,
    maximumFractionDigits: lowDecimals ? 2 : 4,
  });
}

function setLoading(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = '<p class="text-muted small mt-2 mb-0">Loading&hellip;</p>';
}

function setError(id, msg) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = `<p class="text-danger small mt-2 mb-0">${msg}</p>`;
}

function getYesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

// =========================================================
// DRAG & DROP
// =========================================================

function sortByConfig(items) {
  return [...items].sort((a, b) => {
    const oa = CONFIG[a.configKey] ?? Infinity;
    const ob = CONFIG[b.configKey] ?? Infinity;
    return oa - ob;
  });
}

// Skip items marked data-no-sort (My Location)
function saveOrder(container) {
  container.querySelectorAll('[data-config-key]:not([data-no-sort])').forEach((el, index) => {
    const key = el.dataset.configKey;
    CONFIG[key] = index;
    saveConfig(key, index).catch(e => console.warn(`Order save failed for ${key}:`, e.message));
  });
}

// Track Sortable instances so we can destroy before re-creating on refresh
const sortableInstances = new Map();

function makeSortable(container) {
  if (sortableInstances.has(container)) {
    sortableInstances.get(container).destroy();
  }
  const instance = window.Sortable.create(container, {
    handle: '.drag-handle',
    animation: 150,
    ghostClass: 'sortable-ghost',
    filter: '[data-no-sort]',
    onEnd() { saveOrder(container); },
  });
  sortableInstances.set(container, instance);
}

// =========================================================
// TICKER ROW (with delete button)
// =========================================================

function tickerRow(configKey, symbol, name, priceStr, changeStr, changeCls) {
  return `
    <div class="ticker-item" data-config-key="${configKey}">
      <span class="drag-handle"><i class="bi bi-grip-vertical"></i></span>
      <div class="ticker-left">
        <span class="ticker-symbol">${symbol}</span>
        <span class="ticker-name">${name}</span>
      </div>
      <div class="ticker-right">
        <span class="ticker-price">${priceStr}</span>
        <span class="ticker-change ${changeCls}">${changeStr}</span>
      </div>
      <button class="delete-btn" data-config-key="${configKey}" title="Remove">
        <i class="bi bi-trash3"></i>
      </button>
    </div>`;
}

// =========================================================
// API FETCHES
// =========================================================

async function fetchCrypto() {
  if (!CONFIG.crypto.length) return {};
  const ids = CONFIG.crypto.map(c => c.id).join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
  );
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchForexPair(base, codes) {
  const to = codes.join(',');
  const [latest, prev] = await Promise.all([
    fetch(`https://api.frankfurter.app/latest?from=${base}&to=${to}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json();
    }),
    fetch(`https://api.frankfurter.app/${getYesterdayStr()}?from=${base}&to=${to}`).then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json();
    }),
  ]);
  return { latest, prev };
}

async function fetchWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat, longitude: lon, timezone: 'auto',
    current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m',
    wind_speed_unit: 'mph',
  });
  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// =========================================================
// ADD ITEM — one function per card type
// =========================================================

async function addCryptoItem(query) {
  const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`CoinGecko error: HTTP ${res.status}`);
  const data = await res.json();
  const coin = data.coins?.[0];
  if (!coin) throw new Error('Coin not found. Try the full name (e.g. dogecoin).');

  const configKey = `crypto_${coin.symbol.toUpperCase()}`;
  if (CONFIG.crypto.find(c => c.configKey === configKey)) {
    throw new Error(`${coin.symbol.toUpperCase()} is already in the list.`);
  }
  const item = { id: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, configKey };
  CONFIG.crypto.push(item);
  CONFIG[configKey] = CONFIG.crypto.length - 1;
  await Promise.all([saveConfig('crypto_items', CONFIG.crypto), saveConfig(configKey, CONFIG[configKey])]);
}

async function addMarketsItem(query) {
  const symbol = query.toUpperCase().trim();
  const q = await finnhubQuote(symbol);
  if (q.c === 0 && q.pc === 0 && q.h === 0 && q.l === 0) {
    throw new Error(`"${symbol}" not found or not supported on this plan.`);
  }
  const configKey = `markets_${symbol.replace(/[^a-zA-Z0-9]/g, '')}`;
  if (CONFIG.indicesGlobal.find(i => i.configKey === configKey)) {
    throw new Error(`${symbol} is already in the list.`);
  }
  const item = { symbol, name: symbol, currency: '$', configKey };
  CONFIG.indicesGlobal.push(item);
  CONFIG[configKey] = CONFIG.indicesGlobal.length - 1;
  await Promise.all([saveConfig('markets_items', CONFIG.indicesGlobal), saveConfig(configKey, CONFIG[configKey])]);
}

async function addForexItem(query) {
  const code = query.toUpperCase().trim();
  if (CONFIG.forexGBP.find(f => f.code === code)) {
    throw new Error(`${code} is already in the list.`);
  }
  const res = await fetch(`https://api.frankfurter.app/latest?from=GBP&to=${code}`);
  if (!res.ok) throw new Error(`"${code}" is not a valid currency code.`);
  const data = await res.json();
  if (!data.rates?.[code]) throw new Error(`"${code}" is not a valid currency code.`);

  let name = code;
  try {
    const names = await fetch('https://api.frankfurter.app/currencies').then(r => r.json());
    if (names[code]) name = names[code];
  } catch { /* keep code as name */ }

  const configKey = `forex_${code}`;
  const item = { code, name, configKey };
  CONFIG.forexGBP.push(item);
  CONFIG[configKey] = CONFIG.forexGBP.length - 1;
  await Promise.all([saveConfig('forex_items', CONFIG.forexGBP), saveConfig(configKey, CONFIG[configKey])]);
}

async function addWeatherItem(query) {
  const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`);
  if (!res.ok) throw new Error(`Geocoding error: HTTP ${res.status}`);
  const data = await res.json();
  const result = data.results?.[0];
  if (!result) throw new Error(`Location "${query}" not found.`);

  const configKey = `weather_${result.name.replace(/\s+/g, '_')}`;
  if (CONFIG.weatherLocations.find(w => w.configKey === configKey)) {
    throw new Error(`${result.name} is already in the list.`);
  }
  const item = { name: result.name, lat: result.latitude, lon: result.longitude, configKey };
  CONFIG.weatherLocations.push(item);
  CONFIG[configKey] = CONFIG.weatherLocations.length - 1;
  await Promise.all([saveConfig('weather_items', CONFIG.weatherLocations), saveConfig(configKey, CONFIG[configKey])]);
}

async function addClockZone(query) {
  // Validate IANA timezone string
  try { Intl.DateTimeFormat('en', { timeZone: query }); }
  catch { throw new Error(`"${query}" is not a valid IANA timezone. Try e.g. America/New_York.`); }

  const configKey = `clock_${query.replace(/\//g, '_')}`;
  if (CLOCK_ZONES.find(z => z.configKey === configKey)) {
    throw new Error(`${query} is already in the list.`);
  }
  const label = query.split('/').pop().replace(/_/g, ' ');
  const zone  = { label, tz: query, configKey };
  CLOCK_ZONES.push(zone);
  CONFIG[configKey] = CLOCK_ZONES.length - 1;
  await Promise.all([saveConfig('clock_items', CLOCK_ZONES), saveConfig(configKey, CONFIG[configKey])]);
}

// =========================================================
// DELETE ITEM
// =========================================================

async function deleteItem(configKey, array, dbKey) {
  const idx = array.findIndex(i => i.configKey === configKey);
  if (idx === -1) return;
  array.splice(idx, 1);
  delete CONFIG[configKey];
  await Promise.all([
    saveConfig(dbKey, array),
    fetch(`api/config.php?key=${encodeURIComponent(configKey)}`, { method: 'DELETE' }).catch(() => {}),
  ]);
}

async function deleteClockZone(configKey) {
  const idx = CLOCK_ZONES.findIndex(z => z.configKey === configKey);
  if (idx === -1) return;
  CLOCK_ZONES.splice(idx, 1);
  delete CONFIG[configKey];
  await Promise.all([
    saveConfig('clock_items', CLOCK_ZONES),
    fetch(`api/config.php?key=${encodeURIComponent(configKey)}`, { method: 'DELETE' }).catch(() => {}),
  ]);
}

// =========================================================
// RENDER
// =========================================================

async function refreshCrypto() {
  const id = 'crypto-list';
  const container = document.getElementById(id);
  if (!container) return;
  if (!CONFIG.crypto.length) { container.innerHTML = ''; return; }
  try {
    const data   = await fetchCrypto();
    const sorted = sortByConfig(CONFIG.crypto);
    container.innerHTML = sorted.map(coin => {
      const info = data[coin.id] || {};
      const ch   = fmtPct(info.usd_24h_change);
      return tickerRow(coin.configKey, coin.symbol, coin.name, fmtPrice(info.usd, '$'), ch.text, ch.cls);
    }).join('');
    makeSortable(container);
  } catch (e) {
    setError(id, `Crypto data unavailable: ${e.message}`);
  }
}

async function refreshFinnhubGroup(listId, items) {
  const container = document.getElementById(listId);
  if (!container) return;
  if (!items.length) { container.innerHTML = ''; return; }

  const keyOk = CONFIG.finnhubKey && CONFIG.finnhubKey !== 'YOUR_FINNHUB_API_KEY';
  if (!keyOk) {
    container.innerHTML = `
      <div class="alert alert-warning small mt-2 p-2 mb-0">
        Set <strong>CONFIG.finnhubKey</strong> in <code>app.js</code> to enable this card.<br>
        Get a free key at <a href="https://finnhub.io" target="_blank" rel="noopener" class="alert-link">finnhub.io</a>
      </div>`;
    return;
  }
  try {
    const sorted = sortByConfig(items);
    const quotes = await Promise.all(sorted.map(item => finnhubQuote(item.symbol)));
    container.innerHTML = quotes.map((q, i) => {
      const item    = sorted[i];
      const invalid = q.c === 0 && q.pc === 0 && q.h === 0;
      const priceStr = invalid ? '—' : fmtPrice(q.c, item.currency || '$');
      const ch = invalid ? { text: 'unavailable', cls: 'neutral' } : fmtPct(q.dp);
      return tickerRow(item.configKey, item.symbol, item.name, priceStr, ch.text, ch.cls);
    }).join('');
    makeSortable(container);
  } catch (e) {
    setError(listId, `Data unavailable: ${e.message}`);
  }
}

async function refreshForexCard(listId, base, items) {
  const container = document.getElementById(listId);
  if (!container) return;
  if (!items.length) { container.innerHTML = ''; return; }
  try {
    const sorted = sortByConfig(items);
    const codes  = sorted.map(f => f.code);
    const { latest, prev } = await fetchForexPair(base, codes);
    container.innerHTML = sorted.map(fx => {
      const rate     = latest.rates?.[fx.code];
      const prevRate = prev.rates?.[fx.code];
      const priceStr = rate != null ? fmtRate(rate, fx.code) : '—';
      const pctChange = (rate != null && prevRate != null && prevRate !== 0)
        ? ((rate - prevRate) / prevRate) * 100 : null;
      const ch = fmtPct(pctChange);
      return tickerRow(fx.configKey, fx.code, fx.name, priceStr, ch.text, ch.cls);
    }).join('');
    makeSortable(container);
  } catch (e) {
    setError(listId, `Forex data unavailable: ${e.message}`);
  }
}

// =========================================================
// WEATHER
// =========================================================

const WMO = {
  0: 'Clear sky',
  1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Fog', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain',    63: 'Rain',      65: 'Heavy rain',
  71: 'Light snow',    73: 'Snow',      75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers',  86: 'Heavy snow showers',
  95: 'Thunderstorm',  96: 'Thunderstorm + hail', 99: 'Thunderstorm + hail',
};

let cachedUserLocation = null;

function getUserLocation() {
  if (cachedUserLocation) return Promise.resolve(cachedUserLocation);
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('unavailable')); return; }
    navigator.geolocation.getCurrentPosition(
      pos => {
        cachedUserLocation = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        resolve(cachedUserLocation);
      },
      err => reject(err),
      { timeout: 6000 }
    );
  });
}

async function refreshWeather() {
  const listId = 'weather-list';
  const container = document.getElementById(listId);
  if (!container) return;
  try {
    // DB-backed locations, sorted; "My Location" prepended separately (not DB-sorted)
    const sorted = sortByConfig(CONFIG.weatherLocations);
    const allLocations = [];

    try {
      const { lat, lon } = await getUserLocation();
      // data-no-sort prevents it being sortable (no drag handle, no delete)
      allLocations.push({ name: 'My location', lat, lon, configKey: 'weather_My_Location', isMyLocation: true });
    } catch {
      // Geolocation unavailable — continue without it
    }
    allLocations.push(...sorted);

    const results = await Promise.all(
      allLocations.map(loc => fetchWeather(loc.lat, loc.lon).then(data => ({ loc, data })))
    );

    container.innerHTML = results.map(({ loc, data }) => {
      const c         = data.current;
      const temp      = Math.round(c.temperature_2m);
      const feelsLike = Math.round(c.apparent_temperature);
      const wind      = Math.round(c.wind_speed_10m);
      const humidity  = c.relative_humidity_2m;
      const desc      = WMO[c.weather_code] ?? 'Unknown';
      const noSort    = loc.isMyLocation ? ' data-no-sort="true"' : '';
      const handle    = loc.isMyLocation
        ? '<span class="drag-handle" style="visibility:hidden"><i class="bi bi-grip-vertical"></i></span>'
        : '<span class="drag-handle"><i class="bi bi-grip-vertical"></i></span>';
      const delBtn    = loc.isMyLocation ? '' :
        `<button class="delete-btn" data-config-key="${loc.configKey}" title="Remove"><i class="bi bi-trash3"></i></button>`;
      return `
        <div class="weather-item" data-config-key="${loc.configKey}"${noSort}>
          ${handle}
          <div class="weather-content">
            <div class="weather-header">
              <span class="weather-city">${loc.name}</span>
              <span class="weather-temp">${temp}°C</span>
            </div>
            <div class="weather-desc">${desc}</div>
            <div class="weather-meta">Feels like ${feelsLike}°C &nbsp;·&nbsp; ${wind} mph &nbsp;·&nbsp; ${humidity}% humidity</div>
          </div>
          ${delBtn}
        </div>`;
    }).join('');
    makeSortable(container);
  } catch (e) {
    setError(listId, `Weather unavailable: ${e.message}`);
  }
}

// =========================================================
// CLOCK
// =========================================================

function tzAbbr(date, tz) {
  return Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'short' })
    .formatToParts(date)
    .find(p => p.type === 'timeZoneName')?.value ?? '';
}

// tickClock reads tz from data-tz attribute — no hardcoded IDs needed
function tickClock() {
  const now = new Date();
  const dateEl = document.getElementById('clock-date');
  if (dateEl) {
    dateEl.textContent = now.toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    });
  }
  document.querySelectorAll('#clock-zones .clock-zone').forEach(el => {
    const tz     = el.dataset.tz;
    const timeEl = el.querySelector('.zone-time');
    const abbrEl = el.querySelector('.zone-abbr');
    if (timeEl && tz) timeEl.textContent = now.toLocaleTimeString('en-GB', {
      timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
    if (abbrEl && tz) abbrEl.textContent = tzAbbr(now, tz);
  });
}

function renderClockZones() {
  const container = document.getElementById('clock-zones');
  if (!container) return;
  const sorted = sortByConfig(CLOCK_ZONES);
  container.innerHTML = sorted.map(zone => `
    <div class="clock-zone" data-config-key="${zone.configKey}" data-tz="${zone.tz}">
      <span class="drag-handle"><i class="bi bi-grip-vertical"></i></span>
      <span class="zone-label">${zone.label}</span>
      <span class="zone-time"></span>
      <span class="zone-abbr"></span>
      <button class="delete-btn ms-auto" data-config-key="${zone.configKey}" title="Remove">
        <i class="bi bi-trash3"></i>
      </button>
    </div>`).join('');
  makeSortable(container);
  tickClock(); // fill times immediately
}

function updateTimestamp() {
  const el = document.getElementById('last-updated');
  if (el) el.textContent = 'Updated ' + new Date().toLocaleTimeString();
}

// =========================================================
// ADD ITEM FORMS
// =========================================================

/**
 * Injects an add-item form as a sibling after the list element.
 * The form stays in the DOM across refreshes (refresh only replaces the list's innerHTML).
 */
function injectAddForm(listId, placeholder, onSubmit) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  const form = document.createElement('div');
  form.className = 'add-item-form';
  form.innerHTML = `
    <div class="input-group input-group-sm">
      <input type="text" class="form-control" placeholder="${placeholder}">
      <button class="btn btn-outline-secondary" type="button">+</button>
    </div>
    <p class="add-error text-danger small mt-1 mb-0" style="display:none"></p>`;
  listEl.insertAdjacentElement('afterend', form);

  const input = form.querySelector('input');
  const btn   = form.querySelector('button');
  const errEl = form.querySelector('.add-error');

  async function submit() {
    const val = input.value.trim();
    if (!val) return;
    btn.disabled = true;
    btn.textContent = '…';
    errEl.style.display = 'none';
    try {
      await onSubmit(val);
      input.value = '';
    } catch (e) {
      errEl.textContent = e.message;
      errEl.style.display = '';
    } finally {
      btn.disabled = false;
      btn.textContent = '+';
    }
  }

  btn.addEventListener('click', submit);
  input.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
}

function setupAddForms() {
  injectAddForm('clock-zones', 'Timezone (e.g. America/New_York)', async val => {
    await addClockZone(val);
    renderClockZones();
  });

  injectAddForm('weather-list', 'City name (e.g. Barcelona)', async val => {
    await addWeatherItem(val);
    await refreshWeather();
  });

  injectAddForm('crypto-list', 'Coin name or symbol (e.g. dogecoin)', async val => {
    await addCryptoItem(val);
    await refreshCrypto();
  });

  injectAddForm('indices-global-list', 'Symbol (e.g. ^GSPC)', async val => {
    await addMarketsItem(val);
    await refreshFinnhubGroup('indices-global-list', CONFIG.indicesGlobal);
  });

  injectAddForm('forex-gbp-list', 'Currency code (e.g. AUD)', async val => {
    await addForexItem(val);
    await refreshForexCard('forex-gbp-list', 'GBP', CONFIG.forexGBP);
  });
}

// =========================================================
// DELETE — event delegation (listeners survive innerHTML refresh)
// =========================================================

function setupDeleteHandlers() {
  function onDelete(listId, handler) {
    document.getElementById(listId)?.addEventListener('click', async e => {
      const btn = e.target.closest('.delete-btn');
      if (!btn || btn.disabled) return;
      btn.disabled = true;
      try { await handler(btn.dataset.configKey); }
      finally { btn.disabled = false; }
    });
  }

  onDelete('clock-zones', async key => {
    await deleteClockZone(key);
    renderClockZones();
  });

  onDelete('weather-list', async key => {
    if (key === 'weather_My_Location') return;
    await deleteItem(key, CONFIG.weatherLocations, 'weather_items');
    await refreshWeather();
  });

  onDelete('crypto-list', async key => {
    await deleteItem(key, CONFIG.crypto, 'crypto_items');
    await refreshCrypto();
  });

  onDelete('indices-global-list', async key => {
    await deleteItem(key, CONFIG.indicesGlobal, 'markets_items');
    await refreshFinnhubGroup('indices-global-list', CONFIG.indicesGlobal);
  });

  onDelete('forex-gbp-list', async key => {
    await deleteItem(key, CONFIG.forexGBP, 'forex_items');
    await refreshForexCard('forex-gbp-list', 'GBP', CONFIG.forexGBP);
  });
}

// =========================================================
// CONFIG DB
// =========================================================

async function saveConfig(key, value) {
  const body = {
    key,
    value: (typeof value === 'string') ? value : JSON.stringify(value),
  };
  const res = await fetch('api/config.php', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Save failed: HTTP ${res.status}`);
  return res.json();
}

/**
 * If the DB already has items for this key, apply them via setter.
 * Otherwise seed the defaults to the DB so future loads use them.
 */
async function applyOrSeed(dbKey, defaultValue, setter) {
  const stored = CONFIG[dbKey];
  if (Array.isArray(stored) && stored.length > 0) {
    setter(stored);
  } else {
    try { await saveConfig(dbKey, defaultValue); }
    catch { /* offline — use defaults */ }
  }
}

async function loadConfig() {
  try {
    const data = await fetch('api/config.php').then(r => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
    for (const [key, raw] of Object.entries(data)) {
      try { CONFIG[key] = JSON.parse(raw); }
      catch { CONFIG[key] = raw; }
    }
  } catch (e) {
    console.warn('Config DB unavailable, using defaults:', e.message);
  }

  // Apply item arrays from DB, or seed defaults if this is the first run
  await applyOrSeed('clock_items',   CLOCK_ZONES,              v => { CLOCK_ZONES = v; });
  await applyOrSeed('crypto_items',  CONFIG.crypto,            v => { CONFIG.crypto = v; });
  await applyOrSeed('markets_items', CONFIG.indicesGlobal,     v => { CONFIG.indicesGlobal = v; });
  await applyOrSeed('forex_items',   CONFIG.forexGBP,          v => { CONFIG.forexGBP = v; });
  await applyOrSeed('weather_items', CONFIG.weatherLocations,  v => { CONFIG.weatherLocations = v; });
}

// =========================================================
// REFRESH ALL + INIT
// =========================================================

async function refreshAll() {
  ['weather-list', 'crypto-list', 'indices-global-list', 'forex-gbp-list'].forEach(setLoading);
  await Promise.all([
    refreshWeather(),
    refreshCrypto(),
    refreshFinnhubGroup('indices-global-list', CONFIG.indicesGlobal),
    refreshForexCard('forex-gbp-list', 'GBP', CONFIG.forexGBP),
  ]);
  updateTimestamp();
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadConfig();

  // Clock (rendered from data, not static HTML)
  renderClockZones();
  tickClock();
  setInterval(tickClock, 1000);

  // Wire up delete handlers (event delegation — set up once)
  setupDeleteHandlers();

  // Inject add forms (siblings of lists — survive innerHTML refreshes)
  setupAddForms();

  await refreshAll();
  setInterval(refreshAll, CONFIG.refreshInterval);
  document.getElementById('refresh-btn').addEventListener('click', refreshAll);
});
