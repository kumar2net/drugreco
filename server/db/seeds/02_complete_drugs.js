const fs = require('fs');
const path = require('path');

exports.seed = async function(knex) {
  // Determine the JSON file path for drug seed data.
  // Allows overriding via environment variable `DRUGS_SEED_FILE` to support different deployment setups.
  const defaultPath = path.join(__dirname, '../../../localhost-drugs-export.json');
  let drugsFilePath = process.env.DRUGS_SEED_FILE ? path.resolve(process.env.DRUGS_SEED_FILE) : defaultPath;

  // Fallback: if path not found and env provided relative path, try resolving relative to project root
  if (!fs.existsSync(drugsFilePath)) {
    const projectRootCandidate = path.join(__dirname, '../../../../', path.basename(drugsFilePath));
    if (fs.existsSync(projectRootCandidate)) {
      drugsFilePath = projectRootCandidate;
    }
  }

  if (!fs.existsSync(drugsFilePath)) {
    throw new Error(`Drug seed file not found at path: ${drugsFilePath}`);
  }

  const localDrugs = JSON.parse(fs.readFileSync(drugsFilePath, 'utf8'));
  
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