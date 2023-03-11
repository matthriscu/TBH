// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
// import { func } from './func';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "chatgpt-code-analyzer" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with registerCommand
    // The commandId parameter must match the command field in package.json
    let disposable = vscode.commands.registerCommand('chatgpt-code-analyzer.helloWorld', async () => {
        // Get the active text editor
        const editor = vscode.window.activeTextEditor;

        if (editor) {
            const document = editor.document;
            const selection = editor.selection;
            console.log(document.getText(selection));
            const doc = await vscode.workspace.openTextDocument({ content: `Hello world` });
            vscode.commands.executeCommand("vscode.diff", document.uri, doc.uri, 'DIFF');
            // editor.edit(editBuilder => {
            //     // editBuilder.replace(selection, func(document, selection));
            //     vscode.commands.executeCommand("vscode.diff", selection, func(document, selection));
            // });
        }
        // The code you place here will be executed every time your command is executed
        // Display a message box to the user
        vscode.window.showInformationMessage('Hello World from ChatGPT Code Analyzer!');
    });

    context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
