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
let acceptButton: vscode.StatusBarItem | undefined;
let rejectButton: vscode.StatusBarItem | undefined;

async function changeDiff() {
    await vscode.workspace.openTextDocument(dstUri!);
    await vscode.window.showTextDocument(dstUri!);
    await vscode.workspace.fs.readFile(dstUri!)
        .then(sourceData => vscode.workspace.fs.writeFile(fileName!, sourceData!));
}

async function closeDiff() {
    await vscode.workspace.fs.delete(dstUri!);
};

async function writeToFile(fileName: vscode.Uri, content: string) {
    await vscode.workspace.fs.writeFile(fileName, new TextEncoder().encode(content));
}

// ------------------------------------
// ChatGPT integration
// ------------------------------------

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

// ------------------------------------
// VSCode integration
// ------------------------------------

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("ChatGPT Analyzer extension activated");

    if (loadingButton === undefined) {
        loadingButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
    }
    if (acceptButton === undefined) {
        acceptButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        acceptButton.tooltip = 'Replace the selected text in the active editor';
        acceptButton.command = 'extension.acceptSuggestion';
    }
    if (rejectButton === undefined) {
        rejectButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0);
        rejectButton.tooltip = 'Ignore suggestions';
        rejectButton.command = 'extension.ignoreSuggestion';
    }

    vscode.commands.registerCommand('extension.acceptSuggestion', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            writeToFile(fileName!, diffTxt!);
            acceptButton!.text = "$(check) Done";
            rejectButton!.text = "";
            changeDiff();
            closeDiff();
        }
    });

    vscode.commands.registerCommand('extension.ignoreSuggestion', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            rejectButton!.text = "$(check) Done";
            acceptButton!.text = "";
            closeDiff();
        }
    });

    function loadingPopUp() {
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
                progress.report({ increment: 20, message: "Generating response..." });
            }, 1200);

            setTimeout(() => {
                progress.report({ increment: 20, message: "Generating response..." });
            }, 2400);

            setTimeout(() => {
                progress.report({ increment: 20, message: "Generating response..." });
            }, 3600);

            setTimeout(() => {
                progress.report({ increment: 20, message: "Generating response..." });
            }, 4800);

            setTimeout(() => {
                progress.report({ increment: 20, message: "Response generated." });
            }, 6200);

            const p = new Promise<void>(resolve => {
                setTimeout(() => {
                    resolve();
                }, 6500);
            });

            return p;
        });
    }

        let commentsDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.addComments', async () => {
            loadingButton!.text = "";
            loadingPopUp();

            acceptButton!.text = "";
            rejectButton!.text = "";

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

                acceptButton!.text = '$(pencil) Accept suggestions';
                acceptButton!.show();
                rejectButton!.text = '$(pencil) Ignore suggestions';
                rejectButton!.show();

                await writeToFile(dstUri!, diffTxt);
                dstUri = vscode.Uri.file(filePath);
                vscode.commands.executeCommand("vscode.diff", fileName, dstUri, 'DIFF');
            }
        });

        let bugsDisposable = vscode.commands.registerCommand('chatgpt-code-analyzer.findBugs', async () => {
            acceptButton!.text = "";
            rejectButton!.text = "";
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
            acceptButton!.text = "";
            rejectButton!.text = "";
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
            loadingPopUp();

            acceptButton!.text = "";
            rejectButton!.text = "";

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

                let fixCode: string = await optimize(caller, document.getText(selection), language);
                fixCode = fixCode.toString().replaceAll("`", "");
                fixCode = fixCode.toString().replace(language, "");

                const filePath = path.join(path.dirname(document.uri.path), (Math.random().toString(36).slice(2) + "." + language));
                dstUri = vscode.Uri.file(filePath);
                diffTxt = document.getText().replace(document.getText(selection).toString(), fixCode);
                fileName = document.uri;

                acceptButton!.text = '$(pencil) Accept Suggestions';
                acceptButton!.show();
                rejectButton!.text = '$(pencil) Ignore Suggestions';
                rejectButton!.show();

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
