const { suiteQL } = require('../netsuiteClient');

// approvalstatus: 1 = Pending Approval, 2 = Approved, 3 = Rejected (Bills Approval feature).
// status != 'VendBill:B' excludes bills already fully paid.
const APPROVED_UNPAID_BILLS_QUERY = `
  SELECT
    t.id AS internalid,
    t.tranid,
    t.entity AS vendorid,
    e.entityid AS vendorname,
    t.trandate,
    t.duedate,
    t.foreigntotal AS amount,
    t.currency
  FROM transaction t
  JOIN entity e ON e.id = t.entity
  WHERE t.type = 'VendBill'
    AND t.mainline = 'T'
    AND t.approvalstatus = '2'
    AND t.status != 'VendBill:B'
  ORDER BY t.duedate ASC
`;

async function getApprovedUnpaidBills(limit) {
  const result = await suiteQL(APPROVED_UNPAID_BILLS_QUERY, { limit });
  return (result.items || []).map((row) => ({
    internalId: row.internalid,
    tranId: row.tranid,
    vendorId: row.vendorid,
    vendorName: row.vendorname,
    tranDate: row.trandate,
    dueDate: row.duedate,
    amount: parseFloat(row.amount),
    currency: row.currency,
  }));
}

module.exports = { getApprovedUnpaidBills };
