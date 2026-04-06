import { describe, it, expect } from 'vitest';
import {
  templates,
  getTemplate,
  blogPostTemplate,
  meetingNotesTemplate,
  emailTemplate,
  resumeTemplate,
  type DocumentTemplate,
} from '../index';

describe('templates registry', () => {
  it('exports 4 built-in templates', () => {
    expect(templates).toHaveLength(4);
  });

  it('each template has required fields', () => {
    for (const tpl of templates) {
      expect(tpl.id).toBeTruthy();
      expect(tpl.name).toBeTruthy();
      expect(tpl.description).toBeTruthy();
      expect(tpl.content).toBeDefined();
      expect(tpl.content.type).toBe('doc');
      expect(Array.isArray((tpl.content as any).content)).toBe(true);
      expect((tpl.content as any).content.length).toBeGreaterThan(0);
    }
  });

  it('template IDs are unique', () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('getTemplate()', () => {
  it('returns template by id', () => {
    expect(getTemplate('blog-post')).toBe(blogPostTemplate);
    expect(getTemplate('meeting-notes')).toBe(meetingNotesTemplate);
    expect(getTemplate('email')).toBe(emailTemplate);
    expect(getTemplate('resume')).toBe(resumeTemplate);
  });

  it('returns undefined for unknown id', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });
});

describe('blogPostTemplate', () => {
  it('starts with an h1', () => {
    const first = (blogPostTemplate.content as any).content[0];
    expect(first.type).toBe('heading');
    expect(first.attrs.level).toBe(1);
  });

  it('contains a code block', () => {
    const nodes = (blogPostTemplate.content as any).content;
    const codeBlock = nodes.find((n: any) => n.type === 'code_block');
    expect(codeBlock).toBeDefined();
  });

  it('contains horizontal rules', () => {
    const nodes = (blogPostTemplate.content as any).content;
    const hrs = nodes.filter((n: any) => n.type === 'horizontal_rule');
    expect(hrs.length).toBeGreaterThanOrEqual(1);
  });
});

describe('meetingNotesTemplate', () => {
  it('contains action items section', () => {
    const nodes = (meetingNotesTemplate.content as any).content;
    const headings = nodes.filter((n: any) => n.type === 'heading');
    const actionItems = headings.find((h: any) =>
      h.content?.some((c: any) => c.text?.includes('Action Items'))
    );
    expect(actionItems).toBeDefined();
  });

  it('contains an ordered list for agenda', () => {
    const nodes = (meetingNotesTemplate.content as any).content;
    const ol = nodes.find((n: any) => n.type === 'ordered_list');
    expect(ol).toBeDefined();
  });
});

describe('emailTemplate', () => {
  it('starts with To: field', () => {
    const first = (emailTemplate.content as any).content[0];
    expect(first.type).toBe('paragraph');
    expect(first.content[0].text).toContain('To:');
  });
});

describe('resumeTemplate', () => {
  it('has experience section', () => {
    const nodes = (resumeTemplate.content as any).content;
    const headings = nodes.filter((n: any) => n.type === 'heading');
    const experience = headings.find((h: any) =>
      h.content?.some((c: any) => c.text === 'Experience')
    );
    expect(experience).toBeDefined();
  });

  it('has skills section', () => {
    const nodes = (resumeTemplate.content as any).content;
    const headings = nodes.filter((n: any) => n.type === 'heading');
    const skills = headings.find((h: any) =>
      h.content?.some((c: any) => c.text === 'Skills')
    );
    expect(skills).toBeDefined();
  });
});
