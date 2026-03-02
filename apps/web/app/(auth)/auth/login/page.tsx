import SocialButton from "@/components/auth/social-button";
import React from "react";

const Page = () => {
  return (
    <div className="flex flex-col items-center relative bg-background min-h-screen text-foreground justify-center p-20">
      <SocialButton />
    </div>
  );
};

export default Page;
