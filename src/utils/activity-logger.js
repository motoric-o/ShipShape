const prisma = require('../config/db');

function sanitize(data, entityType) {
  if (!data) return null;
  // Deep clone to avoid mutating original objects
  const cleaned = JSON.parse(JSON.stringify(data));
  
  if (entityType === 'Users') {
    if (cleaned.password) delete cleaned.password;
  }
  
  return cleaned;
}

/**
 * Logs an entity modification action to the database.
 * 
 * @param {number} userId - ID of the user performing the action
 * @param {string} entityType - Name of the model (e.g. 'Room', 'Inventory')
 * @param {number|string} entityId - Primary key of the affected entity
 * @param {'CREATE'|'UPDATE'|'DELETE'|'ROLLBACK'} action - The action type
 * @param {object|null} previousState - State of the entity before modification
 * @param {object|null} currentState - State of the entity after modification
 */
async function logActivity(userId, entityType, entityId, action, previousState, currentState) {
  try {
    const prevSanitized = sanitize(previousState, entityType);
    const currSanitized = sanitize(currentState, entityType);

    await prisma.activityLog.create({
      data: {
        userId,
        entityType,
        entityId: parseInt(entityId),
        action,
        previousState: prevSanitized ? JSON.stringify(prevSanitized) : null,
        currentState: currSanitized ? JSON.stringify(currSanitized) : null,
      }
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
}

module.exports = {
  logActivity
};
