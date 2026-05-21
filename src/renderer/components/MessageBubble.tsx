import { Copy, Download, FileText, Forward, Pin, Reply, RotateCcw } from "lucide-react";
import { motion } from "framer-motion";
import type { Attachment, Message } from "../types/chat";

type Props = {
  message: Message;
  own: boolean;
  currentUserId: string;
  repliedMessage?: Pick<Message, "id" | "senderName" | "content" | "attachments" | "revoked">;
  onCopy: (content: string) => void;
  onReply: (message: Message) => void;
  onReact: (messageId: string, reaction: string) => void;
  onPin: (message: Message) => void;
  onRevoke: (message: Message) => void;
  onForward: (message: Message) => void;
  onImageOpen: (src: string) => void;
  onJumpToMessage: (messageId: string) => void;
  onReactionSummaryOpen: (message: Message) => void;
};

const reactions = [
  ["like", "👍"],
  ["love", "❤️"],
  ["care", "🤗"],
  ["haha", "😂"],
  ["wow", "😮"],
  ["cool", "😎"],
  ["fire", "🔥"],
  ["clap", "👏"],
  ["thinking", "🤔"],
  ["sleepy", "😴"],
  ["sad", "😢"],
  ["angry", "😡"],
  ["cry", "😭"],
  ["sick", "🤢"],
  ["mindblown", "🤯"],
  ["skull", "💀"],
  ["clown", "🤡"],
  ["salute", "🫡"],
  ["party", "🥳"],
  ["broken", "💔"],
  ["kiss", "😘"],
  ["cat", "🐱"],
  ["dog", "🐶"],
  ["banana", "🍌"],
  ["troll", "🗿"],
  ["sus", "📮"],
  ["laughing", "😆"]
] as const;

export function MessageBubble({ message, own, currentUserId, repliedMessage, onCopy, onReply, onReact, onPin, onRevoke, onForward, onImageOpen, onJumpToMessage, onReactionSummaryOpen }: Props): JSX.Element {
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(message.createdAt));

  const copyValue = [message.content, ...(message.attachments ?? []).map((item) => item.originalName)].filter(Boolean).join("\n");
  const myReaction = message.reactions?.[currentUserId];
  const reactionItems = Object.values(message.reactions ?? {});

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
        {message.pinned ? <Pin size={13} /> : null}
        {message.forwardedFromId ? <span>Forwarded</span> : null}
        <button className="copy-message" type="button" onClick={() => onCopy(copyValue)} title="Copy message">
          <Copy size={13} />
        </button>
      </div>
      {message.replyToId ? (
        <button className="reply-preview" type="button" onClick={() => onJumpToMessage(message.replyToId ?? "")}>
          <span>{repliedMessage ? repliedMessage.senderName : "Original message"}</span>
          <strong>{repliedMessage?.revoked ? "Message recalled" : repliedMessage?.content || repliedMessage?.attachments?.[0]?.originalName || "Message not loaded yet"}</strong>
        </button>
      ) : null}
      {message.revoked ? <p className="revoked-message">Message recalled</p> : message.content ? <p>{renderMentions(message.content)}</p> : null}
      {!message.revoked && message.attachments?.length ? <AttachmentGrid attachments={message.attachments} onImageOpen={onImageOpen} /> : null}
      {reactionItems.length ? (
        <button className="reaction-summary" type="button" onClick={() => onReactionSummaryOpen(message)} title="View reactions">
          {reactionItems.map((reaction, index) => <span key={`${reaction}-${index}`}>{reactions.find(([key]) => key === reaction)?.[1]}</span>)}
        </button>
      ) : null}
      <div className="message-actions">
        <button type="button" onClick={() => onReply(message)} title="Reply"><Reply size={13} /></button>
        {reactions.map(([key, icon]) => <button className={myReaction === key ? "active" : ""} type="button" key={key} onClick={() => onReact(message.id, myReaction === key ? "" : key)} title={key}>{icon}</button>)}
        <button type="button" onClick={() => onPin(message)} title="Pin"><Pin size={13} /></button>
        <button type="button" onClick={() => onForward(message)} title="Forward"><Forward size={13} /></button>
        {own && !message.revoked ? <button type="button" onClick={() => onRevoke(message)} title="Recall"><RotateCcw size={13} /></button> : null}
      </div>
      {own && message.reads?.length ? <span className="read-receipts">Seen by {message.reads.map((read) => read.user?.displayName).filter(Boolean).join(", ")}</span> : null}
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

function AttachmentGrid({ attachments, onImageOpen }: { attachments: Attachment[]; onImageOpen: (src: string) => void }): JSX.Element {
  return (
    <div className="message-attachments">
      {attachments.map((attachment) => (
        <AttachmentPreview attachment={attachment} key={`${attachment.url}-${attachment.name}`} onImageOpen={onImageOpen} />
      ))}
    </div>
  );
}

function AttachmentPreview({ attachment, onImageOpen }: { attachment: Attachment; onImageOpen: (src: string) => void }): JSX.Element {
  const src = attachment.url.startsWith("http")
    ? attachment.url
    : `${import.meta.env.VITE_BACKEND_URL ?? "https://apiprivate.delisocial.id.vn"}${attachment.url}`;

  if (attachment.type === "image") {
    return <button className="message-image-button" type="button" onClick={() => onImageOpen(src)}><img className="message-image" src={src} alt={attachment.originalName} loading="lazy" /></button>;
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
