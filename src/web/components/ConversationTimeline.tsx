import React, { useState, useRef, useEffect, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient, type ConversationEntry } from "../lib/api";
import MermaidMarkdown from "./MermaidMarkdown";

type ExpandLevel = "collapsed" | "content" | "l1" | "l2";

interface TimelineEntryProps {
	entry: ConversationEntry;
	theme: string;
}

function formatRelativeTime(isoTimestamp: string): string {
	const date = new Date(isoTimestamp);
	if (Number.isNaN(date.getTime())) return isoTimestamp;
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);

	if (diffMin < 1) return "刚刚";
	if (diffMin < 60) return `${diffMin}分钟前`;
	const diffHr = Math.floor(diffMin / 60);
	if (diffHr < 24) return `${diffHr}小时前`;

	const pad = (n: number) => String(n).padStart(2, "0");
	const isThisYear = date.getFullYear() === now.getFullYear();
	const dateStr = isThisYear
		? `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
		: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
	return `${dateStr} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const TimelineEntry = memo(function TimelineEntry({ entry, theme }: TimelineEntryProps) {
	const { t } = useTranslation();
	const [expandLevel, setExpandLevel] = useState<ExpandLevel>("collapsed");
	const [vikingContent, setVikingContent] = useState<string | null>(null);
	const [vikingLoading, setVikingLoading] = useState(false);

	const isUser = entry.role === "user";

	const handleExpand = useCallback(async () => {
		if (expandLevel === "collapsed") {
			setExpandLevel("content");
			return;
		}
		if (expandLevel === "content" && entry.vikingUri) {
			setVikingLoading(true);
			try {
				const result = await apiClient.vikingContent(entry.vikingUri, "overview");
				if (!result.error) {
					setVikingContent(result.output);
					setExpandLevel("l1");
				}
			} catch { /* ignore */ }
			setVikingLoading(false);
			return;
		}
		if (expandLevel === "l1" && entry.vikingUri) {
			setVikingLoading(true);
			try {
				const result = await apiClient.vikingContent(entry.vikingUri, "read");
				if (!result.error) {
					setVikingContent(result.output);
					setExpandLevel("l2");
				}
			} catch { /* ignore */ }
			setVikingLoading(false);
			return;
		}
		setExpandLevel("collapsed");
	}, [expandLevel, entry.vikingUri]);

	const handleCollapse = useCallback(() => {
		setExpandLevel("collapsed");
		setVikingContent(null);
	}, []);

	const levelLabel = expandLevel === "l1" ? "L1" : expandLevel === "l2" ? "L2" : null;
	const canExpandMore = expandLevel !== "l2" && (expandLevel === "collapsed" || entry.vikingUri);

	return (
		<div className="group relative pl-8 pb-4">
			{/* Timeline dot */}
			<div
				className={`absolute left-0 top-1 w-7 h-7 rounded-full flex items-center justify-center text-xs
					${isUser
						? "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400"
						: "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400"
					}`}
			>
				{isUser ? "👤" : "🤖"}
			</div>
			{/* Timeline line */}
			<div className="absolute left-[13px] top-8 bottom-0 w-px bg-gray-200 dark:bg-gray-700 group-last:hidden" />

			{/* Header */}
			<div className="flex items-center gap-2 mb-1">
				<span
					className={`text-xs font-semibold ${
						isUser ? "text-blue-600 dark:text-blue-400" : "text-emerald-600 dark:text-emerald-400"
					}`}
				>
					@{entry.role}
				</span>
				<span className="text-xs text-gray-400 dark:text-gray-500">
					{formatRelativeTime(entry.timestamp)}
				</span>
				{levelLabel && (
					<span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded">
						{levelLabel}
					</span>
				)}
			</div>

			{/* Preview (L0) */}
			<div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
				{entry.preview}
			</div>

			{/* Expanded content */}
			{expandLevel !== "collapsed" && (
				<div className="mt-2 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 p-3">
					<div
						className="prose prose-sm !max-w-none dark:prose-invert wmde-markdown"
						data-color-mode={theme}
					>
						<MermaidMarkdown
							source={vikingContent || entry.content}
						/>
					</div>
				</div>
			)}

			{/* Action buttons */}
			<div className="mt-1.5 flex items-center gap-2">
				{canExpandMore && (
					<button
						type="button"
						onClick={handleExpand}
						disabled={vikingLoading}
						className="text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
					>
						{vikingLoading
							? t("conversation.loading")
							: expandLevel === "collapsed"
								? t("conversation.expand")
								: entry.vikingUri
									? t("conversation.expandMore")
									: null}
					</button>
				)}
				{expandLevel !== "collapsed" && (
					<button
						type="button"
						onClick={handleCollapse}
						className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
					>
						{t("conversation.collapse")}
					</button>
				)}
			</div>
		</div>
	);
});

interface ConversationTimelineProps {
	taskId: string;
	theme: string;
	readOnly?: boolean;
}

const ConversationTimeline = memo(function ConversationTimeline({
	taskId,
	theme,
	readOnly = false,
}: ConversationTimelineProps) {
	const { t } = useTranslation();
	const [entries, setEntries] = useState<ConversationEntry[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [inputValue, setInputValue] = useState("");
	const [sending, setSending] = useState(false);
	const bottomRef = useRef<HTMLDivElement>(null);

	const loadConversations = useCallback(async () => {
		try {
			const data = await apiClient.fetchConversations(taskId);
			setEntries(data);
			setError(null);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, [taskId]);

	useEffect(() => {
		loadConversations();
	}, [loadConversations]);

	useEffect(() => {
		if (entries.length > 0) {
			bottomRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [entries.length]);

	const handleSend = useCallback(async () => {
		const trimmed = inputValue.trim();
		if (!trimmed || sending) return;

		setSending(true);
		try {
			const newEntry = await apiClient.addConversation(taskId, "user", trimmed);
			setEntries((prev) => [...prev, newEntry]);
			setInputValue("");
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to send");
		} finally {
			setSending(false);
		}
	}, [inputValue, sending, taskId]);

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
				e.preventDefault();
				handleSend();
			}
		},
		[handleSend],
	);

	if (loading) {
		return (
			<div className="flex items-center justify-center h-[300px]">
				<div className="flex items-center gap-2 text-sm text-gray-400">
					<svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
						<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
						<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
					{t("conversation.loading")}
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col h-[400px]">
			{/* Timeline area */}
			<div className="flex-1 overflow-y-auto px-3 py-4">
				{error && (
					<div className="mb-3 p-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
						{error}
					</div>
				)}

				{entries.length === 0 && !error && (
					<div className="flex items-center justify-center h-full">
						<p className="text-sm text-gray-400 dark:text-gray-500">
							{t("conversation.emptyState")}
						</p>
					</div>
				)}

				{entries.map((entry) => (
					<TimelineEntry key={entry.id} entry={entry} theme={theme} />
				))}
				<div ref={bottomRef} />
			</div>

			{/* Input area */}
			{!readOnly && (
				<div className="border-t border-gray-200 dark:border-gray-700 p-3">
					<div className="flex gap-2">
						<textarea
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							onKeyDown={handleKeyDown}
							placeholder={t("conversation.inputPlaceholder")}
							rows={2}
							className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent resize-none"
						/>
						<button
							type="button"
							onClick={handleSend}
							disabled={!inputValue.trim() || sending}
							className="self-end px-4 py-2 bg-blue-500 dark:bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-600 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
						>
							{sending ? t("conversation.sending") : t("conversation.send")}
						</button>
					</div>
					<p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
						{t("conversation.sendHint")}
					</p>
				</div>
			)}
		</div>
	);
});

export default ConversationTimeline;
