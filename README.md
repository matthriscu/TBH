# ChatGPT Code Analyzer extension

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

4. Accept or ignore the suggestions (for `ChatGPT Optimize` and `ChatGPT Add Comments`)
or just see the suggestions in the output (for `ChatGPT Find Bugs` and
`ChatGPT Find Complexity`).

![demo-suggest](https://i.imgur.com/VRfQjrA.mp4)
<video width="320" height="240" controls><source src="img/demo_bugs_and_complexity.mov"></video>
<video width="320" height="240" controls><source src="https://i.imgur.com/VRfQjrA.mp4"></video>

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

### Extra generated file for comment and optimization suggestions

- When running the commands `ChatGPT Add Comments` and `ChatGPT Optimize` an
  extra (unnecessary) file is generated instead of just generating the diff
  editor. This is because we could not find another way to format the generated
  response. If the file is closed within Visual Studio Code, it is not deleted.
  It only gets deleted if one of the provided buttons is pressed (`Accept suggestions`
  or `Ignore suggestions`).

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
