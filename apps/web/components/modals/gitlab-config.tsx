"use client";

import useModal from "@/hooks/use-modal";
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogMiniPadding,
  DialogContentWrapper,
} from "@notpadd/ui/components/dialog";
import { useOrganization } from "@/hooks/use-organization";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Button } from "@notpadd/ui/components/button";
import { Input } from "@notpadd/ui/components/input";
import { authClient } from "@notpadd/auth/auth-client";
import { GITLAB_APP_QUERIES } from "@/lib/queries";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { replaceOrganizationWithWorkspace } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Folder, ChevronRight, Loader2 } from "lucide-react";
import { LoadingButton } from "@notpadd/ui/components/loading-button";

export const GitlabConfig = () => {
  const { onClose, type } = useModal();
  const { activeOrganization, isOwner, setActiveOrganization } =
    useOrganization();
  const queryClient = useQueryClient();
  const router = useRouter();
  const [selectedPath, setSelectedPath] = useState(
    activeOrganization?.repoPath || "",
  );
  const [pathHistory, setPathHistory] = useState<string[]>([""]);
  const isGitlabConfigModalOpen = type === "gitlab-config";

  const { data: integration } = useQuery({
    queryKey: ["gitlab-integrations", activeOrganization?.id],
    queryFn: () =>
      GITLAB_APP_QUERIES.getUserIntegration(activeOrganization!.id),
    enabled: !!activeOrganization?.id && isOwner && isGitlabConfigModalOpen,
  });

  const repoUrl = activeOrganization?.repoUrl;
  const projectId = repoUrl; // The repoUrl acts as the GitLab project ID (e.g. namespace/repo)

  const { data: foldersData, isLoading: isLoadingFolders } = useQuery({
    queryKey: ["gitlab-contents", integration?.id, projectId, selectedPath],
    queryFn: async () => {
      const params = new URLSearchParams({
        projectId: projectId!,
        path: selectedPath,
      });

      const { data } = await axios.get(
        `/api/gitlab/contents?${params.toString()}`,
      );

      if (!data.success) {
        throw new Error(data.error);
      }

      return data;
    },
    enabled: !!integration?.id && !!projectId && isGitlabConfigModalOpen,
  });

  const folders = foldersData?.data || [];

  const { mutate: updateRepoPath, isPending: isUpdatingPath } = useMutation({
    mutationFn: async (repoPath: string) => {
      if (!activeOrganization?.id) {
        throw new Error("Active organization not found");
      }
      const { data, error } = await authClient.organization.update({
        data: {
          repoPath: repoPath,
        },
        organizationId: activeOrganization.id,
      });

      if (error) {
        throw new Error(error.message);
      }
      return data;
    },
    onSuccess: (data) => {
      setActiveOrganization(data.id, data.slug);
      queryClient.invalidateQueries({
        queryKey: ["gitlab-integrations", activeOrganization?.id],
      });
      router.refresh();
      toast.success("Repository path updated successfully");
      onClose();
    },
    onError: (error: any) => {
      toast.error(replaceOrganizationWithWorkspace(error.message));
    },
  });

  const handleFolderClick = (folderPath: string) => {
    setSelectedPath(folderPath);
    setPathHistory([...pathHistory, folderPath]);
  };

  const handlePathBack = () => {
    if (pathHistory.length > 1) {
      const newHistory = [...pathHistory];
      newHistory.pop();
      const previousPath = newHistory[newHistory.length - 1] || "";
      setPathHistory(newHistory);
      setSelectedPath(previousPath);
    }
  };

  const handleSave = () => {
    updateRepoPath(selectedPath);
  };

  if (!repoUrl) {
    return (
      <Dialog open={isGitlabConfigModalOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>GitLab Configuration</DialogTitle>
          </DialogHeader>
          <DialogMiniPadding>
            <DialogContentWrapper>
              <p className="text-sm text-muted-foreground">
                No repository connected. Please connect a repository first.
              </p>
            </DialogContentWrapper>
          </DialogMiniPadding>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isGitlabConfigModalOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Configure Repository Path</DialogTitle>
        </DialogHeader>
        <DialogMiniPadding>
          <DialogContentWrapper>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  Repository
                </label>
                <p className="text-sm text-muted-foreground">{repoUrl}</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Selected Path
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <Input
                    value={selectedPath}
                    onChange={(e) => setSelectedPath(e.target.value)}
                    placeholder="/path/to/folder"
                  />
                </div>
                {pathHistory.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePathBack}
                    className="mb-2"
                  >
                    ← Back
                  </Button>
                )}
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  Browse Folders
                </label>
                <div className="border rounded-lg max-h-64 overflow-y-auto">
                  {isLoadingFolders ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="size-4 animate-spin" />
                    </div>
                  ) : folders.length > 0 ? (
                    <div className="divide-y">
                      {folders.map((folder: any) => (
                        <button
                          key={folder.path}
                          onClick={() => handleFolderClick(folder.path)}
                          className="w-full p-3 hover:bg-sidebar flex items-center gap-2 text-left transition-colors"
                        >
                          <Folder className="size-4 text-muted-foreground" />
                          <span className="flex-1">{folder.name}</span>
                          <ChevronRight className="size-4 text-muted-foreground" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center text-sm text-muted-foreground">
                      No folders found in this directory
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <LoadingButton
                  onClick={handleSave}
                  loading={isUpdatingPath}
                  disabled={
                    isUpdatingPath ||
                    selectedPath === activeOrganization?.repoPath
                  }
                >
                  {isUpdatingPath ? "Saving..." : "Save Path"}
                </LoadingButton>
              </div>
            </div>
          </DialogContentWrapper>
        </DialogMiniPadding>
      </DialogContent>
    </Dialog>
  );
};
