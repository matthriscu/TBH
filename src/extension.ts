// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import { TextEncoder } from 'util';

const { Configuration, OpenAIApi } = require("openai");

let editorDocUri: string | undefined;

function write_file(name : string, content: string) {
	const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
	if (!workspaceFolder) {
		vscode.window.showErrorMessage('No workspace folder open.');
		return;
	}

	const fileName = name;
	const fileUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

	vscode.workspace.fs.writeFile(fileUri, new TextEncoder().encode(content)).then(() => {
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
	return response2
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
        const text = 'New text to replace the selection with';

        // vscode.commands.executeCommand('workbench.action.closeActiveEditor', { force: true });

        // editor.edit((editBuilder) => {
        //     editBuilder.replace(editor.selection, text);
        // });

        vscode.window.visibleTextEditors.forEach(editor => {
          console.log(editor.document.uri.toString());
            if (editor.document.uri.toString() === editorDocUri) {
              console.log("aici2");
              editor.edit(editBuilder => {
                editBuilder.replace(editor.selection, text);
              });
            }
          });
    }
    });

	let disposable = vscode.commands.registerCommand('chatgpt-code-analyzer.helloWorld', async () => {
	
		let apiKey: string = vscode.workspace.getConfiguration().get("chat-gpt")!;
		if (apiKey == "") {
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
			console.log("code is" + fixCode);
			fixCode = fixCode.toString().replaceAll("`", "");
			fixCode = fixCode.toString().replace(language, "");

			const textDocumentShowOptions: vscode.TextDocumentShowOptions = {
				preview: true,
			};

            const src = await vscode.workspace.openTextDocument({ content: document.getText()});
            const dst = await vscode.workspace.openTextDocument({ content: document.getText().replace(document.getText(selection).toString(), fixCode)});
            vscode.commands.executeCommand("vscode.diff", src.uri, dst.uri, 'DIFF'); 	
            // editor.edit(editBuilder => {
            //     // editBuilder.replace(selection, func(document, selection));
            //     vscode.commands.executeCommand("vscode.diff", selection, func(document, selection));
            // });
        }
	});
    
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log("Goodbye");
}
