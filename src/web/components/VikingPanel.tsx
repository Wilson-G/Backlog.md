import React, { useState, useCallback, memo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../lib/api";
import MermaidMarkdown from "./MermaidMarkdown";

interface VikingPanelProps {
	vikingUri?: string;
	theme: string;
}

const VikingPanel = memo(function VikingPanel({ vikingUri, theme }: VikingPanelProps) {
	const { t } = useTranslation();
	const [uri, setUri] = useState(vikingUri || "");
	const [level, setLevel] = useState<"abstract" | "overview" | "read">("abstract");
	const [content, setContent] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isExpanded, setIsExpanded] = useState(false);

	const loadContent = useCallback(async (targetLevel: "abstract" | "overview" | "read") => {
		if (!uri.trim()) return;
		setLoading(true);
		setError(null);
		try {
			const result = await apiClient.vikingContent(uri.trim(), targetLevel);
			if (result.error) {
				setError(result.error);
			} else {
				setContent(result.output);
				setLevel(targetLevel);
			}
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load");
		} finally {
			setLoading(false);
		}
	}, [uri]);

	const levelLabels = {
		abstract: { label: "L0", desc: t("viking.l0Desc") },
		overview: { label: "L1", desc: t("viking.l1Desc") },
		read: { label: "L2", desc: t("viking.l2Desc") },
	};

	return (
		<div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/10">
			<button
				type="button"
				onClick={() => setIsExpanded(!isExpanded)}
				className="flex items-center justify-between w-full px-4 py-3 text-left"
			>
				<div className="flex items-center gap-2">
					<svg
						className="w-4 h-4 text-purple-500"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
						/>
					</svg>
					<span className="text-sm font-medium text-purple-700 dark:text-purple-300">
						{t("viking.panelTitle")}
					</span>
					{content && (
						<span className="px-1.5 py-0.5 text-xs bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 rounded">
							{levelLabels[level].label}
						</span>
					)}
				</div>
				<svg
					className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>

			{isExpanded && (
				<div className="px-4 pb-4 space-y-3">
					{/* URI input */}
					<div className="flex gap-2">
						<input
							type="text"
							value={uri}
							onChange={(e) => setUri(e.target.value)}
							placeholder={t("viking.uriPlaceholder")}
							className="flex-1 px-3 py-1.5 text-sm border border-purple-200 dark:border-purple-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
						/>
						<button
							type="button"
							onClick={() => loadContent("abstract")}
							disabled={loading || !uri.trim()}
							className="px-3 py-1.5 text-xs font-medium bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
						>
							{loading ? t("viking.loading") : t("viking.load")}
						</button>
					</div>

					{/* Level switcher */}
					{content && (
						<div className="flex gap-1">
							{(["abstract", "overview", "read"] as const).map((lvl) => (
								<button
									key={lvl}
									type="button"
									onClick={() => loadContent(lvl)}
									disabled={loading}
									className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
										level === lvl
											? "bg-purple-500 text-white"
											: "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-900/50"
									} disabled:opacity-50`}
								>
									{levelLabels[lvl].label} - {levelLabels[lvl].desc}
								</button>
							))}
						</div>
					)}

					{/* Error */}
					{error && (
						<div className="p-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
							{error}
						</div>
					)}

					{/* Content */}
					{content && (
						<div
							className="prose prose-sm !max-w-none wmde-markdown p-3 bg-white dark:bg-gray-800 rounded-lg border border-purple-100 dark:border-purple-900"
							data-color-mode={theme}
						>
							<MermaidMarkdown source={content} />
						</div>
					)}
				</div>
			)}
		</div>
	);
});

export default VikingPanel;
