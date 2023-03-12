# ChatGPT Code Analyzer extension

TODOs:
- [ ] Format code after replace (ideally, suggest already formatted - correctly indented)
- [x] Add granularity (steps for comments, debug and optimize features)
- [x] Change `Generate diff` loading button to pop-up
- [x] Write README
- [ ] Deploy to Marketplace
- [x] Make it run faster
    - [x] Make prompts smaller
- [ ] Use more provided technologies
- [ ] Comment source code

ChatGPT Code Analyzer integrates [ChatGPT](https://chat.openai.com) into
[Visual Studio Code](https://code.visualstudio.com) to optimize, debug and add
comments to selected code.

---

## Usage

1. Install and enable extension.

2. Select code that you want to analyze.

3. Run any of the available commands:
- `ChatGPT Add Comments` (`[Ctrl + Alt + Shift + A]` or `[Cmd + Opt + Shift + A]`)
- `ChatGPT Find Bugs` (`Ctrl + Alt + Shift + B` or `Cmd + Opt + Shift + B`)
- `ChatGPT Find Complexity` (`Ctrl + Alt + Shift + C` or `Cmd + Opt + Shift + C`)
- `ChatGPT Optimize` (`Ctrl + Alt + Shift + O` or `Cmd + Opt + Shift + O`)

4. Accept or reject the suggestion (for `ChatGPT Optimize` and `ChatGPT Add Comments`)
or just see the suggestions in the output (for `ChatGPT Find Bugs` and
`ChatGPT Find Complexity`).

![](https://imgur.com/B5CyOrI)

---

## Known Issues

### Unpredictibility

- Each run of an extension command generates a prompt to ChatGPT. Because of this
  each run generates a different output/suggestion. Some suggestions may even be
  wrong.

- Sometimes ChatGPT does not generate output in the expected format for the code
  suggestion commands. The prompt asks ChatGPT to write the output as Markdown
  block code but sometimes it fails to do so.

### Inflexibility

- The prompt is fixed, it cannot be changed by the user.

### Slow response

- For long selections the waiting time for a response is very long (> 20s). This
  is because of the time it takes ChatGPT to generate a response.

---

## Release Notes

This section contains notes from major releases.

### 1.0.0

Initial release of ChatGPT Analyzer extension. Provides four major features:

- comment suggestions for code selection

- optimization suggestions for code selection

- bug analysis

- complexity analysis

---

**Enjoy!**
