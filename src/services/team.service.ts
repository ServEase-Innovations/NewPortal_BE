import prisma from "../prisma";

export const createTeamService = async (data: any) => {
  // Set timestamps as epoch
  const teamData = {
    ...data,
    milestoneDeadline: data.milestoneDeadline ? BigInt(new Date(data.milestoneDeadline).getTime()) : BigInt(Date.now()),
    createdAt: BigInt(Date.now()),
    updatedAt: BigInt(Date.now()),
  };
  
  return prisma.team.create({
    data: teamData,
  });
};

export const getTeamsService = async () => {
  return prisma.team.findMany({
    include: {
      employees: true,
    },
  });
};

export const getTeamByIdService = async (
  id: string
) => {
  return prisma.team.findUnique({
    where: {
      teamId: id,
    },
    include: {
      employees: true,
    },
  });
};

export const updateTeamService = async (
  id: string,
  data: any
) => {
  // Convert milestoneDeadline if provided, and always update updatedAt
  const updateData: any = {
    ...data,
    updatedAt: BigInt(Date.now()),
  };
  
  if (data.milestoneDeadline) {
    updateData.milestoneDeadline = BigInt(new Date(data.milestoneDeadline).getTime());
  }
  
  return prisma.team.update({
    where: {
      teamId: id,
    },
    data: updateData,
  });
};

export const deleteTeamService = async (
  id: string
) => {
  return prisma.team.delete({
    where: {
      teamId: id,
    },
  });
};