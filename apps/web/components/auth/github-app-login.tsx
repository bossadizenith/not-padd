"use client";

import { ReposLoadingUI } from "@/components/loading-uis";
import useModal from "@/hooks/use-modal";
import { useOrganization } from "@/hooks/use-organization";
import { GITHUB_APP_QUERIES } from "@/lib/queries";
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

export const GithubAppLogin = () => {
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
    queryKey: ["github-integrations", activeOrganization?.id],
    queryFn: () =>
      GITHUB_APP_QUERIES.getUserIntegration(activeOrganization!.id),
    enabled: !!activeOrganization?.id && isOwner,
  });

  const { data: repositoriesData, isLoading: isLoadingRepositories } = useQuery(
    {
      queryKey: [
        "github-repositories",
        integration?.installationId,
        debouncedSearch,
      ],
      queryFn: async () => {
        const params = new URLSearchParams({
          installation_id: String(integration?.installationId),
          per_page: "10",
        });
        if (debouncedSearch) {
          params.append("search", debouncedSearch);
        }

        const { data } = await axios.get(
          `/api/github/repositories?${params.toString()}`,
        );

        if (!data.success) {
          throw new Error(data.error);
        }

        return data;
      },
      enabled: !!integration?.installationId && isOwner,
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
            repoPath: "",
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
        router.refresh();
      },
      onError: (error) => {
        toast.error(replaceOrganizationWithWorkspace(error.message));
      },
    });

  const repositories = repositoriesData?.data || [];

  const handleConnect = () => {
    if (!activeOrganization?.id) return;

    const githubAppName = (env as any).NEXT_PUBLIC_GITHUB_APP_NAME;
    if (!githubAppName) {
      alert("GitHub App name is not configured");
      return;
    }

    setIsConnecting(true);
    const state = activeOrganization.slug;
    const githubInstallUrl = `https://github.com/apps/${githubAppName}/installations/new?state=${state}`;

    window.location.href = githubInstallUrl;
  };

  if (integration && !activeOrganization?.repoUrl) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex gap-2 flex-col">
          <h2 className="text-lg font-bold">GitHub Integration</h2>
          <p className="text-sm text-muted-foreground">
            Connect your Workspace to a GitHub repository
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
          <div className="divide-y border">
            {isLoadingRepositories ? (
              <ReposLoadingUI count={10} />
            ) : repositories.length > 0 ? (
              repositories.map((repository: any) => {
                console.log(repository.private);
                return (
                  <div
                    key={repository.id}
                    className="p-2 hover:bg-sidebar cursor-pointer flex items-center justify-between"
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
              <div className="text-sm text-muted-foreground">
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

  if (!isOwner && activeOrganization?.repoUrl) {
    return (
      <div className="border p-4 flex items-center justify-between gap-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="size-10 border bg-sidebar flex items-center justify-center rounded-md">
            <Icons.github className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">GitHub Integration</h2>
            <p className="text-sm text-muted-foreground">
              Only organization owners can connect GitHub App
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isOwner && !integration)
    return (
      <div className="border p-4 flex items-center justify-between gap-4 rounded-lg">
        <div className="flex items-center gap-4">
          <div className="size-10 border bg-sidebar flex items-center justify-center rounded-md">
            <Icons.github className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">GitHub Integration</h2>
            <p className="text-sm text-muted-foreground">
              Connect your GitHub account to your workspace
            </p>
          </div>
        </div>
        <Button onClick={handleConnect} disabled={isConnecting}>
          {isConnecting ? "Connecting..." : "Connect"}
        </Button>
      </div>
    );

  const isGitHubConnected = activeOrganization?.repoProvider !== "gitlab";

  if (!isGitHubConnected) return null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 flex-col">
        <h2 className="text-lg font-bold">GitHub Integration</h2>
        <p className="text-sm text-muted-foreground">
          You are connected to a GitHub repository
        </p>
      </div>
      <div className="border p-4 flex items-center gap-2 justify-between">
        <div className="flex items-center gap-2">
          <div className="size-10 flex item-center justify-center">
            <Icons.github className="size-8" />
          </div>
          <div>
            <Link
              href={`https://github.com/${activeOrganization?.repoUrl}`}
              className="flex items-center gap-2 group"
              target="_blank"
            >
              {activeOrganization?.repoUrl}{" "}
              <ExternalLink className="size-3 group-hover:text-primary text-muted-foreground" />
            </Link>
            <p className="text-sm text-muted-foreground">
              {activeOrganization?.repoPath}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => connectRepository("")}
          >
            Disconnect
          </Button>
          <Button
            size="icon"
            variant="outline"
            onClick={() => onOpen("github-config")}
          >
            <Cog className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
