import { normalizeCV } from './cv';

/** Baseline CV preloaded so the dashboard works the moment it opens. Replace it by uploading your own. */
export const SAMPLE_CV = normalizeCV({
  name: 'Christian Bryan Seputra',
  headline: 'Product Designer | UI/UX Designer',
  email: 'christianbryan263@gmail.com',
  phone: '+6282129999321',
  location: '',
  links: [
    { label: 'LinkedIn', url: '' },
    { label: 'Portfolio', url: '' },
  ],
  summary:
    'Fresh Graduate in Information Systems with a strong focus on UI/UX design, product design, and digital product development. Experienced in transforming user needs and business requirements into intuitive, user-centered digital experiences across mobile and web platforms. Skilled in user research, UI design, prototyping, usability testing, and design systems, with additional experience in front-end and iOS development. Recognized with 15+ achievements in national and international technology competitions, demonstrating strong problem-solving, innovation, and product thinking. Experienced across the full product development lifecycle, from research and ideation to design, validation, and implementation.',
  experience: [
    {
      role: 'Product Designer – Learner',
      company: 'Apple Developer Academy @UC',
      location: 'Central Jakarta',
      start: 'Mar 2026',
      end: 'Dec 2026',
      bullets: [
        'Designed and developed 8+ iOS product prototypes through Challenge-Based Learning, translating real-world user problems into validated solutions using user research, rapid prototyping, and iterative product development.',
        'Led end-to-end product design across multidisciplinary teams, from user research and problem definition to user flows, high-fidelity prototypes, usability testing, and SwiftUI implementation.',
      ],
    },
    {
      role: 'Product Designer – Full-Time, Contract',
      company: 'Metricform',
      location: '',
      start: 'Nov 2025',
      end: 'Feb 2026',
      bullets: [
        'Built Metricform’s product experience from 0 to beta launch, establishing its core UX architecture and scalable design system while supporting a successful angel-backed pre-seed raise.',
        'Led end-to-end design across 2 core products, QuickMetric and Snowball, unifying complex query, approval, and execution workflows into a seamless enterprise experience.',
        'Partnered directly with C-level leadership and international engineering teams to translate product strategy and technical requirements into scalable, implementation-ready solutions.',
      ],
    },
    {
      role: 'UI/UX Designer – Internship',
      company: 'PT Amanah Karya Indonesia',
      location: '',
      start: 'Aug 2025',
      end: 'Dec 2025',
      bullets: [
        'Selected as 1 of 2 UI/UX Designers from hundreds of Information Systems students at Telkom University for an industry-based capstone project.',
        'Designed the Affiliate feature for Berbagi.link, collaborating with Product Managers and Developers to translate business requirements into implementation-ready user flows and interfaces.',
      ],
    },
    {
      role: 'UI/UX Designer – Internship',
      company: 'PT Telekomunikasi Selular (Telkomsel)',
      location: '',
      start: 'Sep 2024',
      end: 'Dec 2024',
      bullets: [
        'Designed and validated an IndiHome website prototype to improve early-payment awareness among new users, leveraging user research and usability testing to refine the experience.',
        'Selected as Area 2 Coordinator, bridging mentors across Jabodetabek and West Java with the MSIB committee to support cross-regional coordination.',
        'Recognized among the Top 10 of 213 mentees nationwide in Telkomsel’s MSIB Cycle 7 program for outstanding performance and contribution.',
      ],
    },
  ],
  education: [
    {
      school: 'Telkom University',
      degree: 'Bachelor of Information Systems, Faculty of Industrial Engineering',
      location: 'Bandung, Indonesia',
      start: '2022',
      end: '2026',
      details: [
        'GPA: 3.87/4.00, Cum Laude',
        'Thesis: Interface Design and Front-End Development of an IoT-Based Smart Water Meter Dashboard for Vertical Housing Using the Design Thinking Method',
        'Relevant Coursework: Human-Computer Interaction, User Experience Design, Information Systems Analysis & Design, Web Development, Business Process Management',
        'Academic Projects: IoT-based Smart Water Meter dashboard',
        'Activities: Outstanding Student Finalist (Pilmapres) 2025, 15+ National & International Technology Competition Awards, PANDI Scholarship 2024 Awardee, Best & Brightest Content Creator 2025',
      ],
    },
  ],
  skills: [
    {
      label: 'Product Design',
      items:
        'UI Design, UX Research, Interaction Design, Information Architecture, Wireframing & Prototyping, Usability Testing, Design Systems, User Flows, Design Thinking, Product Strategy',
    },
    {
      label: 'Design & Product Tools',
      items: 'Figma, FigJam, Framer, Maze, Adobe Photoshop, Adobe Illustrator, Jira, Notion',
    },
    {
      label: 'Development',
      items:
        'Swift, SwiftUI, React.js, JavaScript, HTML, CSS, Tailwind CSS, Node.js, PHP, Java, MySQL, Firebase, Git/GitHub',
    },
    {
      label: 'Soft Skills',
      items:
        'Product Thinking, Problem-Solving, Cross-Functional Collaboration, Communication, Creative Thinking, Adaptability, Time Management',
    },
    { label: 'Languages', items: 'Indonesian (Native), English (Professional Working Proficiency)' },
  ],
  awards: [
    'Selected Learner — Apple Developer Academy @ UC Jakarta (Cohort 2026) | Apple',
    'Finalist — Telkom University Outstanding Student Selection (Pilmapres) 2025 | Telkom University',
    'PANDI Scholarship Awardee 2024 | Pengelola Nama Domain Internet Indonesia (PANDI)',
    'Selected Participant — Check-In at tiket.com 2026 | tiket.com',
    'Best & Brightest Content Creator (Q4 2025) | PADMI Telkom University',
    'Most Innovative Business — Origin Business Club 2025 | Universitas Indonesia',
    '1st Winner — Innovathon 2025 | Universitas Gadjah Mada',
    '1st Winner — Web Design Development 2025 | Jakarta Global University',
    '1st Winner — International Artificial Intelligence Application Development 2024 | Swiss German University',
    '1st Winner — UI/UX Design Competition 2024 | SurabayaDev',
    '2nd Winner — UI/UX Design Competition 2024 | UPN Veteran Jawa Timur',
    '2nd Winner — UI/UX Competition INFEST 2024 | Universitas Tanjungpura',
    '2nd Winner — Digital Business Innovation Marathon 2023 | Digivathon, Universitas Pendidikan Indonesia',
    '3rd Winner - Business Case Competition 2025 | SAG Laboratory, Telkom University',
    '3rd Winner — Business Plan Java Business Competition 2023 | Telkom University',
    '3rd Winner — UI/UX Design Technofest 2023 | Universitas Sriwijaya',
  ],
  certifications: [
    'Certified System Analyst (CSA) — Indonesian Professional Certification Authority (BNSP) | Nov 2025',
    'SAP SCM500 – Business Processes in Supply Chain Management — SAP 2024',
    'Algorithm & Data Structures with Python — Skilvul | Mar 2024',
    'Python Lanjutan — Skilvul | Mar 2024',
    'SAP AC101 – Financial Accounting — SAP 2023',
    'Digistar Class Mentoring Program, UI/UX Design & Research — Telkom Indonesia | Oct 2024',
    'Fundamentals of UI/UX Design — Microsoft | Sep 2025',
    'Tel-U Career Coach (STAR), Entrepreneurship — Telkom University | Mar 2025',
    'Digital Skills: User Experience — FutureLearn | Jul 2023',
  ],
  organizations: [
    {
      role: 'Chairman Digital Media Creative',
      org: 'Galeri Investasi Bursa Efek Indonesia Telkom University',
      period: 'Jan 2025 – Dec 2025',
      description:
        'Led and managed a 9-member team, overseeing branding strategy, website development, and visual content while collaborating cross-functionally to strengthen brand identity and align with business objectives.',
    },
    {
      role: 'Coordinator of Digital Content',
      org: 'System Architecture and Governance Laboratory, Faculty of Industrial Engineering, Telkom University',
      period: 'Feb 2025 – Dec 2025',
      description:
        'Led a 3-member team managing social media content across multiple lab accounts, including ISACA Telkom University, while coordinating major events and collaborating with lecturers to align communications with IT governance objectives.',
    },
    {
      role: 'Mentor UI/UX Competition',
      org: 'Akademi Competition, University of Brawijaya',
      period: 'Jan 2025 – Feb 2025',
      description:
        'Mentored aspiring UI/UX designers for competitions and developed structured learning materials that were published and sold as commercial UI/UX learning modules.',
    },
    {
      role: 'Mentor Club Study Design',
      org: 'UKM Search Telkom University',
      period: 'Nov 2024 – Mar 2025',
      description:
        'Delivered UI/UX and graphic design coaching, developing structured learning materials and mentoring members for competitions, resulting in 2 teams winning national-level design competitions.',
    },
    {
      role: 'Organizing Committee Member, Global Village 2024',
      org: 'AIESEC Bandung',
      period: 'Dec 2023 – Jan 2024',
      description:
        'Supported the planning and execution of Global Village 2024, collaborating with cross-functional committee members to deliver an international cultural exchange event.',
    },
    {
      role: 'Publication & Documentation Team, Bible Camp 2023',
      org: 'PMK TES Telkom University',
      period: 'Aug 2023 – Oct 2023',
      description:
        'Managed event publications, visual content, and documentation, supporting promotional activities and maintaining consistent event communications across digital channels.',
    },
  ],
});
