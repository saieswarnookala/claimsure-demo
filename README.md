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

## Sign-in
The Worker in `src/index.js` puts a login page in front of the app (signed session cookie, 12 hours).
Users live in the `USERS` repo secret as JSON; the workflow copies it and `SESSION_SECRET` to Cloudflare on every deploy.

Add or change a user:

    node scripts/add-user.mjs <username> "<Full name>" "<Role>" "<password>"

Merge the printed entry into the `USERS` secret (Settings → Secrets → Actions), then re-run the deploy.

## Run locally
Create `.dev.vars` with `USERS=...` and `SESSION_SECRET=...`, then:

    npx wrangler dev

Or open `public/index.html` directly (no sign-in).

## Deploy
Pushing to `main` deploys to Cloudflare Workers through GitHub Actions.
Repo secrets needed: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `USERS`, `SESSION_SECRET`.

Manual deploy:

    npx wrangler deploy

## Layout
    public/index.html                 the app (HTML, CSS, JS)
    src/index.js                      login page and session check (Worker)
    scripts/add-user.mjs              makes a USERS entry with a hashed password
    wrangler.jsonc                    Cloudflare Workers static-assets config
    .github/workflows/deploy.yml      deploy on push to main
