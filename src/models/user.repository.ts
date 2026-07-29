import { prisma } from '../config/prisma';
import { User } from '@prisma/client';

class UserRepository {
  /**
   * Finds a user by their email address.
   */
  async findByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email },
    });
  }

  /**
   * Finds a user by their ID.
   */
  async findById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Creates a new user in the database.
   */
  async create(email: string, passwordHash: string, tenantId: string): Promise<User> {
    return prisma.user.create({
      data: {
        email,
        password: passwordHash,
        tenantId,
      },
    });
  }
  /**
   * Retrieves all users for a given tenant.
   */
  async findMany(tenantId: string) {
    return prisma.user.findMany({
      where: { tenantId },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Updates a user's role.
   */
  async updateRole(id: string, tenantId: string, role: string) {
    const user = await prisma.user.findFirst({ where: { id, tenantId } });
    if (!user) return null;

    return prisma.user.update({
      where: { id },
      data: { role: role as any },
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }
}

export const userRepository = new UserRepository();
