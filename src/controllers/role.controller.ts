import { Request, Response } from "express";
import {
  createRoleService,
  deleteRoleService,
  getRoleByIdService,
  getRolesService,
  updateRoleService,
} from "../services/role.service";

// Serialization helper to convert BigInt timestamps to ISO strings
const serializeRole = (role: any) => {
  if (!role) return null;
  
  return {
    ...role,
    roleId: Number(role.roleId),
    createdAt: role.createdAt ? new Date(Number(role.createdAt)).toISOString() : null,
    updatedAt: role.updatedAt ? new Date(Number(role.updatedAt)).toISOString() : null,
  };
};

const serializeRoles = (roles: any[]) => {
  return roles.map(serializeRole);
};

export const createRole = async (req: Request, res: Response) => {
  try {
    const { roleName, displayName, description, privileges, isActive, isSystemRole } = req.body;

    if (!roleName || !displayName) {
      return res.status(400).json({
        message: "Role name and display name are required",
      });
    }

    const role = await createRoleService({
      roleName,
      displayName,
      description,
      privileges,
      isActive,
      isSystemRole,
    });

    res.status(201).json(serializeRole(role));
  } catch (error: any) {
    console.error('[createRole] Error:', error);
    
    if (error.code === 'P2002') {
      return res.status(409).json({
        message: "Role name already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create role",
    });
  }
};

export const getRoles = async (req: Request, res: Response) => {
  try {
    const roles = await getRolesService();
    res.json(serializeRoles(roles));
  } catch (error) {
    console.error('[getRoles] Error:', error);
    res.status(500).json({
      message: "Failed to fetch roles",
    });
  }
};

export const getRoleById = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({
        message: "Invalid role ID",
      });
    }

    const role = await getRoleByIdService(roleId);

    if (!role) {
      return res.status(404).json({
        message: "Role not found",
      });
    }

    res.json(serializeRole(role));
  } catch (error) {
    console.error('[getRoleById] Error:', error);
    res.status(500).json({
      message: "Failed to fetch role",
    });
  }
};

export const updateRole = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({
        message: "Invalid role ID",
      });
    }

    const role = await updateRoleService(roleId, req.body);
    res.json(serializeRole(role));
  } catch (error: any) {
    console.error('[updateRole] Error:', error);

    if (error.message === 'Cannot delete system role') {
      return res.status(403).json({
        message: "Cannot modify system role privileges",
      });
    }

    res.status(500).json({
      message: "Failed to update role",
    });
  }
};

export const deleteRole = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({
        message: "Invalid role ID",
      });
    }

    await deleteRoleService(roleId);
    res.json({
      message: "Role deleted successfully",
    });
  } catch (error: any) {
    console.error('[deleteRole] Error:', error);

    if (error.message === 'Cannot delete system role') {
      return res.status(403).json({
        message: "Cannot delete system role",
      });
    }

    res.status(500).json({
      message: "Failed to delete role",
    });
  }
};
