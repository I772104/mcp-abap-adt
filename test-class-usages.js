// Simple test script to verify GetClassUsages functionality
const { handleGetClassUsages } = require('./dist/handlers/handleGetClassUsages');

async function testGetClassUsages() {
    console.log('Testing GetClassUsages functionality...');
    
    try {
        // Test with a common SAP class
        const result = await handleGetClassUsages({ class_name: 'CL_ABAP_UNIT_ASSERT' });
        
        console.log('Result:', JSON.stringify(result, null, 2));
        
        if (result.isError) {
            console.error('Test failed with error:', result.content[0].text);
        } else {
            console.log('Test passed! GetClassUsages is working correctly.');
            console.log('Response contains usage information for the class.');
        }
    } catch (error) {
        console.error('Test failed with exception:', error.message);
    }
}

// Only run if this file is executed directly
if (require.main === module) {
    testGetClassUsages();
}
