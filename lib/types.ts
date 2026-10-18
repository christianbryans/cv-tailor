export type Link = { label: string; url: string };

export type Experience = {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
};

export type Education = {
  id: string;
  school: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  details: string[];
};

export type SkillGroup = { id: string; label: string; items: string };

export type Org = {
  id: string;
  role: string;
  org: string;
  period: string;
  description: string;
};

export type CV = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: Link[];
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: SkillGroup[];
  awards: string[];
  certifications: string[];
  organizations: Org[];
};

export type SectionKey =
  | 'summary'
  | 'experience'
  | 'education'
  | 'skills'
  | 'awards'
  | 'certifications'
  | 'organizations';

export type Layout = { order: SectionKey[]; hidden: SectionKey[] };

export type Job = { url: string; title: string; company: string; text: string };

export type Opts = {
  language: 'English' | 'Bahasa Indonesia';
  intensity: 'light' | 'balanced' | 'bold';
  pages: 1 | 2;
};

export type Version = {
  id: string;
  name: string;
  cv: CV;
  job: Job;
  changes: string[];
  gaps: string[];
  warnings: string[];
  createdAt: number;
};

export const SECTION_LABELS: Record<SectionKey, string> = {
  summary: 'Professional Summary',
  experience: 'Work Experience',
  education: 'Education',
  skills: 'Skills',
  awards: 'Awards & Achievements',
  certifications: 'Certifications',
  organizations: 'Organization & Volunteering',
};

export const DEFAULT_LAYOUT: Layout = {
  order: ['summary', 'experience', 'education', 'skills', 'awards', 'certifications', 'organizations'],
  hidden: [],
};

export const DEFAULT_OPTS: Opts = { language: 'English', intensity: 'balanced', pages: 2 };
