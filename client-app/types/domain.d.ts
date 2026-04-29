export type BindingStatus = "active";

export interface Binding {
  bindingId: string;
  ownerId: string;
  targetId: string;
  status: BindingStatus;
  createdAt: string;
}

export type MessageType = "text";
export type MessageStatus = "sent";

export interface Message {
  messageId: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  type: MessageType;
  text: string;
  /** Reserved for future client-side retry/deduplication. Temporarily unused. */
  clientMessageId?: string;
  sentAt: string;
  status: MessageStatus;
}

export type ConversationId = `dm:${string}:${string}`;
