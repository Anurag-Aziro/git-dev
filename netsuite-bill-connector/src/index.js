const cron = require('node-cron');
const config = require('./config');
const logger = require('./logger');
const { getApprovedUnpaidBills } = require('./services/billsService');
const { payBill } = require('./services/paymentService');

async function runOnce() {
  logger.info(`Run started. dryRun=${config.dryRun} maxBillsPerRun=${config.maxBillsPerRun}`);

  const bills = await getApprovedUnpaidBills(config.maxBillsPerRun);
  logger.info(`Found ${bills.length} approved, unpaid bill(s)`);

  const results = { paid: [], failed: [] };

  for (const bill of bills) {
    try {
      const outcome = await payBill(bill);
      results.paid.push(outcome);
    } catch (err) {
      logger.error(`Failed to pay bill ${bill.tranId}:`, err.message);
      results.failed.push({ bill, error: err.message });
    }
  }

  logger.info(
    `Run complete. Succeeded: ${results.paid.length}, Failed: ${results.failed.length}`
  );

  if (results.failed.length > 0) {
    logger.warn('Bills that failed to process:', results.failed.map((f) => f.bill.tranId));
  }

  return results;
}

async function main() {
  if (config.scheduleCron) {
    logger.info(`Scheduling run with cron expression: ${config.scheduleCron}`);
    cron.schedule(config.scheduleCron, () => {
      runOnce().catch((err) => logger.error('Scheduled run failed:', err.message));
    });
  } else {
    await runOnce();
  }
}

main().catch((err) => {
  logger.error('Fatal error:', err.message);
  process.exitCode = 1;
});
