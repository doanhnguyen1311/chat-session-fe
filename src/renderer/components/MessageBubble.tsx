import { Copy, Download, FileText } from "lucide-react";
import { motion } from "framer-motion";
import type { Attachment, Message } from "../types/chat";

type Props = {
  message: Message;
  own: boolean;
  onCopy: (content: string) => void;
};

export function MessageBubble({ message, own, onCopy }: Props): JSX.Element {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(message.createdAt));

  const copyValue = [message.content, ...(message.attachments ?? []).map((item) => item.originalName)].filter(Boolean).join("\n");

  return (
    <motion.article
      className={own ? "message own" : "message"}
      initial={{ opacity: 0, y: 8, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.2, 0.8, 0.2, 1] }}
    >
      <div className="message-meta">
        <span>{message.senderName}</span>
        <time>{time}</time>
        <button className="copy-message" type="button" onClick={() => onCopy(copyValue)} title="Copy message">
          <Copy size={13} />
        </button>
      </div>
      {message.content ? <p>{renderMentions(message.content)}</p> : null}
      {message.attachments?.length ? <AttachmentGrid attachments={message.attachments} /> : null}
    </motion.article>
  );
}

function renderMentions(content: string): Array<string | JSX.Element> {
  return content.split(/(@[\p{L}\p{N}_.-]+)/gu).map((part, index) =>
    part.startsWith("@") ? (
      <strong className="mention-token" key={`${part}-${index}`}>
        {part}
      </strong>
    ) : (
      part
    )
  );
}

function AttachmentGrid({ attachments }: { attachments: Attachment[] }): JSX.Element {
  return (
    <div className="message-attachments">
      {attachments.map((attachment) => (
        <AttachmentPreview attachment={attachment} key={`${attachment.url}-${attachment.name}`} />
      ))}
    </div>
  );
}

function AttachmentPreview({ attachment }: { attachment: Attachment }): JSX.Element {
  const src = attachment.url.startsWith("http")
    ? attachment.url
    : `${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${attachment.url}`;

  if (attachment.type === "image") {
    return <img className="message-image" src={src} alt={attachment.originalName} loading="lazy" />;
  }

  if (attachment.type === "video") {
    return <video className="message-video" src={src} controls preload="metadata" />;
  }

  return (
    <a className="message-file" href={src} target="_blank" rel="noreferrer">
      <FileText size={17} />
      <span>{attachment.originalName}</span>
      <Download size={15} />
    </a>
  );
}
