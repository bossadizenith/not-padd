import { MDXContent } from "notpadd-mdx/react";
import Image from "next/image";
import Link from "next/link";
import { Code } from "./code";
import { DetailedHTMLProps, HTMLAttributes } from "react";

interface Props {
  code: string;
}

type CodeProps = DetailedHTMLProps<
  HTMLAttributes<HTMLPreElement>,
  HTMLPreElement
> & {
  language: string;
  code: string;
};

export default function Mdx({ code }: Props) {
  return (
    <MDXContent
      components={{
        Image: ({ src, alt, width, height }) => (
          <Image src={src} alt={alt} width={width} height={height} />
        ),
        Frame: ({ children }) => (
          <div className="border-border/40 bg-muted/50 my-8 inline-block h-full w-full rounded-lg border p-2 lg:p-3">
            <div className="h-full w-full overflow-hidden rounded-lg">
              {children}
            </div>
          </div>
        ),
        p: ({ children }) => (
          <p className="text-muted-foreground text-base/7">{children}</p>
        ),
        pre: (props) => {
          return <Code code={(props as CodeProps).code} />;
        },
        strong: ({ children, ...props }) => {
          return <b className="text-muted-light font-semibold">{children}</b>;
        },
        code: (props) => {
          return (
            <code className="bg-gray-50 inline-flex border-gray-200 font-mono! rounded border px-1.5 py-0.5">
              {props.children}
            </code>
          );
        },
        a: ({ children, ...props }) => {
          return (
            <Link
              href={props.href ?? "#"}
              className="text-muted-light inline font-medium underline underline-offset-4"
              target={props.href?.startsWith("/") ? undefined : "_blank"}
              rel="noopener noreferrer"
            >
              {children}
            </Link>
          );
        },
        ul: ({ children }) => (
          <ul className="text-muted-foreground list-inside list-disc space-y-2 pl-8">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="text-muted-foreground ml-8 list-decimal space-y-2">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="pl-1 text-base/7 flex items-center gap-2">
            {children}
          </li>
        ),
        h1: ({ children }) => {
          return (
            <h1 className="text-muted-light text-4xl font-medium">
              {children}
            </h1>
          );
        },
        h2: ({ children }) => {
          return (
            <h2 className="text-muted-light text-3xl font-medium">
              {children}
            </h2>
          );
        },
        h3: ({ children }) => {
          return (
            <h3 className="text-muted-light text-2xl font-medium">
              {children}
            </h3>
          );
        },
      }}
      code={code}
    />
  );
}
