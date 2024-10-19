/**
 * 检查 Markdown 文本中加粗语法与中文字符之间缺少空格或标点的问题。
 * @param markdownText - 要检查的 Markdown 文本。
 * @returns 包含问题行号和内容的数组。
 */
export /**
* 检查 Markdown 文本中加粗语法与中文字符之间缺少空格或标点的问题。
* @param markdownText - 要检查的 Markdown 文本。
* @returns 包含问题行号和内容的数组。
*/
/**
 * 检查 Markdown 文本中加粗语法与中文字符之间缺少空格或标点的问题。
 * @param markdownText - 要检查的 Markdown 文本。
 * @returns 包含问题行号和内容的数组。
 */
function checkMarkdownFormatIssuesForBold(markdownText: string): { lineNumber: number; content: string }[] {
    const lines = markdownText.split(/\r?\n/);
    const problemLines: { lineNumber: number; content: string }[] = [];
    
    // 匹配所有加粗语法的正则表达式
    const boldPattern = /(\*\*[^\*]+\*\*)/g;
    
    // 定义允许的前后字符（空格和指定的标点符号）
    const allowedChars = /[\s\*，。！？；：“”、]/;
  
    lines.forEach((line, index) => {
      let match;
      let lineHasProblem = false;
  
      // 重置 lastIndex，以防止在多次执行时出现问题
      boldPattern.lastIndex = 0;
  
      while ((match = boldPattern.exec(line)) !== null) {
        const startIndex = match.index;
        const endIndex = boldPattern.lastIndex;
  
        const charBefore = line[startIndex - 1];
        const charAfter = line[endIndex];
  
        const beforeInvalid = charBefore !== undefined && !allowedChars.test(charBefore);
        const afterInvalid = charAfter !== undefined && !allowedChars.test(charAfter);
  
        if (beforeInvalid || afterInvalid) {
          lineHasProblem = true;
          break; // 如果发现问题，直接跳出循环
        }
      }
  
      if (lineHasProblem) {
        problemLines.push({
          lineNumber: index + 1,
          content: line
        });
      }
    });
  
    return problemLines;
  }
  
  
  

  
//   // 示例 Markdown 文本
// const markdownText = `
// 该策略主要是为了防范**CSRF（跨站请求伪造）**和**XSS（跨站脚本攻击）**等安全风险。

// 这是另一行正常的文本。

// 请注意**加粗文本**后面没有空格的问题。
// `;

// // 调用工具方法检查问题
// const issues = checkMarkdownFormatIssues(markdownText);

// // 处理返回的结果
// if (issues.length > 0) {
//   console.log('发现以下可能存在格式问题的行：');
//   issues.forEach((item) => {
//     console.log(`第 ${item.lineNumber} 行: ${item.content}`);
//   });
// } else {
//   console.log('未发现格式问题。');
// }
