const { createRecord } = require('../netsuiteClient');
const config = require('../config');
const logger = require('../logger');

// NOTE: the "apply" sublist field names below match NetSuite's standard vendorpayment
// record. If this account uses a customized Bill Payment form, verify the schema first
// with: GET /services/rest/record/v1/metadata-catalog/vendorpayment
function buildVendorPaymentPayload(bill) {
  return {
    entity: { id: bill.vendorId },
    account: { id: config.netsuite.paymentAccountId },
    apply: {
      items: [
        {
          doc: bill.internalId,
          apply: true,
          amount: bill.amount,
        },
      ],
    },
  };
}

async function payBill(bill) {
  const payload = buildVendorPaymentPayload(bill);

  if (config.dryRun) {
    logger.info(
      `[DRY RUN] Would create vendorpayment for bill ${bill.tranId} ` +
        `(vendor: ${bill.vendorName}, amount: ${bill.amount} ${bill.currency})`
    );
    return { dryRun: true, bill };
  }

  logger.info(`Creating vendorpayment for bill ${bill.tranId} (vendor: ${bill.vendorName})`);
  const result = await createRecord('vendorpayment', payload);
  logger.info(`Payment created for bill ${bill.tranId}`);
  return { dryRun: false, bill, result };
}

module.exports = { payBill, buildVendorPaymentPayload };
