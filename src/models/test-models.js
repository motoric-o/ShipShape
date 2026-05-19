const UserModel = require('./user.model');
const RoomModel = require('./room.model');
const InventoryModel = require('./inventory.model');
const BHPModel = require('./bhp.model');
const ProcurementModel = require('./procurement.model');
const MaintenanceModel = require('./maintenance.model');

async function runTests() {
  console.log('--- RUNNING MODEL VERIFICATION TESTS ---');
  
  try {
    const users = await UserModel.findAll();
    console.log(`[PASS] UserModel.findAll: Retrieved ${users.length} users.`);
    
    const rooms = await RoomModel.findAll();
    console.log(`[PASS] RoomModel.findAll: Retrieved ${rooms.length} rooms.`);
    
    const inventories = await InventoryModel.findAll();
    console.log(`[PASS] InventoryModel.findAll: Retrieved ${inventories.length} inventory items.`);
    
    const bhps = await BHPModel.findAll();
    console.log(`[PASS] BHPModel.findAll: Retrieved ${bhps.length} BHP items.`);
    
    const drafts = await ProcurementModel.findAllDrafts();
    console.log(`[PASS] ProcurementModel.findAllDrafts: Retrieved ${drafts.length} drafts.`);
    
    const logs = await MaintenanceModel.findAllLogs();
    console.log(`[PASS] MaintenanceModel.findAllLogs: Retrieved ${logs.length} logs.`);
    
    console.log('--- ALL READ TESTS PASSED SUCCESSFULLY ---');
    process.exit(0);
  } catch (error) {
    console.error('[FAIL] Model verification failed:', error);
    process.exit(1);
  }
}

runTests();
