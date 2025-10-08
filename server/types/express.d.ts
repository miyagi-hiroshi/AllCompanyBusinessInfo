import type { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        employeeId: number;
        email: string;
        firstName: string;
        lastName: string;
        isFirstLogin: boolean;
        employee: {
          id: number;
        };
      };
    }
  }
}

export {};
