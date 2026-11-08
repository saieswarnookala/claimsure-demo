# ClaimSure audit demo

Demo console for auditing Indian public health-scheme claims (PM-JAY, Dr. NTR Vaidya Seva, Aarogyasri).
All patients, hospitals and package rates are made up. No real patient data.

## What it does
- 12 sample AP claims with 8 planted problems (edited bill, reused X-ray, ghost patient, date mismatch,
  cash charged, above package rate, fake stamp, identity mismatch)
- 9 automatic checks with evidence, and a risk score from 0 to 100
- Claim vs hospital record vs patient's papers comparison
- Home visit form in English and Telugu that re-scores the claim when saved
- Auto-filled audit report with a decision log (saved in the browser)

## Run locally
Open `public/index.html` in a browser, or:

    npx wrangler dev

## Deploy
Pushing to `main` deploys to Cloudflare Workers through GitHub Actions.
Repo secrets needed: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

Manual deploy:

    npx wrangler deploy

## Layout
    public/index.html                 the whole app (HTML, CSS, JS)
    wrangler.jsonc                    Cloudflare Workers static-assets config
    .github/workflows/deploy.yml      deploy on push to main
