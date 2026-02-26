import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";

export interface ProjectEntry {
	name: string;
	path: string;
}

const REGISTRY_PATH = join(homedir(), ".backlog", "projects.yml");

export function loadProjectsRegistry(): ProjectEntry[] {
	if (!existsSync(REGISTRY_PATH)) {
		return [];
	}
	try {
		const content = readFileSync(REGISTRY_PATH, "utf-8");
		// Simple YAML parser for our format: "- name: xxx\n  path: yyy"
		const entries: ProjectEntry[] = [];
		const blocks = content.split(/^- /m).filter(Boolean);
		for (const block of blocks) {
			const nameMatch = block.match(/name:\s*(.+)/);
			const pathMatch = block.match(/path:\s*(.+)/);
			if (nameMatch && pathMatch) {
				entries.push({
					name: nameMatch[1]!.trim(),
					path: pathMatch[1]!.trim(),
				});
			}
		}
		return entries;
	} catch {
		return [];
	}
}

export function saveProjectsRegistry(entries: ProjectEntry[]): void {
	const dir = dirname(REGISTRY_PATH);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	const yaml = entries.map((e) => `- name: ${e.name}\n  path: ${e.path}`).join("\n");
	writeFileSync(REGISTRY_PATH, yaml + "\n", "utf-8");
}

export function addProjectToRegistry(entry: ProjectEntry): void {
	const entries = loadProjectsRegistry();
	const existing = entries.findIndex((e) => e.path === entry.path);
	if (existing >= 0) {
		entries[existing] = entry;
	} else {
		entries.push(entry);
	}
	saveProjectsRegistry(entries);
}

export function getRegistryPath(): string {
	return REGISTRY_PATH;
}
