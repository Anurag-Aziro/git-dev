# NetSuite Bill Payment Connector

Fetches approved, unpaid vendor bills from NetSuite (via SuiteQL over REST) and
creates Bill Payment records for them automatically.

## How it works

1. `billsService` runs a SuiteQL query for `VendBill` transactions where
   `approvalstatus = 2` (Approved) and `status` is not fully paid.
2. `paymentService` creates a `vendorpayment` record for each bill, applying the
   full amount against that bill, via `POST /services/rest/record/v1/vendorpayment`.
3. `index.js` orchestrates a single run (or a recurring one, via cron) and logs a
   success/failure summary. One bill failing to process does not stop the others.

## Setup

1. In NetSuite, enable the REST Web Services and SuiteQL features
   (Setup > Company > Enable Features > SuiteCloud).
2. Generate a private key and self-signed certificate for OAuth 2.0 Machine-to-Machine
   (M2M) authentication, e.g.:
   ```
   openssl req -x509 -newkey rsa:2048 -keyout netsuite-m2m.pem -out netsuite-m2m.crt -days 365 -nodes
   ```
3. Create an Integration record (Setup > Integration > Manage Integrations > New)
   with "OAuth 2.0 Machine to Machine" enabled, upload the `.crt` public certificate,
   and note the **Client ID** and **Certificate ID** it assigns.
4. Assign the certificate to a role (Setup > Users/Roles > Manage Roles) that has
   "View" on Vendor Bill and "Create/Edit" on Vendor Payment, and confirm that role
   has the M2M certificate associated with it under the employee/entity record.
5. Copy `.env.example` to `.env` and fill in the account ID, Client ID, Certificate ID,
   the path to (or inline contents of) the private key PEM, the REST base URL, and the
   internal ID of the GL account payments should post from.
6. Install dependencies and run:

   ```
   npm install
   npm start
   ```

## Safety

- **`DRY_RUN=true` by default.** The connector will log every bill it *would*
  pay without creating any records. Only set `DRY_RUN=false` after verifying
  the dry-run output against a sandbox account.
- **`MAX_BILLS_PER_RUN`** caps how many bills a single run will touch.
- Test against a NetSuite **sandbox** account before pointing this at production.
- The `vendorpayment` payload in `src/services/paymentService.js` uses the
  standard NetSuite `apply` sublist field names. If your account uses a
  customized Bill Payment form, verify the schema first with:
  `GET /services/rest/record/v1/metadata-catalog/vendorpayment`.

## Scheduling

Leave `SCHEDULE_CRON` empty to run once and exit — use this with an external
scheduler (Windows Task Scheduler, cron, a CI pipeline's scheduled trigger).
Alternatively, set `SCHEDULE_CRON` (e.g. `0 */2 * * *` for every 2 hours) to
have the process stay alive and run on that schedule internally.
