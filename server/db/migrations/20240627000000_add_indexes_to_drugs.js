exports.up = function(knex) {
  return knex.schema.alterTable('drugs', table => {
    // Add indexes for frequently queried columns
    table.index('name', 'idx_drugs_name');
    table.index('category', 'idx_drugs_category');
    table.index('manufacturer', 'idx_drugs_manufacturer');
    table.index('price', 'idx_drugs_price');
  });
};

exports.down = function(knex) {
  return knex.schema.alterTable('drugs', table => {
    // Drop indexes
    table.dropIndex('name', 'idx_drugs_name');
    table.dropIndex('category', 'idx_drugs_category');
    table.dropIndex('manufacturer', 'idx_drugs_manufacturer');
    table.dropIndex('price', 'idx_drugs_price');
  });
}; 