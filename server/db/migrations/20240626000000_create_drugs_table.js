exports.up = function(knex) {
  return knex.schema.createTable('drugs', table => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('category');
    table.string('combination');
    table.string('strength');
    table.string('dosageForm');
    table.string('manufacturer');
    table.decimal('price');
    table.json('sideEffects');
    table.json('alternatives');
    
    // Add indexes for frequently queried columns
    table.index('name');
    table.index('category');
    table.index('manufacturer');
    table.index('price');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('drugs');
}; 