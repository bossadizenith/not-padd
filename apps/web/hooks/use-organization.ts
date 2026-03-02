"use client";

import { useCallback } from "react";
import { authClient } from "@notpadd/auth/auth-client";
import type { Member, Organization } from "@/types";

// Type for Better Auth organization return with additional fields
type AuthOrganization = Organization & {
  repoProvider?: string;
  repoUrl?: string;
  repoPath?: string;
};

export interface UseOrganizationReturn {
  organizations: Organization[] | null;
  organizationsLoading: boolean;
  organizationsError: Error | null;
  refetchOrganizations: () => Promise<void>;

  activeOrganization: Organization | null;
  activeOrganizationLoading: boolean;
  activeOrganizationError: Error | null;
  setActiveOrganization: (
    organizationId: string,
    organizationSlug: string,
  ) => Promise<void>;
  unsetActiveOrganization: () => Promise<void>;

  activeMember: Member | null;
  activeMemberLoading: boolean;
  activeMemberError: Error | null;
  refetchActiveMember: () => Promise<void>;

  isOwner: boolean;
  isAdmin: boolean;
  isMember: boolean;
  hasPermission: (permissions: Record<string, string[]>) => Promise<boolean>;
}

export const useOrganization = (): UseOrganizationReturn => {
  const {
    data: organizations,
    isPending: organizationsLoading,
    error: organizationsError,
    refetch: refetchOrganizations,
  } = authClient.useListOrganizations();

  const {
    data: activeOrganization,
    isPending: activeOrganizationLoading,
    error: activeOrganizationError,
  } = authClient.useActiveOrganization();

  const {
    data: activeMember,
    isPending: activeMemberLoading,
    error: activeMemberError,
    refetch: refetchActiveMember,
  } = authClient.useActiveMember();

  const setActiveOrganization = useCallback(
    async (organizationId: string, organizationSlug: string) => {
      try {
        await authClient.organization.setActive({
          organizationId,
          organizationSlug,
        });
        await refetchActiveMember();
      } catch (error) {
        console.error("Failed to set active organization:", error);
        throw error;
      }
    },
    [refetchActiveMember],
  );

  const unsetActiveOrganization = useCallback(async () => {
    try {
      await authClient.organization.setActive({
        organizationId: null,
        organizationSlug: "",
      });
      await refetchActiveMember();
    } catch (error) {
      console.error("Failed to unset active organization:", error);
      throw error;
    }
  }, [refetchActiveMember]);

  const hasPermission = useCallback(
    async (permissions: Record<string, string[]>) => {
      try {
        const { data } = await authClient.organization.hasPermission({
          permissions,
        });
        return data?.success || false;
      } catch (error) {
        console.error("Failed to check permissions:", error);
        return false;
      }
    },
    [],
  );

  const isOwner = activeMember?.role === "owner";
  const isAdmin = activeMember?.role === "admin" || isOwner;
  const isMember = activeMember?.role === "member" || isAdmin;

  return {
    organizations: (organizations || null) as Organization[] | null,
    organizationsLoading,
    organizationsError: organizationsError as Error | null,
    refetchOrganizations: refetchOrganizations as () => Promise<void>,

    activeOrganization: (activeOrganization || null) as Organization | null,
    activeOrganizationLoading,
    activeOrganizationError: activeOrganizationError as Error | null,
    setActiveOrganization,
    unsetActiveOrganization,

    activeMember: activeMember || null,
    activeMemberLoading,
    activeMemberError: activeMemberError as Error | null,
    refetchActiveMember: refetchActiveMember as () => Promise<void>,

    isOwner,
    isAdmin,
    isMember,
    hasPermission,
  };
};

export const useOrganizationList = () => {
  const {
    data: organizations,
    isPending: loading,
    error,
    refetch,
  } = authClient.useListOrganizations();

  return {
    organizations: organizations || null,
    loading,
    error: error as Error | null,
    refetch: refetch as () => Promise<void>,
  };
};

export const useActiveOrganization = () => {
  const {
    data: activeOrganization,
    isPending: loading,
    error,
  } = authClient.useActiveOrganization();

  return {
    activeOrganization: activeOrganization || null,
    loading,
    error: error as Error | null,
  };
};

export const useActiveMember = () => {
  const {
    data: activeMember,
    isPending: loading,
    error,
    refetch,
  } = authClient.useActiveMember();

  return {
    activeMember: activeMember || null,
    loading,
    error: error as Error | null,
    refetch: refetch as () => Promise<void>,
  };
};

// Hook for organization management actions
export const useOrganizationActions = () => {
  const createOrganization = useCallback(
    async (data: {
      name: string;
      slug: string;
      logo?: string;
      metadata?: Record<string, any>;
      keepCurrentActiveOrganization?: boolean;
    }) => {
      try {
        // @ts-ignore nothing
        const result = await authClient.organization.create(data);
        return result;
      } catch (error) {
        console.error("Failed to create organization:", error);
        throw error;
      }
    },
    [],
  );

  const updateOrganization = useCallback(
    async (data: {
      name?: string;
      slug?: string;
      logo?: string;
      metadata?: Record<string, any>;
      organizationId: string;
    }) => {
      try {
        const result = await authClient.organization.update({
          data,
          organizationId: data.organizationId,
        });
        return result;
      } catch (error) {
        console.error("Failed to update organization:", error);
        throw error;
      }
    },
    [],
  );

  const deleteOrganization = useCallback(async (organizationId: string) => {
    try {
      const result = await authClient.organization.delete({ organizationId });
      return result;
    } catch (error) {
      console.error("Failed to delete organization:", error);
      throw error;
    }
  }, []);

  const checkSlug = useCallback(async (slug: string) => {
    try {
      const result = await authClient.organization.checkSlug({ slug });
      return result;
    } catch (error) {
      console.error("Failed to check slug:", error);
      throw error;
    }
  }, []);

  return {
    createOrganization,
    updateOrganization,
    deleteOrganization,
    checkSlug,
  };
};
