// The module 'vscode' contains the VS Code extensibility API
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { TextEncoder } from 'util';
import { doesNotThrow } from 'assert';

const { Configuration, OpenAIApi } = require("openai");

let diffTxt: string | undefined;
let dstUri: vscode.Uri | undefined;
let fileName: vscode.Uri | undefined;
let loadingButton: vscode.StatusBarItem | undefined;
let actionButton: vscode.StatusBarItem | undefined;

async function closeDiff() {
    await vscode.workspace.fs.copy(fileName!, dstUri!, { overwrite: true });
    await vscode.workspace.fs.delete(dstUri!);
};

async function writeToFile(fileName: vscode.Uri, content: string) {
    vscode.workspace.fs.writeFile(fileName, new TextEncoder().encode(content)).then(() => {
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
            console.log("No openai");
            return "";
        }

        const completion = await this.openai.createChatCompletion({
            model: "gpt-3.5-turbo",
            messages: this.messages
        });
        const res = completion.data.choices[0].message;
        this.messages.push(res);
        // console.log(res.content);
        // console.log(this.messages[1]);

        return res.content;
    }
}

async function addComments(caller: GptCaller, code: string, language: string): Promise<string> {
	// const res = await caller.askChatGPT("Could you add proper comments to the corrected code above? It's written in" +
    //     language +
    //     "Don't change signature of the function and do not add extra comments for external parameters. Do not add any additional information outside the function. Do not delete constructors. Do not add imports or any additional requirements. Use a well known standard and keep it consistent");
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

async function findComplexity(caller: GptCaller, code: string): Promise<string> {
    return caller.askChatGPT("Could you tell the time and space complexity of the code above?");
}

async function optimize(caller: GptCaller, code: string): Promise<string> {
    return caller.askChatGPT("Could you optimize the code?");
}

async function checkCode(caller: GptCaller, code: string, language: string) {
    const response1 = await addComments(caller, code, language);
    // let response2 = await findBugs(caller, code, language);
    // const response3 = await find_complexity(caller, response2)

    return response1;
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

            const filePath = path.join(path.dirname(document.uri.path), ".tmp");
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
        loadingButton!.text = "$(loading) Generating diff";
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

            const channel = vscode.window.createOutputChannel("Bugsssss");
            channel.append(fixCode);
            channel.show();
        }
    });

    context.subscriptions.push(bugsDisposable);

    context.subscriptions.push(commentsDisposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
    console.log("Extension deactivated");
}
