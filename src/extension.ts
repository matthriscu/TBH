// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TextEncoder } from 'util';

const { Configuration, OpenAIApi } = require("openai");

let diffTxt: string | undefined;
let dstUri: vscode.Uri | undefined;
let fileName: vscode.Uri | undefined;
let actionButton: vscode.StatusBarItem | undefined;

async function closeDiff() {
	await vscode.workspace.fs.copy(fileName!, dstUri!, { overwrite: true });
	await vscode.workspace.fs.delete(dstUri!);
};

async function writeToFile(fileName: vscode.Uri, content: string) {
	await vscode.workspace.fs.writeFile(fileName, new TextEncoder().encode(content)).then(() => {
		vscode.window.showInformationMessage(`File created: ${fileName}`);
	}, (err) => {
		vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
	});
}

class GptCaller {
	openai: typeof OpenAIApi;
	messages: any[] = [];

	constructor(apiKey: string) {
		const configuration = new Configuration({
			apiKey: apiKey,
		});
		const openai = new OpenAIApi(configuration);
		this.openai = openai;
	}

	async askChatGPT(requestText: string) {
		this.messages.push({
			role: "user",
			content: requestText
		});

		if (this.openai === null || this.openai === undefined) {
			return "";
		}

		const completion = await this.openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: this.messages
		});
		const res = completion.data.choices[0].message;
		this.messages.push(res);

		return res.content;
	}
}

async function findBugs(caller: GptCaller, code: string, language: string): Promise<string> {
	return caller.askChatGPT("Could you find the bugs in the function " +
		code +
		"which is written in " +
		language +
		" without writing the correct code");
}

async function optimize(caller: GptCaller, code: string): Promise<string> {
	return caller.askChatGPT("Could you optimize the code?");
}

async function addComments(caller: GptCaller, code: string, language: string): Promise<string> {
	const res = await caller.askChatGPT("Could you add proper comments to the corrected code above? It's written in" + language + "Don't change signature of the function and do not add extra comments for external parameters. Do not add any additional information outside the function. Do not delete constructors. Do not add imports or any additional requirements. Use a well known standard and keep it consistent. Do keep the same number of spaces ");
	const regex = /```([\s\S]*?)```/g;
	const markdownCode = res.match(regex);
	return markdownCode;
}

async function findComplexity(caller: GptCaller, code: string): Promise<string> {
	return caller.askChatGPT("Could you tell the time and space complexity of the code above?");
}

async function checkCode(caller: GptCaller, code: string, language: string) {
	let response1 = await findBugs(caller, code, language);
	const response2 = await addComments(caller, code, language);
	// const response3 = await find_complexity(caller, response2)

	return response2;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	if (actionButton === undefined) {
		actionButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
		actionButton.tooltip = 'Replace the selected text in the active editor';
		actionButton.command = 'extension.replaceSelection';
	}

	vscode.commands.registerCommand('extension.replaceSelection', () => {
		const editor = vscode.window.activeTextEditor;
		if (editor) {
			writeToFile(fileName!, diffTxt!);
			actionButton!.text = "$(check) Done";
			closeDiff();
		}
	});

	let disposable = vscode.commands.registerCommand('chatgpt-code-analyzer.helloWorld', async () => {
		// Generate loading pop-up
		vscode.window.withProgress({
			location: vscode.ProgressLocation.Notification,
			title: "Connection established",
			cancellable: true
		}, (progress, token) => {
			token.onCancellationRequested(() => {
				console.log("User canceled diff generator");
			});

			progress.report({ increment: 0 });

			setTimeout(() => {
				progress.report({ increment: 20, message: "Chit-chat about weather..." });
			}, 2500);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Ask about health..." });
			}, 5000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Ask to analyze code..." });
			}, 7500);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Pretty please..." });
			}, 10000);

			setTimeout(() => {
				progress.report({ increment: 20, message: "Thanks!" });
			}, 12000);

			const p = new Promise<void>(resolve => {
				setTimeout(() => {
					resolve();
				}, 12500);
			});

			return p;
		});

		actionButton!.text = "";

		let apiKey: string = vscode.workspace.getConfiguration().get("chat-gpt")!;
		if (apiKey === "") {
			console.log("You need to provide an API Key");
		}

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const caller = new GptCaller(apiKey);
			const document = editor.document;
			const selection = editor.selection;
			const language = await vscode.window.activeTextEditor?.document.languageId!;

			// TODO: remove log
			const filePath = path.join(path.dirname(document.uri.path), ("test." + language));

			let fixCode: string = await checkCode(caller, document.getText(selection), language);
			fixCode = fixCode.toString().replaceAll("`", "");
			fixCode = fixCode.toString().replace(language, "");
			console.log(fixCode);

			dstUri = await vscode.Uri.file(filePath);
			diffTxt = document.getText().replace(document.getText(selection).toString(), fixCode);
			fileName = document.uri;

			actionButton!.text = '$(pencil) Replace Selection';
			actionButton!.show();

			await writeToFile(dstUri!, diffTxt);

			let tmpDoc = (await (vscode.workspace.openTextDocument(filePath)));
			await vscode.window.showTextDocument(tmpDoc);
			await vscode.commands.executeCommand('editor.action.formatDocument');
			await tmpDoc.save();

			await vscode.commands.executeCommand("vscode.diff", fileName, dstUri, 'DIFF');
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Goodbye");
}
