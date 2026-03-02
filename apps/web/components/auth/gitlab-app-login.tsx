"use client";

import { ReposLoadingUI } from "@/components/loading-uis";
import useModal from "@/hooks/use-modal";
import { useOrganization } from "@/hooks/use-organization";
import { GITLAB_APP_QUERIES } from "@/lib/queries";
import { replaceOrganizationWithWorkspace } from "@/lib/utils";
import { authClient } from "@notpadd/auth/auth-client";
import { env } from "@notpadd/env/client";
import { Button } from "@notpadd/ui/components/button";
import { Icons } from "@notpadd/ui/components/icons";
import { Input } from "@notpadd/ui/components/input";
import { useMutation, useQuery } from "@tanstack/react-query";
import axios from "axios";
import { Cog, ExternalLink } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useDebounce } from "use-debounce";

export const GitlabAppLogin = () => {
  const { activeOrganization, isOwner, setActiveOrganization } =
    useOrganization();
  const { onOpen } = useModal();
  const router = useRouter();
  const [isConnecting, setIsConnecting] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 500);
  const {
    data: integration,
    isLoading: isLoadingIntegration,
    isError: isErrorIntegration,
  } = useQuery({
    queryKey: ["gitlab-integrations", activeOrganization?.id],
    queryFn: () =>
      GITLAB_APP_QUERIES.getUserIntegration(activeOrganization!.id),
    enabled: !!activeOrganization?.id && isOwner,
  });

  const { data: repositoriesData, isLoading: isLoadingRepositories } = useQuery(
    {
      queryKey: ["gitlab-repositories", integration?.id, debouncedSearch],
      queryFn: async () => {
        const params = new URLSearchParams({
          per_page: "10",
        });
        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const { data } = await axios.get(
          `/api/gitlab/repositories?${params.toString()}`,
        );

        if (!data.success) {
          throw new Error(data.error);
        }

        return data;
      },
      enabled: !!integration?.id && isOwner,
    },
  );

  const { mutate: connectRepository, isPending: isConnectingRepository } =
    useMutation({
      mutationFn: async (repositoryId: string) => {
        if (!activeOrganization?.id) {
          throw new Error("Active organization not found");
        }
        const { data, error } = await authClient.organization.update({
          data: {
            repoUrl: repositoryId,
            repoProvider: "gitlab",
            repoPath: "",
          },
          organizationId: activeOrganization.id,
        });

        if (error) {
          throw new Error(error.message);
        }
        return data; // This will return the correctly formatted authOrganization
      },
      onSuccess: (data) => {
        setActiveOrganization(data.id, data.slug);
        router.refresh();
      },
      onError: (error: any) => {
        toast.error(replaceOrganizationWithWorkspace(error.message));
      },
    });

  const repositories = repositoriesData?.data || [];

  const handleConnect = () => {
    if (!activeOrganization?.id) return;

    setIsConnecting(true);
    const clientId = (env as any).NEXT_PUBLIC_GITLAB_CLIENT_ID || "";
    const redirectUri = (env as any).NEXT_PUBLIC_GITLAB_REDIRECT_URI || "";
    const state = activeOrganization.slug;

    // We will just assume NEXT_PUBLIC_GITLAB_CLIENT_ID and redirect URI are set in client env
    // But since they are only server, we might need a workaround for the URL or just pass it through NEXT_PUBLIC
    // The easiest is to use a server endpoint to redirect, but for now we can hardcode the authorize URL pattern
    // if we added NEXT_PUBLIC prefixed env vars. Wait, let's just do it cleanly by redirecting to a helper route or configuring env
    // I see in the implementation plan we rely on NEXT_PUBLIC envs for gitlab OAuth?
    // Let's use the env object. Wait, the GitHub integration used window.location.href directly relying on NEXT_PUBLIC_GITHUB_APP_NAME.

    // Fallback if env isn't fully configured
    const cid = process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID || "";
    const ruri = process.env.NEXT_PUBLIC_GITLAB_REDIRECT_URI || "";

    if (!cid || !ruri) {
      alert("GitLab OAuth config (NEXT_PUBLIC_GITLAB_CLIENT_ID) is missing.");
      setIsConnecting(false);
      return;
    }

    const gitlabInstallUrl = `https://gitlab.com/oauth/authorize?client_id=${cid}&redirect_uri=${ruri}&response_type=code&state=${state}&scope=api`;
    window.location.href = gitlabInstallUrl;
  };

  const isGitLabConnected = activeOrganization?.repoProvider === "gitlab";

  if (!isOwner && !isGitLabConnected) {
    return (
      <div className="border p-4 flex items-center justify-between gap-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="size-10 border bg-sidebar flex items-center justify-center rounded-md">
            <Icons.gitlab className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">GitLab Integration</h2>
            <p className="text-sm text-muted-foreground">
              Only organization owners can connect GitLab App
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isOwner && !integration) {
    return (
      <div className="border p-4 flex items-center justify-between gap-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="size-10 border bg-sidebar flex items-center justify-center rounded-md">
            <Icons.gitlab className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">GitLab Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your GitLab account to your workspace
            </p>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
      </div>
    );
  }

  if (isGitLabConnected && activeOrganization?.repoUrl) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex gap-2 flex-col">
          <h2 className="text-lg font-bold">GitLab Integration</h2>
          <p className="text-sm text-muted-foreground">
            You are connected to a GitLab repository
          </p>
        </div>
        <div className="border p-4 flex items-center gap-2 justify-between rounded-lg">
          <div className="flex items-center gap-4">
            <div className="size-10 flex items-center justify-center border bg-sidebar rounded-md">
              <Icons.gitlab className="size-5" />
            </div>
            <div>
              <Link
                href={`https://gitlab.com/${activeOrganization?.repoUrl}`}
                className="flex items-center gap-2 group hover:underline"
                target="_blank"
              >
                <h2 className="font-bold text-lg">
                  {activeOrganization?.repoUrl}
                </h2>
                <ExternalLink className="size-4 text-muted-foreground group-hover:text-primary transition-colors" />
              </Link>
              <p className="text-sm text-muted-foreground">
                {activeOrganization?.repoPath || "/"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => connectRepository("")}
              disabled={isConnectingRepository}
            >
              Disconnect
            </Button>
            <Button
              size="icon"
              variant="outline"
              onClick={() => onOpen("gitlab-config")}
            >
              <Cog className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // If integration exists but no GitLab repo is actively connected, show the search UI
  if (integration) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 flex-col">
          <h2 className="text-lg font-bold">GitLab Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Workspace to a GitLab repository
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <div className="mb-2">
            <Input
              type="text"
              placeholder="Search for a repository"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="divide-y border rounded-lg overflow-hidden">
            {isLoadingRepositories ? (
              <ReposLoadingUI count={10} />
            ) : repositories.length > 0 ? (
              repositories.map((repository: any) => {
                return (
                  <div
                    key={repository.id}
                    className="p-3 hover:bg-sidebar cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <h2 className="font-medium">
                        {repository.name} {repository.private && "🔒"}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {repository.full_name}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => connectRepository(repository.full_name)}
                      disabled={isConnectingRepository}
                    >
                      Connect
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="text-sm text-muted-foreground p-4 text-center border-t">
                {debouncedSearch
                  ? "No repositories found"
                  : "No repositories available"}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};
