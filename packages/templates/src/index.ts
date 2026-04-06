/**
 * @flash/templates — Document templates for Flash Editor.
 *
 * Each template is a JSON document structure compatible with `editor.setContent()`.
 * Templates are pure data — no runtime dependencies.
 */

// ---- Types ----

export interface DocumentTemplate {
  /** Template unique identifier. */
  id: string;
  /** Display name. */
  name: string;
  /** Short description. */
  description: string;
  /** Document JSON content (compatible with editor.setContent()). */
  content: Record<string, unknown>;
}

// ---- Helpers ----

function text(t: string, marks?: Record<string, unknown>[]) {
  const node: Record<string, unknown> = { type: 'text', text: t };
  if (marks) node['marks'] = marks;
  return node;
}

function p(...children: Record<string, unknown>[]) {
  if (children.length === 0) return { type: 'paragraph' };
  return { type: 'paragraph', content: children };
}

function h(level: number, ...children: Record<string, unknown>[]) {
  return { type: 'heading', attrs: { level }, content: children };
}

const hr = { type: 'horizontal_rule' };

function li(...children: Record<string, unknown>[]) {
  return { type: 'list_item', content: children };
}

function ul(...items: Record<string, unknown>[]) {
  return { type: 'bullet_list', content: items };
}

function ol(...items: Record<string, unknown>[]) {
  return { type: 'ordered_list', content: items };
}

function bq(...children: Record<string, unknown>[]) {
  return { type: 'blockquote', content: children };
}

// ---- Templates ----

export const blogPostTemplate: DocumentTemplate = {
  id: 'blog-post',
  name: 'Blog Post',
  description: 'Title, subtitle, hero section, and body for a blog article.',
  content: {
    type: 'doc',
    content: [
      h(1, text('Your Blog Post Title')),
      p(
        text('By '),
        text('Author Name', [{ type: 'bold' }]),
        text(' \u2022 Published on '),
        text('April 6, 2026', [{ type: 'italic' }]),
      ),
      hr,
      p(
        text('Write a compelling introduction that hooks your reader. Explain what this post is about and why it matters.'),
      ),
      h(2, text('Main Section')),
      p(text('Develop your key points here. Use clear, concise language.')),
      ul(
        li(p(text('First key point'))),
        li(p(text('Second key point'))),
        li(p(text('Third key point'))),
      ),
      h(2, text('Code Example')),
      p(text('If your post includes code, use code blocks:')),
      {
        type: 'code_block',
        content: [text('// Your code example here\nconst editor = new Editor({ extensions: StarterKit() });')],
      },
      h(2, text('Conclusion')),
      p(text('Summarize your main points and include a call-to-action for your readers.')),
      hr,
      p(
        text('Tags: ', [{ type: 'italic' }]),
        text('#writing #tutorial #webdev', [{ type: 'code' }]),
      ),
    ],
  },
};

export const meetingNotesTemplate: DocumentTemplate = {
  id: 'meeting-notes',
  name: 'Meeting Notes',
  description: 'Date, attendees, agenda items, discussion notes, and action items.',
  content: {
    type: 'doc',
    content: [
      h(1, text('Meeting Notes')),
      p(
        text('Date: ', [{ type: 'bold' }]),
        text('April 6, 2026'),
      ),
      p(
        text('Attendees: ', [{ type: 'bold' }]),
        text('Alice, Bob, Charlie'),
      ),
      p(
        text('Location: ', [{ type: 'bold' }]),
        text('Conference Room A / Zoom'),
      ),
      hr,
      h(2, text('Agenda')),
      ol(
        li(p(text('Project status update'))),
        li(p(text('Q2 roadmap review'))),
        li(p(text('Open discussion'))),
      ),
      h(2, text('Discussion Notes')),
      h(3, text('1. Project Status Update')),
      ul(
        li(p(text('Sprint velocity is on track'))),
        li(p(text('Blocker: waiting on design review for the dashboard'))),
        li(p(text('Backend API migration is 80% complete'))),
      ),
      h(3, text('2. Q2 Roadmap Review')),
      p(text('Add discussion notes for each agenda item...')),
      h(2, text('Action Items')),
      ul(
        li(p(
          text('[ ] ', [{ type: 'code' }]),
          text('Alice', [{ type: 'bold' }]),
          text(' \u2014 Follow up on design review by Friday'),
        )),
        li(p(
          text('[ ] ', [{ type: 'code' }]),
          text('Bob', [{ type: 'bold' }]),
          text(' \u2014 Complete API migration testing'),
        )),
        li(p(
          text('[ ] ', [{ type: 'code' }]),
          text('Charlie', [{ type: 'bold' }]),
          text(' \u2014 Prepare Q2 OKR proposal'),
        )),
      ),
      hr,
      p(text('Next meeting: ', [{ type: 'bold' }]), text('April 13, 2026 at 2:00 PM')),
    ],
  },
};

export const emailTemplate: DocumentTemplate = {
  id: 'email',
  name: 'Email Draft',
  description: 'To, subject, body with greeting and signature.',
  content: {
    type: 'doc',
    content: [
      p(
        text('To: ', [{ type: 'bold' }]),
        text('recipient@example.com'),
      ),
      p(
        text('Subject: ', [{ type: 'bold' }]),
        text('Your subject line here'),
      ),
      hr,
      p(text('Hi [Name],')),
      p(),
      p(text('I hope this message finds you well. I\'m writing to...')),
      p(),
      p(text('Here are the key points:')),
      ul(
        li(p(text('First point'))),
        li(p(text('Second point'))),
        li(p(text('Third point'))),
      ),
      p(),
      p(text('Please let me know if you have any questions.')),
      p(),
      p(text('Best regards,')),
      p(text('Your Name')),
      p(
        text('Title | Company', [{ type: 'italic' }]),
      ),
    ],
  },
};

export const resumeTemplate: DocumentTemplate = {
  id: 'resume',
  name: 'Resume / CV',
  description: 'Structured sections for contact info, experience, education, and skills.',
  content: {
    type: 'doc',
    content: [
      h(1, text('Your Full Name')),
      p(
        text('email@example.com \u2022 (555) 123-4567 \u2022 City, State \u2022 '),
        text('linkedin.com/in/yourname', [{ type: 'link', attrs: { href: 'https://linkedin.com' } }]),
      ),
      hr,
      h(2, text('Professional Summary')),
      p(text('Experienced software engineer with X+ years of expertise in building scalable web applications. Passionate about clean architecture, developer experience, and open-source.')),
      h(2, text('Experience')),
      h(3, text('Senior Software Engineer')),
      p(
        text('Company Name', [{ type: 'bold' }]),
        text(' \u2022 '),
        text('Jan 2023 \u2013 Present', [{ type: 'italic' }]),
      ),
      ul(
        li(p(text('Led development of a real-time collaboration feature used by 10K+ users'))),
        li(p(text('Reduced build times by 60% through toolchain optimization'))),
        li(p(text('Mentored 4 junior engineers through the onboarding program'))),
      ),
      h(3, text('Software Engineer')),
      p(
        text('Previous Company', [{ type: 'bold' }]),
        text(' \u2022 '),
        text('Jun 2020 \u2013 Dec 2022', [{ type: 'italic' }]),
      ),
      ul(
        li(p(text('Built and maintained a microservices architecture serving 1M+ requests/day'))),
        li(p(text('Implemented CI/CD pipeline reducing deployment time from hours to minutes'))),
      ),
      h(2, text('Education')),
      p(
        text('B.S. Computer Science', [{ type: 'bold' }]),
        text(' \u2014 University Name, 2020'),
      ),
      h(2, text('Skills')),
      p(
        text('Languages: ', [{ type: 'bold' }]),
        text('TypeScript, Python, Go, Rust'),
      ),
      p(
        text('Frameworks: ', [{ type: 'bold' }]),
        text('React, Node.js, Next.js, Express'),
      ),
      p(
        text('Tools: ', [{ type: 'bold' }]),
        text('Git, Docker, Kubernetes, AWS, PostgreSQL'),
      ),
    ],
  },
};

/** All built-in templates. */
export const templates: DocumentTemplate[] = [
  blogPostTemplate,
  meetingNotesTemplate,
  emailTemplate,
  resumeTemplate,
];

/** Get a template by its ID. */
export function getTemplate(id: string): DocumentTemplate | undefined {
  return templates.find((t) => t.id === id);
}
