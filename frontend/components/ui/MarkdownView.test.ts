import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test } from 'vitest';
import MarkdownView from './MarkdownView';

const render = (text: string) => renderToStaticMarkup(createElement(MarkdownView, { text }));

test('bare URLs become links opened in a new tab', () => {
  const html = render('求人票: https://example.com/jobs/1');
  expect(html).toContain('<a href="https://example.com/jobs/1" target="_blank" rel="noopener noreferrer"');
});

test('single line breaks are kept and emphasis is rendered', () => {
  const html = render('1行目\n**2行目**');
  expect(html).toContain('1行目<br/>');
  expect(html).toContain('<strong>2行目</strong>');
});

test('raw HTML and non-http links are not rendered', () => {
  const html = render('<b onclick="x()">太字</b> [危険](javascript:alert(1))');
  expect(html).not.toContain('<b');
  expect(html).not.toContain('javascript:');
  expect(html).toContain('危険');
});
