import prisma from "../prisma";

export const createTeamService = async (data: any) => {
  return prisma.team.create({
    data,
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
  return prisma.team.update({
    where: {
      teamId: id,
    },
    data,
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