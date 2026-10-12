import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { MarkdownImage } from "../markdown.image";
import { ThreadMessage } from "@/lib/repositories/types/thread.message.types";

const markdownComponents = {
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <MarkdownImage src={(props.src as string) || ""} alt={props.alt || ""} />
  ),
};

interface ChatMessageClusterProps {
  cluster: {
    role: string;
    messages: ThreadMessage[];
  };
}

export function ChatMessageCluster({ cluster }: ChatMessageClusterProps) {
  return (
    <div
      className="flex flex-col mb-6"
      style={{ gap: cluster.role === "user" ? "4px" : "16px" }}
    >
      {cluster.messages.map((message, indexInCluster) => {
        const groupedWithPrevious = indexInCluster > 0;
        const groupedWithNext = indexInCluster < cluster.messages.length - 1;

        return (
          <div
            key={message.id}
            className={`flex ${message.role === "user" ? "justify-end" : ""}`}
          >
            {message.role === "assistant" ? (
              <div className="py-0.5 text-[15px] leading-normal text-zinc-200 max-w-full font-gothic prose prose-invert prose-p:my-1 prose-p:leading-relaxed prose-headings:my-1.5 prose-headings:font-semibold prose-h1:text-lg prose-h2:text-base prose-h3:text-[15px] prose-h3:mt-2 prose-h3:mb-1 prose-h4:text-[15px] prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-li:p-0 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 prose-hr:my-3 prose-hr:border-zinc-800/50 prose-pre:border-none prose-pre:bg-zinc-800/30 prose-code:border-none prose-code:bg-transparent prose-img:m-0 prose-img:border-none prose-table:border-none border-none">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {message.content as string}
                </ReactMarkdown>
              </div>
            ) : (
              <div className="relative group max-w-[75%]">
                <div
                  className="bg-[#e4e4e4] text-zinc-900 px-5 py-2.5 text-[15px] font-gothic break-words"
                  style={{
                    borderTopLeftRadius: "24px",
                    borderBottomLeftRadius: "24px",
                    borderTopRightRadius: groupedWithPrevious ? "4px" : "24px",
                    borderBottomRightRadius: groupedWithNext ? "4px" : "24px",
                  }}
                >
                  {message.content as string}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
