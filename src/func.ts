import * as vscode from 'vscode';
// import { File } from 'fs';

export function func(document: vscode.TextDocument, selection: vscode.Selection) {
    // const file = new File

    // Get the word within the selection
    const word = document.getText(selection);
    const reversed = word.split('').reverse().join('');
    return reversed;
}