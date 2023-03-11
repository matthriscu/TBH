// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TextEncoder } from 'util';

const { Configuration, OpenAIApi } = require("openai");

let diffTxt: string | undefined;
let dstUri : vscode.Uri | undefined;
let fileName: vscode.Uri | undefined;


async function close_opened_diffs() {
	vscode.workspace.fs.delete(dstUri!);
};

async function write_file(fileName : vscode.Uri, content: string) {
	
	vscode.workspace.fs.writeFile(fileName, new TextEncoder().encode(content)).then(() => {
		vscode.window.showInformationMessage(`File created: ${fileName}`);
	}, (err) => {
		vscode.window.showErrorMessage(`Failed to create file: ${err.message}`);
	});
}

let fibo =
	"int sum(int n, int n) {\n" +
	"v = 0\n" +
	"int s = 0;\n" +
	"for (int i = 0; i < n; i++) {\n" +
	"s += v[i];\n" +
	"}\n" +
	"return s\n" +
	"}\n"

class GptCaller {
	openai: typeof OpenAIApi;
	messages: any[] = []

	constructor(apiKey: String) {
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

		if (this.openai == null || this.openai == undefined) {
			return "";
		}

		const completion = await this.openai.createChatCompletion({
			model: "gpt-3.5-turbo",
			messages: this.messages
		});

		const res = completion.data.choices[0].message

		// console.log(res.content)


		this.messages.push(res);
		return res.content
	}
}

async function find_bugs(caller: GptCaller, code: string, language: string): Promise<string> {
	return caller.askChatGPT("Could you find the bugs in the function " + code + "which is written in " + language + " without writing the correct code");
}

async function optimize(caller: GptCaller, code: string): Promise<string> {
	return caller.askChatGPT("Could you optimize the code?");
}

async function add_comments(caller: GptCaller, code: string, language: string): Promise<string> {
	const res = await caller.askChatGPT("Could you add proper comments to the corrected code above? And also add types to parameters")
	const regex = /```([\s\S]*?)```/g
	const markdown_code = res.match(regex)
	return markdown_code
}

async function find_complexity(caller: GptCaller, code: string): Promise<string> {
	return caller.askChatGPT("Could you tell the time and space complexity of the code above?")
}

async function check_code(caller: GptCaller, code : string, language : string) {

	let response1 = await find_bugs(caller, code, language);

	for (let i = 0; i < 1; ++i) {
		response1 = await add_comments(caller, response1, language);
	}

	const response2 = await add_comments(caller, response1, language);
	// const response3 = await find_complexity(caller, response2)
	return response2;
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	const button = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    button.text = '$(pencil) Replace Selection';
    button.tooltip = 'Replace the selected text in the active editor';
    button.command = 'extension.replaceSelection';

    button.show();

    vscode.commands.registerCommand('extension.replaceSelection', () => {
    const editor = vscode.window.activeTextEditor;

    if (editor) {

        // vscode.commands.executeCommand('workbench.action.closeActiveEditor', { force: true });

        // editor.edit((editBuilder) => {
        //     editBuilder.replace(editor.selection, text);
        // });
		write_file(fileName!, diffTxt!);
		close_opened_diffs();

        // vscode.window.visibleTextEditors.forEach(editor => {
        //   console.log(editor.document.uri.toString());
        //     if (editor.document.uri.toString() === editorDocUri) {
        //       console.log("aici2");
        //       editor.edit(editBuilder => {
        //         editBuilder.replace(editor.selection, text);
        //       });
        //     }
        //   });
    }
    });

	let disposable = vscode.commands.registerCommand('chatgpt-code-analyzer.helloWorld', async () => {
	
		let apiKey: string = vscode.workspace.getConfiguration().get("chat-gpt")!;
		if (apiKey === "") {
			console.log("You need to provide an API Key");
		}

		const editor = vscode.window.activeTextEditor;
    	if (editor) {
			const caller = new GptCaller(apiKey);
			const document = editor.document;
			const selection = editor.selection;
			const language = vscode.window.activeTextEditor?.document.languageId!;
			console.log(language);

			let fixCode : string = await check_code(caller, document.getText(selection), language);
			fixCode = fixCode.toString().replaceAll("`", "");
			fixCode = fixCode.toString().replace(language, "");

			const textDocumentShowOptions: vscode.TextDocumentShowOptions = {
				preview: true,
			};

			dstUri = vscode.Uri.file(path.join(path.dirname(document.uri.path), "tmp.txt"));
			diffTxt = document.getText().replace(document.getText(selection).toString(), fixCode);
			fileName = document.uri;

			await write_file(dstUri, diffTxt);
            await vscode.commands.executeCommand("vscode.diff", document.uri, dstUri, 'DIFF'); 	
        }
	});
    
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Goodbye");
}
