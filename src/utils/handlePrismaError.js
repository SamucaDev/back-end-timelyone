const { Prisma } = require("@prisma/client");

const handlePrismaError = (error) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        const field = error.meta?.target?.[0] || 'field';
        return {
          status: 409,
          message: `${field} already exists`,
          type: 'CONFLICT'
        };
        
      case 'P2025':
        return {
          status: 404,
          message: 'Record not found',
          type: 'NOT_FOUND'
        };
        
      case 'P2003':
        return {
          status: 400,
          message: 'Invalid reference to related record',
          type: 'FOREIGN_KEY_CONSTRAINT'
        };
        
      case 'P2011':
        const nullField = error.meta?.constraint || 'required field';
        return {
          status: 400,
          message: `${nullField} cannot be null`,
          type: 'NULL_CONSTRAINT'
        };
        
      case 'P2014':
        return {
          status: 400,
          message: 'Invalid ID provided',
          type: 'INVALID_ID'
        };
        
      default:
        return {
          status: 400,
          message: 'Database operation failed',
          type: 'DATABASE_ERROR',
          code: error.code
        };
    }
  }
  
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return {
      status: 500,
      message: 'Unknown database error occurred',
      type: 'UNKNOWN_ERROR'
    };
  }
  
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    return {
      status: 500,
      message: 'Database engine crashed',
      type: 'ENGINE_CRASH'
    };
  }
  
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      status: 500,
      message: 'Failed to connect to database',
      type: 'CONNECTION_ERROR'
    };
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      status: 400,
      message: 'Invalid data provided',
      type: 'VALIDATION_ERROR'
    };
  }
  
  return {
    status: 500,
    message: 'Internal server error',
    type: 'INTERNAL_ERROR'
  };
}

module.exports = handlePrismaError