# MyDashboard — Project Summary

A personal information dashboard built from scratch. Runs locally (or on a web server) and displays live data across multiple configurable cards. All user preferences — card order, item order, custom titles, show/hide state, and news feed selection — are persisted to a MySQL database.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, JavaScript ES modules |
| UI Framework | Bootstrap 5.3.3 + Bootstrap Icons 1.11.3 |
| Drag & Drop | SortableJS 1.15.2 |
| Backend | PHP 8 with PDO |
| Database | MySQL (`incww_dashboard`) |
| Node package | `finnhub` npm library (ES module source) |

---

## File Structure

```
MyDashboard/
├── index.html           Main HTML — 6 card layout
├── styles.css           Custom component styles (Bootstrap handles layout)
├── app.js               All JS — data fetching, rendering, UX
├── db.php               PDO singleton; reads credentials from .env
├── schema.sql           CREATE TABLE + seed data
├── .env                 DB credentials (not committed)
├── .htaccess            Blocks directory indexing; HTTPS redirect (commented)
├── api/
│   ├── config.php       REST CRUD for key-value config table
│   └── news.php         BBC RSS feed proxy/parser
└── node_modules/
    └── finnhub/         Finnhub API library (used via src/index.js ES module)
```

---

## Cards

### Clock
- 24-hour digital clock with seconds
- Multiple timezone rows (Local, London, Paris, Istanbul — user-configurable)
- Uses `Intl.DateTimeFormat` for timezone-aware times and abbreviations
- Fully data-driven: zones rendered from `CLOCK_ZONES` array (stored in DB as `clock_items`)

### Weather
- Uses **Open-Meteo API** (free, no key, CORS-enabled)
- Shows current location (browser Geolocation) + fixed cities (London, Brugge, Izmir)
- Displays temperature, feels-like, wind speed, humidity, WMO condition description
- Cities are user-configurable: add via city name (geocoded via Open-Meteo), delete with trash icon
- Location list persisted to DB as `weather_items`

### Crypto
- Uses **CoinGecko API** (free, no key)
- Shows price (USD) and 24h % change for BTC, ETH, SOL (user-configurable)
- Add new coins by name/symbol (validated via CoinGecko search)
- Persisted to DB as `crypto_items`

### Global Markets
- Uses **Finnhub API** (free tier key)
- Shows FTSE 100, Nifty 50, BSE Sensex — price in native currency + % change
- Invalid/unsupported symbols detected and shown as "unavailable"
- Add new symbols by Finnhub symbol code; persisted as `markets_items`

### Forex vs GBP
- Uses **Frankfurter API** (free, no key, CORS-enabled)
- Shows GBP rate against USD, EUR, JPY, INR, CHF (user-configurable)
- 1-day % change calculated from previous day's rate
- Add new currencies by ISO code (validated via Frankfurter); persisted as `forex_items`

### News
- PHP proxy (`api/news.php`) fetches and parses **BBC RSS feeds**
- Feed selector menu below the card title with three top-level tabs:
  - **News** — dropdown: Top Stories, UK, World, England, Scotland, Wales, N. Ireland, Africa, Asia, Europe, Latin America, Middle East, US & Canada, Business, Politics, Health, Education, Science, Technology, Entertainment
  - **Sport** — dropdown: Sport, Rugby Union, Tennis, Cricket, Snooker, Winter Olympics
  - **Weather** — direct (BBC 3-day forecast RSS)
- Shows 5 stories initially with a "Show N more" button revealing the rest instantly
- Selected feed persisted to DB as `news_page`

---

## Database

Single table: **`config`** (`keyid VARCHAR(100)`, `value TEXT`, `updated_at TIMESTAMP`)

Used as a key-value store for all user preferences:

| Key pattern | Purpose |
|---|---|
| `clock_items` | JSON array of clock zone definitions |
| `crypto_items` | JSON array of crypto coin definitions |
| `markets_items` | JSON array of index definitions |
| `forex_items` | JSON array of currency definitions |
| `weather_items` | JSON array of location definitions |
| `{configKey}` (e.g. `crypto_BTC`) | Numeric sort order for that item |
| `card_{type}` (e.g. `card_clock`) | Numeric sort order for the card itself |
| `title_{type}` (e.g. `title_clock`) | Custom card title string |
| `hidden_cards` | JSON array of card types currently hidden |
| `news_page` | Currently selected news feed page code |

### API endpoint — `api/config.php`
- `GET /api/config.php` → all key-value pairs as JSON object
- `GET /api/config.php?key=xyz` → single record
- `POST /api/config.php` body `{"key":"…","value":"…"}` → upsert
- `DELETE /api/config.php?key=xyz` → delete record

---

## External APIs Used

| API | Purpose | Auth |
|---|---|---|
| CoinGecko | Crypto prices + 24h change | None |
| Finnhub | Stock/index quotes | Free API key |
| Frankfurter | Forex rates (live + historical) | None |
| Open-Meteo | Weather forecasts | None |
| Open-Meteo Geocoding | City → lat/lon lookup | None |
| BBC RSS feeds | News headlines | None (via PHP proxy) |

---

## UX Features

### Card management
- **Drag cards** using the `⠿` grip in each card's title bar to reorder the grid
- **Hide/show cards** via the `⊞` button in the navbar — shows a panel listing all registered card types with Show/Hide buttons
- Hidden cards are skipped during data refresh
- Card order and visibility persisted to DB

### Item management (within each card)
- **Drag items** within a card list to reorder them; order saved to DB
- **Delete items** with the trash icon on each row
- **Add items** via the input form at the bottom of each card list
  - Each card type validates via its respective API before adding
  - Invalid entries show an inline error message
- Item lists persisted to DB as JSON arrays (`{card}_items`)

### Card titles
- Click any card title to edit it inline (`contenteditable`)
- `Enter` or clicking away saves to DB
- `Escape` reverts to previous value
- Empty titles are rejected

### Auto-refresh
- All data cards refresh every 60 seconds automatically
- Manual refresh via the `⟳` button in the navbar
- "Updated HH:MM:SS" timestamp shown in navbar after each refresh

---

## Architecture Notes

### `CARD_REGISTRY`
Central registry of all card types in `app.js`. Each entry defines `type`, `configKey`, `titleKey`, `defaultTitle`, `description`, `listId`, and a `refresh` lambda. Adding a new card type requires:
1. One entry in `CARD_REGISTRY`
2. Card HTML in `index.html`
3. A `refresh{Type}()` function in `app.js`

All existing infrastructure (drag, show/hide, editable title, refresh loop, manage panel) works automatically.

### Config persistence pattern
- On first load: if a `{card}_items` key is absent from DB, defaults are seeded to DB
- On subsequent loads: DB values replace in-code defaults
- Item order is stored as individual numeric keys per item (`crypto_BTC = 0` etc.)
- `sortByConfig(items)` sorts any item array by these stored order values

### ES module + Finnhub
`app.js` is a `<script type="module">`. The `finnhub` npm library is imported from `node_modules/finnhub/src/index.js` (the ES module source, not the CommonJS `dist/`). Its callback-based `quote()` method is wrapped in a Promise.

### SortableJS
Loaded as a regular (non-module) script before `app.js`. Accessed via `window.Sortable` from within the module. Instances are tracked in a `Map` and destroyed before re-creation on each render to prevent duplicate handlers.

---

## Known Limitations / Notes

- Finnhub free tier may not support all global indices (`^FTSE`, `^NSEI`, `^BSESN`) — detected and shown as "unavailable" rather than crashing
- "My Location" weather row is always prepended dynamically (not stored in `weather_items`); it has no delete button
- Clock zones saved to DB capture the timezone string from the first device; "Local" on a different device will show that stored timezone rather than the true local one
- `hidden_cards` simply hides the DOM element — card HTML always exists in `index.html`; cards cannot be truly removed without code changes
