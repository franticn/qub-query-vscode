const vscode = require('vscode');
const util = require('./util');
const api = require('./query')

/**
 * 自动提示实现，这里模拟一个很简单的操作
 * 当输入 this.dependencies.xxx时自动把package.json中的依赖带出来
 * 当然这个例子没啥实际意义，仅仅是为了演示如何实现功能
 * @param {*} document 
 * @param {*} position 
 */
async function provideCompletionItems(document, position) {
    const line = document.lineAt(position);
    // 只截取到光标位置为止，防止一些特殊情况
    const lineText = line.text.substring(0, position.character);
    const isInBlock = isInDependenciesBlock(document)
    const fileName = document.fileName;
    const editor = vscode.window.activeTextEditor;
    const posline = editor.selection.active;
    const { text } = document.lineAt(posline);
    const correctLeadStr = text.startsWith('  ')
    if (/\/pubspec\.yaml$/.test(fileName) && lineText.length != 0 && lineText.search(':') == -1 && correctLeadStr && isInBlock) {
        let packages = await api.queryPackage(lineText)
        const currentLineReplaceRange = new vscode.Range(new vscode.Position(posline.line, position.character), new vscode.Position(posline.line, text.length))

        return packages.map(getCompletionItem(currentLineReplaceRange))
    }
}

const isInDependenciesBlock = (document) => {
    // 遍历当前文档的总行数 找到 dev_dependencies: dependencies:所在位置(depBlockLine devDepBlockLine)
    // 还需要保存下这2个顶级block所在的下一个顶级block的位置(depNextBlockLine devDepNextBlockLine)
    let result = false
    try {
        let totalCount = document.lineCount -1
        let depBlockLine
        let devDepBlockLine
        let depNextBlockLine
        let devDepNextBlockLine
        let lastBlockLine
        while (totalCount >= 0) {
            if (document.lineAt(totalCount) === undefined 
            || document.lineAt(totalCount).text === undefined 
            || document.lineAt(totalCount).text.length == 0 
            || document.lineAt(totalCount).text.startsWith(' ')) {

            } else {
                let findLineText = document.lineAt(totalCount).text
                findLineText.toString()
                if (findLineText.startsWith('dependencies:')) {
                    depBlockLine = document.lineAt(totalCount).lineNumber
                    depNextBlockLine = lastBlockLine
                }
                if (findLineText.startsWith('dev_dependencies:')) {
                    devDepBlockLine = document.lineAt(totalCount).lineNumber
                    devDepNextBlockLine = lastBlockLine
                }
                lastBlockLine = document.lineAt(totalCount).lineNumber
            }
            totalCount--
        
        }
        const editor = vscode.window.activeTextEditor
        const currentLine = editor.selection.active.line
        result = (currentLine > devDepBlockLine && currentLine < devDepNextBlockLine) || (currentLine > depBlockLine && currentLine < depNextBlockLine)
    } catch (error) {
        util.error(error)
    } finally {
        return result
    }
}


const getCompletionItem = (range) => (item) => {
    const packageName = item.package
    const content = new vscode.CompletionItem(packageName, vscode.CompletionItemKind.Module)
    content.additionalTextEdits = [vscode.TextEdit.delete(range)];
    content.insertText = `${packageName}`;
    return content
}

/**
 * 光标选中当前自动补全item时触发动作，一般情况下无需处理
 * @param {*} item 
 * @param {*} token 
 */
function resolveCompletionItem(item, token) {
    return item;
}

module.exports = function (context) {
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('yaml', {
        provideCompletionItems,
        resolveCompletionItem
    }))
}