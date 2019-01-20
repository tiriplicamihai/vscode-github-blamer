// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";
import * as parseGitConfig from "parse-git-config";

interface CommandArgs {
	fsPath: string;
}

enum GitHubViewType {
	BLOB = "blob",
	BLAME = "blame",
}

function getRepoPath(splitPath: string[]): (string|null) {
	if (splitPath.length === 0) {
		return null;
	}
	const repoPath = splitPath.join(path.sep);
	const dotGitPath = repoPath + path.sep + ".git";
	if (fs.existsSync(dotGitPath)) {
		return repoPath;
	}
	
	return getRepoPath(splitPath.slice(0, -1));
}

function getRepoUrl(repoPath: string): (string|null) {
	const dotGitPath = repoPath + path.sep + ".git";
	const config = parseGitConfig.sync({"path": dotGitPath + path.sep + "config"});
	const origin = config['remote "origin"'];
	if (!origin) {
		return null;
	}

	const originURL: string = origin["url"];
	if (!originURL) {
		return null;
	}

	const urlParts = originURL.split('@')[1].split(':');

	return "https://" + urlParts[0] + "/" + urlParts[1].replace(".git", "");
}

function getCurrentBranch(fsPath: string): (string | null) {
	const repoPath = getRepoPath(fsPath.split(path.sep));
	if (!repoPath) {
		return null;
	} 
	const headFilePath = repoPath + path.sep + ".git" + path.sep + "HEAD";
	if (!fs.existsSync(headFilePath)) {
		return null;
	}

	const buffer = fs.readFileSync(headFilePath).toString();

	return buffer.replace("ref: refs/heads/", "");
}

function getGithubURL(fsPath: string, viewType: GitHubViewType, branch: string): (string | null) {
	const repoPath = getRepoPath(fsPath.split(path.sep));
	if (!repoPath) {
		return null;
	} 
	
	const repoURL = getRepoUrl(repoPath);
	if (!repoURL) {
		return null;
	}

	const activeEditor = vscode.window.activeTextEditor;
	let line = 1;
    if (activeEditor) {
		// In VSCode lines count starts from 0;
		line = activeEditor.selection.active.line + 1;
	}
	const rootRepoRelativePath = fsPath.replace(repoPath, "").replace(path.sep, "/");
	return repoURL + "/" + viewType +  "/" + branch + "/" + rootRepoRelativePath + "#L" + line;
}

function openGithubLink(fsPath: string, viewType: GitHubViewType, branch: string) {
	const url = getGithubURL(fsPath, viewType, branch);
	if (!url) {
		return;
	} 

	vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(url));
}

function copyGithubLink(fsPath: string, viewType: GitHubViewType, branch: string) {
	const url = getGithubURL(fsPath, viewType, branch);
	if (!url) {
		return;
	} 

	vscode.env.clipboard.writeText(url);
}

function copyGitHubMaster(args: CommandArgs) {
	copyGithubLink(args.fsPath, GitHubViewType.BLOB, "master");
}

function copyGitHubBlameMaster(args: CommandArgs) {
	copyGithubLink(args.fsPath, GitHubViewType.BLAME, "master");
}

function openBlameInGitHubMaster(args: CommandArgs) {
	openGithubLink(args.fsPath, GitHubViewType.BLAME, "master");
}

function openInGitHubMaster(args: CommandArgs) {
	openGithubLink(args.fsPath, GitHubViewType.BLOB, "master");
}

function openInGitHub(args: CommandArgs) {
	const branch = getCurrentBranch(args.fsPath);
	if (!branch) {
		return;
	}
	openGithubLink(args.fsPath, GitHubViewType.BLOB, branch);
}

function openBlameInGitHub(args: CommandArgs) {
	const branch = getCurrentBranch(args.fsPath);
	if (!branch) {
		return;
	}
	openGithubLink(args.fsPath, GitHubViewType.BLAME, branch);
}

function copyGitHub(args: CommandArgs) {
	const branch = getCurrentBranch(args.fsPath);
	if (!branch) {
		return;
	}

	copyGithubLink(args.fsPath, GitHubViewType.BLOB, branch);
}

function copyGitHubBlame(args: CommandArgs) {
	const branch = getCurrentBranch(args.fsPath);
	if (!branch) {
		return;
	}

	copyGithubLink(args.fsPath, GitHubViewType.BLAME, branch);
}


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(vscode.commands.registerCommand("extension.copyGitHubMaster", copyGitHubMaster));
	context.subscriptions.push(vscode.commands.registerCommand("extension.copyGitHubBlameMaster", copyGitHubBlameMaster));
	context.subscriptions.push(vscode.commands.registerCommand("extension.openInGitHubMaster", openInGitHubMaster));
	context.subscriptions.push(vscode.commands.registerCommand("extension.openBlameInGitHubMaster", openBlameInGitHubMaster));

	context.subscriptions.push(vscode.commands.registerCommand("extension.copyGitHub", copyGitHub));
	context.subscriptions.push(vscode.commands.registerCommand("extension.copyGitHubBlame", copyGitHubBlame));
	context.subscriptions.push(vscode.commands.registerCommand("extension.openInGitHub", openInGitHub));
	context.subscriptions.push(vscode.commands.registerCommand("extension.openBlameInGitHub", openBlameInGitHub));
}

exports.activate = activate;

