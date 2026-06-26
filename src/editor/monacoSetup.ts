import type * as monacoEditor from 'monaco-editor';
import { GREEN_TEXT_LANGUAGES } from '../data/languages';
import { prettyIndentText } from '../utils/format';

type Monaco = typeof monacoEditor;

let isRegistered = false;

function tokenizerFor(keywords: string[], lineComment: string): monacoEditor.languages.IMonarchLanguage {
  const commentPattern = lineComment === '!' ? /!.*/ : /#.*/;

  return {
    defaultToken: '',
    tokenPostfix: '.network',
    ignoreCase: true,
    keywords,
    tokenizer: {
      root: [
        [commentPattern, 'comment'],
        [/\/\*/, 'comment', '@comment'],
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@stringDouble'],
        [/'([^'\\]|\\.)*$/, 'string.invalid'],
        [/'/, 'string', '@stringSingle'],
        [/\{\{[a-zA-Z0-9_.-]+\}\}/, 'variable'],
        [/\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/, 'number.address'],
        [/\b(?:[0-9a-f]{2}[:-]){5}[0-9a-f]{2}\b/, 'number.address'],
        [/\b(?:ge|xe|et|irb|lo|ae)-?\d+(?:\/\d+){0,3}(?:\.\d+)?\b/, 'type.identifier'],
        [/\b\d+(?:\/\d+){1,3}\b/, 'type.identifier'],
        [/\b\d+\b/, 'number'],
        [/[{}()[\],;:=|<>]/, 'operator'],
        [
          /[a-zA-Z_][\w-]*/,
          {
            cases: {
              '@keywords': 'keyword',
              '@default': 'identifier',
            },
          },
        ],
      ],
      comment: [
        [/[^/*]+/, 'comment'],
        [/\*\//, 'comment', '@pop'],
        [/[/*]/, 'comment'],
      ],
      stringDouble: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop'],
      ],
      stringSingle: [
        [/[^\\']+/, 'string'],
        [/\\./, 'string.escape'],
        [/'/, 'string', '@pop'],
      ],
    },
  };
}

export function setupMonaco(monaco: Monaco): void {
  if (isRegistered) return;
  isRegistered = true;

  for (const language of GREEN_TEXT_LANGUAGES.filter((definition) => !definition.builtIn)) {
    monaco.languages.register({
      id: language.id,
      extensions: language.extensions,
      aliases: language.aliases,
    });

    monaco.languages.setLanguageConfiguration(language.id, {
      comments: {
        lineComment: language.lineComment,
      },
      brackets: [
        ['{', '}'],
        ['[', ']'],
        ['(', ')'],
      ],
      autoClosingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      surroundingPairs: [
        { open: '{', close: '}' },
        { open: '[', close: ']' },
        { open: '(', close: ')' },
        { open: '"', close: '"' },
        { open: "'", close: "'" },
      ],
      indentationRules: {
        increaseIndentPattern: /(^.*(?:\{|interface|vlan|router|wlan|policy|class|ssid-profile|user-role)\b.*$)/i,
        decreaseIndentPattern: /^\s*(?:}|exit|end)\b/i,
      },
    });

    monaco.languages.setMonarchTokensProvider(
      language.id,
      tokenizerFor(language.keywords, language.lineComment),
    );

    monaco.languages.registerDocumentFormattingEditProvider(language.id, {
      provideDocumentFormattingEdits(model, options) {
        return [
          {
            range: model.getFullModelRange(),
            text: prettyIndentText(
              model.getValue(),
              language.id,
              typeof options.tabSize === 'number' ? options.tabSize : 2,
            ),
          },
        ];
      },
    });
  }

  const cssColor = (hex: string): string => `#${hex}`;

  const defineTheme = (
    name: string,
    palette: {
      background: string;
      foreground: string;
      muted: string;
      line: string;
      keyword: string;
      type: string;
      number: string;
      string: string;
      accent: string;
      variable: string;
    },
  ) => monaco.editor.defineTheme(name, {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: palette.muted, fontStyle: 'italic' },
      { token: 'keyword', foreground: palette.keyword, fontStyle: 'bold' },
      { token: 'identifier', foreground: palette.foreground },
      { token: 'type.identifier', foreground: palette.type },
      { token: 'number', foreground: palette.number },
      { token: 'number.address', foreground: palette.number },
      { token: 'operator', foreground: palette.accent },
      { token: 'string', foreground: palette.string },
      { token: 'variable', foreground: palette.variable, fontStyle: 'bold' },
    ],
    colors: {
      'editor.background': cssColor(palette.background),
      'editor.foreground': cssColor(palette.foreground),
      'editorLineNumber.foreground': cssColor(palette.muted),
      'editorLineNumber.activeForeground': cssColor(palette.accent),
      'editorCursor.foreground': cssColor(palette.accent),
      'editor.selectionBackground': cssColor(`${palette.accent}33`),
      'editor.inactiveSelectionBackground': cssColor(`${palette.accent}22`),
      'editor.lineHighlightBackground': cssColor(palette.line),
      'editorIndentGuide.background1': cssColor(palette.line),
      'editorIndentGuide.activeBackground1': cssColor(`${palette.accent}88`),
      'editorWhitespace.foreground': cssColor(palette.line),
    },
  });

  defineTheme('greentext-greencli', {
    background: '070A0F',
    foreground: 'E6EDF3',
    muted: '5D6B7A',
    line: '0F141C',
    keyword: '01A982',
    type: '84B135',
    number: '8AB4F8',
    string: '81C995',
    accent: '01A982',
    variable: '8AB4F8',
  });
  defineTheme('greentext-neutral', {
    background: '202124',
    foreground: 'E8EAED',
    muted: '9AA0A6',
    line: '292A2D',
    keyword: 'C58AF9',
    type: '81C995',
    number: '8AB4F8',
    string: '81C995',
    accent: '8AB4F8',
    variable: '8AB4F8',
  });
  defineTheme('greentext-google', {
    background: '202124',
    foreground: 'E8EAED',
    muted: '9AA0A6',
    line: '292A2D',
    keyword: 'C58AF9',
    type: '81C995',
    number: '8AB4F8',
    string: '81C995',
    accent: '8AB4F8',
    variable: '8AB4F8',
  });
  defineTheme('greentext-soft', {
    background: '202124',
    foreground: 'E6E8EE',
    muted: '858C99',
    line: '2B2C31',
    keyword: 'B39DDB',
    type: '9CCFD8',
    number: '8AB4F8',
    string: 'A7C080',
    accent: '9CCFD8',
    variable: '8AB4F8',
  });
  monaco.editor.defineTheme('greentext-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [],
    colors: { 'editor.background': '#202124' },
  });
}
