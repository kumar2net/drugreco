const fetch = require('node-fetch');

const API_BASE = 'http://localhost:5000/api';

async function testAPI() {
  console.log('🧪 Testing Family Drug Management API...\n');

  try {
    // Test 1: Get family members
    console.log('1️⃣ Testing GET /family-members');
    const membersResponse = await fetch(`${API_BASE}/family-members`);
    const membersData = await membersResponse.json();
    console.log('✅ Family members:', membersData.success ? `${membersData.data.length} members found` : 'Failed');

    // Test 2: Search drugs
    console.log('\n2️⃣ Testing GET /drugs/search');
    const drugsResponse = await fetch(`${API_BASE}/drugs/search?query=Paracetamol`);
    const drugsData = await drugsResponse.json();
    console.log('✅ Drug search:', drugsData.success ? `${drugsData.data.length} results found` : 'Failed');

    // Test 3: Family interactions check
    console.log('\n3️⃣ Testing POST /interactions/family-check');
    const interactionsResponse = await fetch(`${API_BASE}/interactions/family-check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    const interactionsData = await interactionsResponse.json();
    console.log('✅ Family interactions:', interactionsData.success ? `${interactionsData.data.interactions.length} interactions found` : 'Failed');

    // Test 4: Create a test family member
    console.log('\n4️⃣ Testing POST /family-members');
    const newMember = {
      name: 'API Test User',
      age: 25,
      allergies: ['Test Allergy'],
      conditions: ['Test Condition'],
      emergencyContact: 'Test Contact',
      emergencyPhone: '+1234567890',
      role: 'member'
    };
    
    const createResponse = await fetch(`${API_BASE}/family-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMember)
    });
    const createData = await createResponse.json();
    console.log('✅ Create member:', createData.success ? 'Member created successfully' : 'Failed');

    if (createData.success) {
      const memberId = createData.data.id;
      
      // Test 5: Add medication to member
      console.log('\n5️⃣ Testing POST /family-medications');
      const medication = {
        familyMemberId: memberId,
        drugId: 1, // Assuming first drug exists
        dosage: '500mg',
        frequency: 'Twice daily',
        notes: 'Test medication',
        cost: 50.00
      };

      const medResponse = await fetch(`${API_BASE}/family-medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medication)
      });
      const medData = await medResponse.json();
      console.log('✅ Add medication:', medData.success ? 'Medication added successfully' : 'Failed');

      // Test 6: Get member medications
      console.log('\n6️⃣ Testing GET /family-medications/:memberId');
      const memberMedsResponse = await fetch(`${API_BASE}/family-medications/${memberId}`);
      const memberMedsData = await memberMedsResponse.json();
      console.log('✅ Get medications:', memberMedsData.success ? `${memberMedsData.data.length} medications found` : 'Failed');

      // Test 7: Get emergency info
      console.log('\n7️⃣ Testing GET /emergency/:memberId');
      const emergencyResponse = await fetch(`${API_BASE}/emergency/${memberId}`);
      const emergencyData = await emergencyResponse.json();
      console.log('✅ Emergency info:', emergencyData.success ? 'Emergency data retrieved' : 'Failed');

      // Clean up: Delete test member
      console.log('\n🧹 Cleaning up test data...');
      const deleteResponse = await fetch(`${API_BASE}/family-members/${memberId}`, {
        method: 'DELETE'
      });
      const deleteData = await deleteResponse.json();
      console.log('✅ Cleanup:', deleteData.success ? 'Test member deleted' : 'Failed');
    }

    console.log('\n🎉 API testing completed!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Only run if we have node-fetch available
if (typeof fetch === 'undefined') {
  console.log('Installing node-fetch for testing...');
  require('child_process').exec('npm install node-fetch@2', (error, stdout, stderr) => {
    if (error) {
      console.error('Failed to install node-fetch. Please install it manually: npm install node-fetch@2');
      return;
    }
    console.log('node-fetch installed. Please run this script again.');
  });
} else {
  testAPI();
}