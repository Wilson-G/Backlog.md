import React, { useState, useEffect, useRef, memo } from "react";
import { useTranslation } from "react-i18next";
import { apiClient } from "../lib/api";

interface Project {
	name: string;
	path: string;
	active: boolean;
}

interface ProjectSwitcherProps {
	onProjectSwitch: () => Promise<void>;
	isCollapsed: boolean;
}

const ProjectSwitcher = memo(function ProjectSwitcher({
	onProjectSwitch,
	isCollapsed,
}: ProjectSwitcherProps) {
	const { t } = useTranslation();
	const [projects, setProjects] = useState<Project[]>([]);
	const [isOpen, setIsOpen] = useState(false);
	const [isSwitching, setIsSwitching] = useState(false);
	const dropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		apiClient.fetchProjects().then(setProjects).catch(() => {});
	}, []);

	useEffect(() => {
		const handleClick = (e: MouseEvent) => {
			if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, []);

	const activeProject = projects.find((p) => p.active);
	const otherProjects = projects.filter((p) => !p.active);

	if (projects.length <= 1) return null;

	const handleSwitch = async (path: string) => {
		setIsSwitching(true);
		try {
			await apiClient.switchProject(path);
			setIsOpen(false);
			await onProjectSwitch();
			const updated = await apiClient.fetchProjects();
			setProjects(updated);
		} catch (error) {
			console.error("Failed to switch project:", error);
		} finally {
			setIsSwitching(false);
		}
	};

	const getInitials = (name: string) => {
		return name
			.split(/[\s-_]+/)
			.map((w) => w[0])
			.filter(Boolean)
			.slice(0, 2)
			.join("")
			.toUpperCase();
	};

	if (isCollapsed) {
		return (
			<div ref={dropdownRef} className="relative px-2 py-2 border-b border-gray-200 dark:border-gray-700">
				<button
					onClick={() => setIsOpen(!isOpen)}
					className="flex items-center justify-center w-full p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors duration-200"
					title={activeProject?.name || t("projects.switchProject")}
				>
					<span className="text-xs font-bold">{activeProject ? getInitials(activeProject.name) : "?"}</span>
				</button>
				{isOpen && (
					<div className="absolute left-full top-0 ml-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
						{otherProjects.map((project) => (
							<button
								key={project.path}
								onClick={() => handleSwitch(project.path)}
								disabled={isSwitching}
								className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
							>
								<span className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
									{getInitials(project.name)}
								</span>
								<span className="truncate">{project.name}</span>
							</button>
						))}
					</div>
				)}
			</div>
		);
	}

	return (
		<div ref={dropdownRef} className="relative px-4 py-3 border-b border-gray-200 dark:border-gray-700">
			<button
				onClick={() => setIsOpen(!isOpen)}
				className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200"
			>
				<span className="flex-shrink-0 w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-sm font-bold text-blue-600 dark:text-blue-400">
					{activeProject ? getInitials(activeProject.name) : "?"}
				</span>
				<div className="flex-1 min-w-0 text-left">
					<div className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
						{activeProject?.name || t("projects.switchProject")}
					</div>
					<div className="text-xs text-gray-500 dark:text-gray-400 truncate">
						{otherProjects.length} {t("projects.otherProjects")}
					</div>
				</div>
				<svg
					className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
				</svg>
			</button>
			{isOpen && (
				<div className="absolute left-4 right-4 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 py-1">
					{otherProjects.map((project) => (
						<button
							key={project.path}
							onClick={() => handleSwitch(project.path)}
							disabled={isSwitching}
							className="flex items-center gap-3 w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-200 disabled:opacity-50"
						>
							<span className="flex-shrink-0 w-7 h-7 rounded-md bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300">
								{getInitials(project.name)}
							</span>
							<div className="flex-1 min-w-0 text-left">
								<div className="truncate font-medium">{project.name}</div>
								<div className="truncate text-xs text-gray-400 dark:text-gray-500">
									{project.path.replace(/^\/Users\/\w+\//, "~/")}
								</div>
							</div>
						</button>
					))}
				</div>
			)}
		</div>
	);
});

export default ProjectSwitcher;
