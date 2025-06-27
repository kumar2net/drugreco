const fs = require('fs');
const path = require('path');

exports.seed = async function(knex) {
  // Read the exported drugs from localhost
  const drugsPath = path.join(__dirname, '../../../localhost-drugs-export.json');
  const localDrugs = JSON.parse(fs.readFileSync(drugsPath, 'utf8'));
  
  // Clear existing entries
  await knex('drugs').del();
  
  // Prepare drugs for insertion (exclude id, convert arrays to JSON strings)
  const drugsToInsert = localDrugs.map(drug => ({
    name: drug.name,
    category: drug.category,
    combination: drug.combination,
    strength: drug.strength,
    dosageForm: drug.dosageForm,
    manufacturer: drug.manufacturer,
    price: drug.price,
    sideEffects: JSON.stringify(drug.sideEffects),
    alternatives: JSON.stringify(drug.alternatives)
  }));
  
  // Insert all drugs
  await knex('drugs').insert(drugsToInsert);
  
  console.log(`✅ Successfully seeded ${drugsToInsert.length} drugs to database`);
}; 