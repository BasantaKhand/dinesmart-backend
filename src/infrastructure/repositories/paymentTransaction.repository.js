const PaymentTransaction = require('../db/models/PaymentTransaction');

class PaymentTransactionRepository {
  async create(data) {
    return PaymentTransaction.create(data);
  }

  async findOne(filter, options = {}) {
    let query = PaymentTransaction.findOne(filter);
    if (options.sort) query = query.sort(options.sort);
    return query;
  }

  async save(doc) {
    return doc.save();
  }
}

module.exports = PaymentTransactionRepository;
