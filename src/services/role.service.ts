import prisma from "../prisma";

export const createRoleService = async (data: any) => {
  const now = Date.now();
  
  return prisma.role.create({
    data: {
      roleName: data.roleName,
      displayName: data.displayName,
      description: data.description || null,
      privileges: data.privileges || {},
      isActive: data.isActive !== undefined ? data.isActive : true,
      isSystemRole: data.isSystemRole || false,
      createdAt: BigInt(now),
      updatedAt: BigInt(now),
    },
  });
};

export const getRolesService = async () => {
  return prisma.role.findMany({
    orderBy: {
      roleName: 'asc',
    },
  });
};

export const getRoleByIdService = async (id: number) => {
  return prisma.role.findUnique({
    where: {
      roleId: id,
    },
  });
};

export const getRoleByNameService = async (roleName: string) => {
  return prisma.role.findUnique({
    where: {
      roleName,
    },
  });
};

export const updateRoleService = async (id: number, data: any) => {
  const updateData: any = {
    updatedAt: BigInt(Date.now()),
  };

  if (data.displayName !== undefined) updateData.displayName = data.displayName;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.privileges !== undefined) updateData.privileges = data.privileges;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  return prisma.role.update({
    where: {
      roleId: id,
    },
    data: updateData,
  });
};

export const deleteRoleService = async (id: number) => {
  // Check if it's a system role
  const role = await prisma.role.findUnique({
    where: { roleId: id },
  });

  if (role?.isSystemRole) {
    throw new Error('Cannot delete system role');
  }

  return prisma.role.delete({
    where: {
      roleId: id,
    },
  });
};
