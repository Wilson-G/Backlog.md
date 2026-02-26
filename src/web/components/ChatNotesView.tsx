import React, { useState, useRef, useEffect, useMemo, memo } from "react";
import { useTranslation } from "react-i18next";
import MermaidMarkdown from "./MermaidMarkdown";

interface ChatMessage {
	timestamp: string;
	role: "user" | "agent";
	content: string;
}

function parseNotesMessages(notes: string): {
	messages: ChatMessage[];
	preamble: string;
} {
	const headerPattern = /^### \[(\d{4}-\d{2}-\d{2} \d{2}:\d{2})\] @(user|agent)\s*$/;
	const lines = notes.split("\n");
	const messages: ChatMessage[] = [];
	let preamble = "";
	let currentMessage: ChatMessage | null = null;
	let contentLines: string[] = [];

	for (const line of lines) {
		const match = line.match(headerPattern);
		if (match) {
			if (currentMessage) {
				currentMessage.content = contentLines.join("\n").trim();
				messages.push(currentMessage);
				contentLines = [];
			} else {
				preamble = contentLines.join("\n").trim();
				contentLines = [];
			}
			currentMessage = {
				timestamp: match[1]!,
				role: match[2] as "user" | "agent",
				content: "",
			};
		} else {
			contentLines.push(line);
		}
	}

	if (currentMessage) {
		currentMessage.content = contentLines.join("\n").trim();
		messages.push(currentMessage);
	} else {
		preamble = contentLines.join("\n").trim();
	}

	return { messages, preamble };
}

function formatTimestamp(ts: string): string {
	const now = new Date();
	const date = new Date(ts.replace(" ", "T"));
	if (Number.isNaN(date.getTime())) return ts;

	const isToday =
		date.getDate() === now.getDate() &&
		date.getMonth() === now.getMonth() &&
		date.getFullYear() === now.getFullYear();

	if (isToday) {
		return ts.split(" ")[1] || ts;
	}
	return ts;
}

interface MessageBubbleProps {
	message: ChatMessage;
	theme: string;
}

const MessageBubble = memo(function MessageBubble({
	message,
	theme,
}: MessageBubbleProps) {
	const isUser = message.role === "user";

	return (
		<div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
			<div
				className={`max-w-[85%] rounded-2xl px-4 py-3 ${
					isUser
						? "bg-blue-500 dark:bg-blue-600 text-white rounded-br-md"
						: "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-bl-md"
				}`}
			>
				<div className="flex items-center gap-2 mb-1">
					<span
						className={`text-xs font-semibold ${isUser ? "text-blue-100" : "text-gray-500 dark:text-gray-400"}`}
					>
						@{message.role}
					</span>
					<span
						className={`text-xs ${isUser ? "text-blue-200" : "text-gray-400 dark:text-gray-500"}`}
					>
						{formatTimestamp(message.timestamp)}
					</span>
				</div>
				<div
					className={`prose prose-sm !max-w-none ${isUser ? "prose-invert" : ""} wmde-markdown`}
					data-color-mode={theme}
				>
					<MermaidMarkdown source={message.content} />
				</div>
			</div>
		</div>
	);
});

interface ChatNotesViewProps {
	notes: string;
	onNotesChange: (notes: string) => void;
	theme: string;
	readOnly?: boolean;
}

const ChatNotesView = memo(function ChatNotesView({
	notes,
	onNotesChange,
	theme,
	readOnly = false,
}: ChatNotesViewProps) {
	const { t } = useTranslation();
	const [inputValue, setInputValue] = useState("");
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);

	const { messages, preamble } = useMemo(
		() => parseNotesMessages(notes),
		[notes],
	);

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages.length]);

	const handleSend = () => {
		const trimmed = inputValue.trim();
		if (!trimmed) return;

		const now = new Date();
		const pad = (n: number) => String(n).padStart(2, "0");
		const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

		const newMessage = `\n\n### [${timestamp}] @user\n${trimmed}`;
		onNotesChange(notes + newMessage);
		setInputValue("");
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
			e.preventDefault();
			handleSend();
		}
	};

	return (
		<div className="flex flex-col h-[400px]">
			{/* Messages area */}
			<div
				ref={containerRef}
				className="flex-1 overflow-y-auto px-3 py-4 space-y-1"
			>
				{preamble && (
					<div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
						<div
							className="prose prose-sm !max-w-none wmde-markdown"
							data-color-mode={theme}
						>
							<MermaidMarkdown source={preamble} />
						</div>
					</div>
				)}

				{messages.length === 0 && !preamble && (
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-gray-400 dark:text-gray-500">
							{t("chat.emptyState")}
						</p>
					</div>
				)}

				{messages.map((msg, idx) => (
					<MessageBubble
						key={`${msg.timestamp}-${msg.role}-${idx}`}
						message={msg}
						theme={theme}
					/>
				))}
				<div ref={messagesEndRef} />
			</div>

			{/* Input area */}
			{!readOnly && (
				<div className="border-t border-gray-200 dark:border-gray-700 p-3">
					<div className="flex gap-2">
						<textarea
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={t("chat.inputPlaceholder")}
							rows={2}
							className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
						/>
						<button
							type="button"
							onClick={handleSend}
							disabled={!inputValue.trim()}
							className="self-end px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
						>
							{t("chat.send")}
						</button>
					</div>
					<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
						{t("chat.sendHint")}
					</p>
				</div>
			)}
		</div>
	);
});

export default ChatNotesView;
export { parseNotesMessages, type ChatMessage };
