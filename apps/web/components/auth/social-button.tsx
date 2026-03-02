"use client";

import { authClient } from "@notpadd/auth/auth-client";
import { Icons } from "@notpadd/ui/components/icons";
import { LoadingButton } from "@notpadd/ui/components/loading-button";
import { useState } from "react";
import { toast } from "sonner";
import { env } from "@notpadd/env/client";

const SocialButton = () => {
  const [isLoading, setIsLoading] = useState(false);
  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      await authClient.signIn.social({
        provider: "google",
        callbackURL: env.NEXT_PUBLIC_CALLBACK_URL,
      });
    } catch (error) {
      console.error(error);
      toast.error("Failed to sign in with Google");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <LoadingButton
      loading={isLoading}
      onClick={handleGoogleLogin}
      className="px-10"
      disabled={isLoading}
    >
      <Icons.google className="h-4 w-4" />
      Continue with Google
    </LoadingButton>
  );
};

export default SocialButton;
