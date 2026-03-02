"use client";

import { ConfirmationModal } from "./confirmation";
import CreateArticle from "./create-article";
import CreateTags from "./create-tags";
import CreateKey from "./create-key";
import CreateInvite from "./create-invite";
import { GithubConfig } from "./github-config";
import { GitlabConfig } from "./gitlab-config";
import { UploadMediaModal } from "./upload-media";

const Modals = () => {
  return (
    <>
      <CreateArticle />
      <CreateTags />
      <CreateKey />
      <ConfirmationModal />
      <CreateInvite />
      <GithubConfig />
      <GitlabConfig />
      <UploadMediaModal />
    </>
  );
};

export default Modals;
