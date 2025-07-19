const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testDatabase() {
  console.log('🧪 Testing database connection...\n');

  try {
    // Test 1: Check if we can connect
    console.log('1️⃣ Testing database connection');
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Test 2: Count drugs
    console.log('\n2️⃣ Testing drug count');
    const drugCount = await prisma.drug.count();
    console.log(`✅ Found ${drugCount} drugs in database`);

    // Test 3: Get sample drugs
    console.log('\n3️⃣ Testing drug query');
    const sampleDrugs = await prisma.drug.findMany({ take: 3 });
    console.log(`✅ Sample drugs:`, sampleDrugs.map(d => d.name));

    // Test 4: Count family members
    console.log('\n4️⃣ Testing family members count');
    const memberCount = await prisma.familyMember.count();
    console.log(`✅ Found ${memberCount} family members in database`);

    // Test 5: Get sample family members
    console.log('\n5️⃣ Testing family member query');
    const sampleMembers = await prisma.familyMember.findMany({ take: 3 });
    console.log(`✅ Sample members:`, sampleMembers.map(m => m.name));

    console.log('\n🎉 Database testing completed successfully!');

  } catch (error) {
    console.error('❌ Database test failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();