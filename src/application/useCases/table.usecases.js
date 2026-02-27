const { NotFoundError, ValidationError } = require('../../shared/errors');

class TableUseCases {
  constructor({ tableRepository }) {
    this.tableRepo = tableRepository;
  }

  async _generateNextTableNumber(restaurantId) {
    const existingTables = await this.tableRepo.find({ restaurantId }, { select: 'number', lean: true });
    const maxNumber = existingTables.reduce((maxValue, table) => {
      const match = String(table.number || '').match(/(\d+)$/);
      if (!match) return maxValue;
      const parsed = Number(match[1]);
      return Number.isNaN(parsed) ? maxValue : Math.max(maxValue, parsed);
    }, 0);
    return `T-${String(maxNumber + 1).padStart(2, '0')}`;
  }

  async getTables(restaurantId) {
    return this.tableRepo.find({ restaurantId }, { sort: { number: 1 } });
  }

  async getTable(id, restaurantId) {
    const table = await this.tableRepo.findOne({ _id: id, restaurantId });
    if (!table) throw new NotFoundError('Table not found');
    return table;
  }

  async createTable(data, restaurantId) {
    data.restaurantId = restaurantId;
    const incomingNumber = typeof data.number === 'string' ? data.number.trim() : '';
    data.number = incomingNumber || await this._generateNextTableNumber(restaurantId);

    const tableExists = await this.tableRepo.findOne({ number: data.number, restaurantId });
    if (tableExists) throw new ValidationError(`Table number ${data.number} already exists`);

    return this.tableRepo.create(data);
  }

  async updateTable(id, data, restaurantId) {
    let table = await this.tableRepo.findOne({ _id: id, restaurantId });
    if (!table) throw new NotFoundError('Table not found');

    if (data.number && data.number !== table.number) {
      const tableExists = await this.tableRepo.findOne({ number: data.number, restaurantId });
      if (tableExists) throw new ValidationError(`Table number ${data.number} already exists`);
    }

    table = await this.tableRepo.findByIdAndUpdate(id, data);
    return table;
  }

  async deleteTable(id, restaurantId) {
    const table = await this.tableRepo.findOne({ _id: id, restaurantId });
    if (!table) throw new NotFoundError('Table not found');
    await this.tableRepo.deleteOne(table);
  }
}

module.exports = TableUseCases;
