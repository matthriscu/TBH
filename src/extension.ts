// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TextEncoder } from 'util';

const { Configuration, OpenAIApi } = require("openai");

let diffTxt: string | undefined;
let dstUri: vscode.Uri | undefined;
let fileName: vscode.Uri | undefined;
let loadingButton: vscode.StatusBarItem | undefined;
let actionButton: vscode.StatusBarItem | undefined;

async function closeDiff() {
    await vscode.workspace.openTextDocument(dstUri!);
    await vscode.window.showTextDocument(dstUri!);
	await vscode.workspace.fs.readFile(dstUri!)
        .then(sourceData => vscode.workspace.fs.writeFile(fileName!, sourceData!));
	await vscode.workspace.fs.delete(dstUri!);
};

async function writeToFile(fileName: vscode.Uri, content: string) {
    await vscode.workspace.fs.writeFile(fileName, new TextEncoder().encode(content));
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
            console.log("No openai");
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

async function addComments(caller: GptCaller, code: string, language: string): Promise<string> {
    const res = await caller.askChatGPT(code +
        "\nAdd comments to the above " +
        language +
        " code. Add only comments. Your response should be a " +
        language +
        " markdown code block.");
    const regex = /```([\s\S]*?)```/g;
    const markdownCode = res.match(regex);
    if (!markdownCode) {
        console.log("No response from ChatGPT");
    }

    return markdownCode;
}

async function findBugs(caller: GptCaller, code: string, language: string): Promise<string> {
    return caller.askChatGPT(code +
        "\nFind bugs, if any, in the above " +
        language +
        " code. Answer very briefly. Answer as a numbered list.");
}

async function findComplexity(caller: GptCaller, code: string, language: string): Promise<string> {
    return caller.askChatGPT(code +
        "\nTell me the temporal and spatial complexity of the above " +
        language +
        " code. Answer very briefly.");
}

async function optimize(caller: GptCaller, code: string, language: string): Promise<string> {
    return caller.askChatGPT(code +
        "Optimize the above " +
        language +
        "code. Write only code, succintly. Answer as a " +
        language +
        " markdown code block.");
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("ChatGPT Analyzer extension activated");

    if (loadingButton === undefined) {
		loadingButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
	}
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

    let commentsDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.addComments', async () => {
        loadingButton!.text = "";

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
            const language = vscode.window.activeTextEditor?.document.languageId!;

            console.log("Detected language: " + language);

            let fixCode: string = await addComments(caller, document.getText(selection), language);
            fixCode = fixCode.toString().replaceAll("`", "");
            fixCode = fixCode.toString().replace(language, "");

            const filePath = path.join(path.dirname(document.uri.path), (Math.random().toString(36).slice(2) + "." + language));
            dstUri = vscode.Uri.file(filePath);
            diffTxt = document.getText().replace(document.getText(selection).toString(), fixCode);
            fileName = document.uri;

            actionButton!.text = '$(pencil) Replace Selection';
            actionButton!.show();

            await writeToFile(dstUri!, diffTxt);
            dstUri = vscode.Uri.file(filePath);
            vscode.commands.executeCommand("vscode.diff", fileName, dstUri, 'DIFF');
        }
    });

    let bugsDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.findBugs', async () => {
        actionButton!.text = "";
        loadingButton!.text = "$(loading) Generating output";
		loadingButton!.show();

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

            console.log("Detected language: " + language);

            let fixCode: string = await findBugs(caller, document.getText(selection), language);
            loadingButton!.text = "$(check) Output generated";

            const channel = vscode.window.createOutputChannel("Bug Analysis");
            channel.append(fixCode);
            channel.show();
        }
    });

    let complexityDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.findComplexity', async () => {
        actionButton!.text = "";
        loadingButton!.text = "$(loading) Generating output";
		loadingButton!.show();

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

            console.log("Detected language: " + language);

            let fixCode: string = await findComplexity(caller, document.getText(selection), language);
            loadingButton!.text = "$(check) Output generated";

            const channel = vscode.window.createOutputChannel("Complexity Analysis");
            channel.append(fixCode);
            channel.show();
        }
    });

    let optimizationDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.optimize', async () => {
        loadingButton!.text = "";

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
                progress.report({ increment: 20, message: "Ask to optimize code..." });
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

        let editor = vscode.window.activeTextEditor;
        if (editor) {
            const caller = new GptCaller(apiKey);
            const document = editor.document;
            const selection = editor.selection;
            const language = vscode.window.activeTextEditor?.document.languageId!;

            console.log("Detected language: " + language);

            let fixCode: string = await addComments(caller, document.getText(selection), language);
            fixCode = fixCode.toString().replaceAll("`", "");
            fixCode = fixCode.toString().replace(language, "");

            const filePath = path.join(path.dirname(document.uri.path), (Math.random().toString(36).slice(2) + "." + language));
            dstUri = vscode.Uri.file(filePath);
            diffTxt = document.getText().replace(document.getText(selection).toString(), fixCode);
            fileName = document.uri;

            actionButton!.text = '$(pencil) Replace Selection';
            actionButton!.show();

            await writeToFile(dstUri!, diffTxt);
            dstUri = vscode.Uri.file(filePath);
            vscode.commands.executeCommand("vscode.diff", fileName, dstUri, 'DIFF');

            let tmpDoc = (await (vscode.workspace.openTextDocument(filePath)));
			await vscode.window.showTextDocument(tmpDoc);
			
			let indexStart: number = diffTxt.indexOf(fixCode);
			let indexEnd: number = indexStart + fixCode.length;

			editor = vscode.window.activeTextEditor;
			editor!.selection = new vscode.Selection(tmpDoc.positionAt(indexStart), tmpDoc.positionAt(indexEnd));
			await vscode.commands.executeCommand('editor.action.formatSelection');
			await tmpDoc.save();
			dstUri = vscode.Uri.file(filePath);
			vscode.commands.executeCommand("vscode.diff", fileName, dstUri, 'DIFF');
	
        }
    });

    context.subscriptions.push(commentsDisposable);
    context.subscriptions.push(bugsDisposable);
    context.subscriptions.push(complexityDisposable);
    context.subscriptions.push(optimizationDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log("Extension deactivated");
}
