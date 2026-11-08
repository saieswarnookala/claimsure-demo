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

## Visit photos
The Photos tab has a checklist of hospital-visit and home-visit shots. Each photo is stamped with time,
GPS location and auditor, fingerprinted (SHA-256) to catch reuse, and shown in the audit report.
Patient photos stay locked until consent is recorded.

Storage switches itself:
- **Now:** photos are saved in the browser (IndexedDB) on the device that took them.
- **With R2 connected:** photos upload to the bucket and every signed-in user sees them.

### Connect R2 later
1. Cloudflare dashboard → R2 → create bucket `claimsure-photos` (the API token needs R2 edit permission).
2. Add to `wrangler.jsonc`:

       "r2_buckets": [{ "binding": "PHOTOS", "bucket_name": "claimsure-photos" }]

3. Push. The app detects the bucket (`/api/photos/status`) and starts uploading. No app code changes.

## Reading the register and case sheet
Photos in the "Admission register" and "Case sheet" slots are read automatically and compared with the claim
(name, age, sex, admission and discharge dates, diagnosis including left/right/both sides, procedure, doctor).
Auditors can correct a misread; the check re-runs.

The reader switches itself:
- **Now:** text recognition in the browser (Tesseract.js). Good for printed pages, weak on handwriting.
- **With `ANTHROPIC_API_KEY` set:** the Worker sends the page to Claude, which reads handwriting and Telugu.
  Add the key as a repo secret; the deploy copies it to Cloudflare. Optional `READER_MODEL` overrides the model.
  Use only sample data until a data-processing agreement is in place.

"Add sample photos (demo)" generates register and case-sheet pages from the sample data, with planted
problems in cases 004 (different patient), 008 (right knee vs both knees) and 011 (age 54 vs 34).

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
