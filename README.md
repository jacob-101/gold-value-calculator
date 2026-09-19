# Aurum — Gold Value Calculator

A fast, mobile-first calculator for the intrinsic value of gold jewellery, coins and bars. Aurum combines a live XAU/USD spot price with SGD and INR exchange rates, then separates raw metal value from vendor markup, making charges and tax.

## Features

- Live 24K spot price per gram in SGD, INR and USD
- Exact karat, percentage and fineness calculations
- Smart input such as `10g 22k vendor 1650 sgd`
- Vendor premium and price-per-gram breakdown
- Optional making-charge and tax estimate
- Cached last-known data and manual-rate fallback
- Responsive light and dark themes

## Run locally

```bash
npm run dev
```

Open <http://localhost:4173>.

## Test

```bash
npm test
npm run check
```

## Data sources

- Gold spot: [Gold API](https://gold-api.com/docs) — free, no-key XAU price endpoint
- FX: [Frankfurter](https://frankfurter.dev/) — central-bank exchange-rate data

One troy ounce is converted using `31.1034768 grams`. API responses are validated before use. If live data fails, Aurum identifies cached data as stale and offers a clearly labelled manual 24K rate.

## Hosting

The app is dependency-free static HTML, CSS and JavaScript. It can be deployed directly to Cloudflare Pages with no build command and `/` as the output directory.

## Disclaimer

Market prices are informational and may differ from executable dealer prices. Confirm any purchase with the seller.
